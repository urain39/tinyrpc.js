import {
    IMap, JSONRPCHandler, JSONRPCRejectCallback, JSONRPCNotifier,
    JSONRPCRequest, JSONRPCResponse, JSONRPCResultResponse, JSONRPCErrorResponse,
    JSONRPCNotification, JSONRPCParams
} from "./common";


// 修复`undefined`可赋值问题。
const UNDEFINED = void 22;

const hasOwnProperty = {}.hasOwnProperty;


export class JSONRPC {
    public rpcPath: string;
    public loaded: boolean;
    public requestCount: number;
    public rejectCallback?: JSONRPCRejectCallback;
    private _ws: WebSocket;
    private _requestId: number;
    private _handlers: IMap<JSONRPCHandler>;
    private _notifiers: IMap<JSONRPCNotifier>

    /**
     * 最大请求数量。
     */
    public static MAX_REQUEST_COUNT = 8;

    public constructor(rpcPath: string) {
        this.rpcPath = rpcPath;
        this.loaded = false;
        this.requestCount = 0;
        this._ws = new WebSocket(this.rpcPath);
        this._requestId = 0;
        this._handlers = {};
        this._notifiers = {};

        /**
         * 标记连接状态。
         */
        const _this = this;
        this._ws.addEventListener('open', function () {
            _this.loaded = true;
        });

        /**
         * 处理响应数据。
         */
        this._ws.addEventListener('message', function (event: MessageEvent) {
            const response: JSONRPCNotification | JSONRPCResultResponse | JSONRPCErrorResponse = JSON.parse(event.data);

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

                    // 尽管 delete 备受争议，但是这里好像没有更好的方法。
                    delete handlers[id];

                    _this.requestCount--;
                } else {
                    // TODO: 我们应该考虑未标记过的id吗？
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
                        // TODO: 我们应该考虑未标记过的通知吗？
                    }
                } else {
                    throw new Error('Invalid response with no `id` or `method`');
                }
            }
        });
    }

    /**
     * 用于监听开启事件。
     * @param listener 开启事件监听器
     */
    public onOpen(listener: typeof WebSocket.prototype.onopen): this {
        if (listener)
            this._ws.addEventListener('open', listener);

        return this;
    }

    /**
     * 用于监听错误事件。
     * @param listener 错误事件监听器
     */
    public onError(listener: typeof WebSocket.prototype.onerror): this {
        if (listener)
            this._ws.addEventListener('error', listener);

        return this;
    }

    /**
     * 用于监听关闭事件。
     * @param listener 关闭事件监听器
     */
    public onClose(listener: typeof WebSocket.prototype.onclose): this {
        if (listener)
            this._ws.addEventListener('close', listener);

        return this;
    }

    public onReject(rejectCallback: JSONRPCRejectCallback): this {
        this.rejectCallback = rejectCallback;

        return this;
    }

    /**
     * 使用该方法注册消息通知函数。
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
        return this._request(method, params, handler, force);
    }

    /**
     * `request`方法的底层实现。与`request`方法最大的区别在于其带有一个附加
     * 的参数`requestId`，用于表示这个操作是之前触发的，但是被推迟到现在执行了。
     */
    private _request(method: string, params: JSONRPCParams, handler: JSONRPCHandler, force: boolean, requestId?: number | string): this {
        // 忽略掉超出的请求，但不包括被推迟执行（带有`requestId`）和强制的请求。
        if (this.requestCount >= JSONRPC.MAX_REQUEST_COUNT && !requestId && !force) {
            const rejectCallback = this.rejectCallback;

            if (rejectCallback)
                rejectCallback(new Error('Maximum concurrent request count'));

            return this;
        }

        if (requestId === UNDEFINED) {
            requestId = this._requestId++;

            if (!force)
                // 请求计数只针对普通请求。
                this.requestCount++;
        }

        // 等待连接。
        if (!this.loaded) {
            const _this = this;
            setTimeout(function () {
                _this._request(method, params, handler, force, requestId);
            }, 1000);

            return this;
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

        return this;
    }

    /**
     * `WebSocket.prototype.close`的包装。
     */
    public close(...args: any): any {
        return this._ws.close(...args);
    };
}
