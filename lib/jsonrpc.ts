import {
    IMap, JSONRPCHandler, JSONRPCNotifier, JSONRPCRequest,
    JSONRPCResponse, JSONRPCResultResponse, JSONRPCErrorResponse,
    JSONRPCNotification, JSONRPCID, JSONRPCParams, JSONRPCError
} from "./common";


// 修复`undefined`可赋值问题。
const UNDEFINED = void 22;

const hasOwnProperty = {}.hasOwnProperty;


export class JSONRPC {
    public rpcPath: string;
    public isReady: boolean;
    public requestCount: number;
    private _ws: WebSocket;
    private _requestId: number;
    private _handlers: IMap<JSONRPCHandler>;
    private _notifiers: IMap<JSONRPCNotifier>

    /**
     * 最大请求数量。
     */
    public static MAX_REQUEST_COUNT = 8;

    /**
     * 最大重试次数。
     */
    public static MAX_RETRY_COUNT = 3;

    /**
     * 请求时推迟执行的间隔时间，默认是1秒。
     */
    public static CONNECTION_CHECK_DELAY = 1000;

    /**
     * 发送心跳包的间隔时间，默认是15秒。
     */
    public static HEARTBEAT_DELAY = 15000;


    // --------------- TinyRPC 定义的错误信息 ----------------------
    // - JSONRPC 中定义的服务器错误取值范围是`-32000`至`-32099`，而
    // - TinyRPC 选用了其中`-32032`至`-32039`作为预留的非服务器响应
    // - 的错误码（即这是 TinyRPC 判断出来的）。
    // ------------------------------------------------------------

    /**
     * 超过最大并行任务数时的错误码。
     */
    public static ERROR_MAX_CONCURRENT = -32032;

    /**
     * 超过最大重试次数的错误码。
     */
    public static ERROR_MAX_RETRY = -32033;

    /**
     * 心跳包未响应时的错误码。
     */
    public static ERROR_HEARTBEAT_TIMEDOUT = -32034;

    public constructor(rpcPath: string) {
        this.rpcPath = rpcPath;
        this.isReady = false;
        this.requestCount = 0;
        this._ws = new WebSocket(this.rpcPath);
        this._requestId = 0;
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

                    // vvv 此处我们想将其设置为`undefied`以删除变量。
                    (handlers[id] as any) = UNDEFINED;
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
        this._request(method, params, handler, force, UNDEFINED);

        return this;
    }

    /**
     * `request`方法的底层实现。与`request`方法最大的区别在于其带有一个附加
     * 的参数`requestId`，用于表示这个操作是之前触发的，但是被推迟到现在执行了。
     * @param requestId 请求 id
     * @param retryCount 重试计数
     */
    private _request(method: string, params: JSONRPCParams, handler: JSONRPCHandler, force: boolean, requestId: JSONRPCID | undefined, retryCount: number = 0): void {

        if (!force) {
            // 忽略掉超出的请求，但不包括被推迟执行（带有`requestId`）的请求。
            if (this.requestCount >= JSONRPC.MAX_REQUEST_COUNT && !requestId) {
                handler(UNDEFINED, { code: JSONRPC.ERROR_MAX_CONCURRENT, message: 'Max concurrent error' })

                return;
            }

            // 忽略重试过多的请求。
            if (retryCount > JSONRPC.MAX_RETRY_COUNT) {
                handler(UNDEFINED, { code: JSONRPC.ERROR_MAX_RETRY, message: 'Max retry error' })
                this.requestCount--;

                return;
            } else {
                retryCount++;
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
                _this._request(method, params, handler, force, requestId, retryCount);
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
     * 发送心跳包的方法。该方法会引用`JSONRPC.ERROR_HEARTBEAT_TIMEDOUT`属性，
     * 用于作为其内部生成的错误代码。
     * @param method 心跳包的 RPC 方法名称
     * @param params 心跳包的参数列表，可为空
     * @param handler 心跳包响应的处理函数
     */
    public heartbeat(method: string, params: JSONRPCParams, handler: JSONRPCHandler): this {
        let isDead: boolean,
            firstRun: boolean;

        const _this = this;
        const timer = setInterval(function () {
            if (firstRun) {
                // 第一次不检测是否死亡（因为我们还未发送心跳包）
                firstRun = false;
            } else {
                if (isDead) {
                    _this.close();
                    clearInterval(timer);
                    handler(UNDEFINED, { code: JSONRPC.ERROR_HEARTBEAT_TIMEDOUT, message: 'Heartbeat timed out' });
                }
            }

            isDead = true; // 假定其已经死亡
            _this.request(method, params, function (result: unknown, error?: JSONRPCError) {
                // 如果有响应的话则证明其是活的
                isDead = false;
                handler(result, error);
            }, true); // 心跳包是强制发送的！
        }, JSONRPC.HEARTBEAT_DELAY);

        return this;
    }

    /**
     * `WebSocket.prototype.close`的包装。
     */
    public close(...args: any): any {
        return this._ws.close(...args);
    };
}
