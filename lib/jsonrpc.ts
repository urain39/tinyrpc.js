import {
    IMap, JSONRPCHandler, JSONRPCNotifier, JSONRPCRequest,
    JSONRPCResponse, JSONRPCResultResponse, JSONRPCErrorResponse,
    JSONRPCNotification, JSONRPCID, JSONRPCParams, ArgumentsType,
    JSONRPCEventListenerMap, JSONRPCPreprocess
} from './common';


const UNDEFINED = void 22;
const hasOwnProperty = {}.hasOwnProperty;


export class JSONRPC {
    public rpcPath: string;
    public preprocess?: JSONRPCPreprocess;
    public isReady: boolean;
    public requestCount: number;
    private _ws: WebSocket;
    private _requestId: number;
    private _listeners: JSONRPCEventListenerMap;
    private _handlers: IMap<JSONRPCHandler>;
    private _notifiers: IMap<JSONRPCNotifier>

    /**
     * 最大请求数量。
     */
    public static MAX_REQUEST_COUNT = 8;

    /**
     * 请求时推迟执行的间隔时间，默认是1秒。
     */
    public static CONNECTION_CHECK_DELAY = 1000;

    // --------------- TinyRPC 定义的错误码 ----------------------
    // - JSONRPC 中定义的服务器错误码取值范围是`-32000`至`-32099`，
    // - 而 TinyRPC 选用了其中`-32032`至`-32039`作为预留的非服务器响
    // - 应的错误码（即这是 TinyRPC 判断出来的）。
    // ---------------------------------------------------------

    /**
     * 超过最大并发任务数时的错误码。
     */
    public static ERROR_MAX_CONCURRENT = -32032;

    public constructor(rpcPath: string, preprocess?: JSONRPCPreprocess) {
        this.rpcPath = rpcPath;
        this.preprocess = preprocess;
        this.isReady = false;
        this.requestCount = 0;
        this._ws = new WebSocket(this.rpcPath);
        this._requestId = 0;
        this._listeners = { open: [], error: [], message: [], close: [] };
        this._handlers = {};
        this._notifiers = {};

        /**
         * 标记连接状态。
         */
        const _this = this;
        this.onOpen(function () {
            _this.isReady = true;
        });

        this.onClose(function () {
            _this.isReady = false;
        });

        /**
         * 处理响应数据。
         */
        let defaultMessageListener: Exclude<typeof WebSocket.prototype.onmessage, null>;
        this._ws.addEventListener('message', defaultMessageListener = function (event: MessageEvent) {
            let response: JSONRPCNotification | JSONRPCResultResponse | JSONRPCErrorResponse;

            response = JSON.parse(event.data);

            const preprocess = _this.preprocess;
            if (preprocess) {
                response = preprocess(response);
            }

            if (hasOwnProperty.call(response, 'id')) {
                // 都判断了为啥它还是推导不出来呢？= =
                const id = (response as JSONRPCResponse).id;

                const handlers = _this._handlers
                if (hasOwnProperty.call(handlers, id)) {
                    const handler = handlers[id];

                    if (hasOwnProperty.call(response, 'result')) {
                        handler((response as JSONRPCResultResponse).result, UNDEFINED);
                    } else if (hasOwnProperty.call(response, 'error')) {
                        handler(UNDEFINED, (response as JSONRPCErrorResponse).error);
                    } else {
                        throw new Error('Invalid response with no `result` or `error`');
                    }

                    // vvv 此处我们想将其设置为`undefied`以删除变量。
                    (handlers[id] as any) = UNDEFINED;
                    _this.requestCount--;
                } else {
                    // TODO: 我们应该响应“服务端”的请求吗？
                }
            } else {
                // JSON RPC 规定，没有 id 的响应（请求）应该视作是通知。
                if (hasOwnProperty.call(response, 'method')) {
                    const method = (response as JSONRPCNotification).method;

                    const notifiers = _this._notifiers;
                    if (hasOwnProperty.call(notifiers, method)) {
                        const notifier = notifiers[method];

                        const params = (response as JSONRPCNotification).params;
                        if (params)
                            notifier(params);
                    } else {
                        throw new Error('Invalid notification with unknown `method`')
                    }
                } else {
                    throw new Error('Invalid response with no `id` or `method`');
                }
            }
        });
        this._listeners.message.push(defaultMessageListener);
    }

    /**
     * 用于监听开启事件。
     * @param listener 开启事件监听器
     */
    public onOpen(listener: Exclude<typeof WebSocket.prototype.onopen, null>): this {
        this._ws.addEventListener('open', listener);
        this._listeners.open.push(listener);

        return this;
    }

    /**
     * 用于监听错误事件。
     * @param listener 错误事件监听器
     */
    public onError(listener: Exclude<typeof WebSocket.prototype.onerror, null>): this {
        this._ws.addEventListener('error', listener);
        this._listeners.error.push(listener);

        return this;
    }

    /**
     * 用于监听关闭事件。
     * @param listener 关闭事件监听器
     */
    public onClose(listener: Exclude<typeof WebSocket.prototype.onclose, null>): this {
        this._ws.addEventListener('close', listener);
        this._listeners.close.push(listener);

        return this;
    }

    /**
     * 使用该方法注册消息通知函数。
     * @param method RPC 方法名称
     * @param notifier 消息通知函数
     */
    public onNotify(method: string, notifier: JSONRPCNotifier): this {
        this._notifiers[method] = notifier;

        return this;
    }

    /**
     * 发送请求的方法。
     * @param method RPC 方法名称
     * @param params 参数列表，可为空
     * @param handler 接收到数据后的处理函数
     * @param force 强制请求，该请求一定会被发送
     */
    public request(method: string, params: JSONRPCParams, handler: JSONRPCHandler, force: boolean = false): this {
        this._request(method, params, handler, force);

        return this;
    }

    /**
     * `request`方法的底层实现。与`request`方法最大的区别在于其带有一个附加
     * 的参数`requestId`，用于表示这个操作是之前触发的，但是被推迟到现在执行了。
     * @param requestId 请求 id
     */
    private _request(method: string, params: JSONRPCParams, handler: JSONRPCHandler, force: boolean, requestId?: JSONRPCID): void {
        if (!force) {
            // 忽略掉超出的请求，但不包括被推迟执行（带有`requestId`）的请求。
            if (this.requestCount >= JSONRPC.MAX_REQUEST_COUNT && !requestId) {
                handler(UNDEFINED, { code: JSONRPC.ERROR_MAX_CONCURRENT, message: 'Max concurrent error' })

                return;
            }
        }

        // 判断请求状态。
        if (requestId === UNDEFINED) {
            requestId = this._requestId++;

            if (!force)
                // 请求计数只针对普通请求。
                this.requestCount++;
        }

        // 等待连接。
        if (!this.isReady) {
            const _this = this;
            setTimeout(function () {
                _this._request(method, params, handler, force, requestId);
            }, JSONRPC.CONNECTION_CHECK_DELAY);

            return;
        }

        const request: JSONRPCRequest = {
            jsonrpc: '2.0',
            id: requestId,
            method,
            params
        };

        // 发送请求。
        this._ws.send(JSON.stringify(request));

        // 注册回调。
        this._handlers[requestId] = handler;

        return;
    }

    /**
     * `WebSocket.prototype.close`的包装。
     */
    public close(...args: ArgumentsType<typeof WebSocket.prototype.close>): void {
        this._ws.close(...args);
    }

    /**
     * 重连接的方法。
     */
    public reconnect(): this {
        const listeners = this._listeners;
        const ws = new WebSocket(this.rpcPath);

        // TypeScript 中的类型推断无法将`type`和`listener`关联到一起，
        // 这应该是联合类型的一个 BUG ，所以下面的代码按照`type`分开写了。
        for (const listener of listeners.open) {
            ws.addEventListener('open', listener);
        }

        for (const listener of listeners.error) {
            ws.addEventListener('error', listener);
        }

        for (const listener of listeners.message) {
            ws.addEventListener('message', listener);
        }

        for (const listener of listeners.close) {
            ws.addEventListener('close', listener);
        }

        this._ws = ws;

        return this;
    }
}
