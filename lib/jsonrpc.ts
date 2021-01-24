import { IMap, JSONRPCCallback } from "./common";

export class JSONRPC {
    public rpcPath: string;
    public loaded: boolean;
    public requestCount: number;
    public notifyCallback!: JSONRPCCallback;
    private _ws!: WebSocket;
    private _callbacks: IMap<JSONRPCCallback>;

    /**
     * 为了保证性能，我们限制了最大同时请求的数量。
     */
    public static MAX_REQUEST_COUNT = 8;

    public constructor(rpcPath: string) {
        this.rpcPath = rpcPath;
        this.loaded = false;
        this.requestCount = 0;
        this._callbacks = {};
    }

    /**
     * 开启JSON RPC连接。
     */
    public open(): this {
        this._ws = new WebSocket(this.rpcPath);

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
            const data = JSON.parse(event.data);
            const id = data.id;
            const callback = _this._callbacks[id];

            if (callback) {
                callback(data);
                _this.requestCount--;
            } else {
                // vvv JSON RPC 规定，没有 id 的响应应该视作是通知。
                _this.notifyCallback(data);
            }
        });

        return this;
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
     * @param notifyCallback 消息通知函数
     */
    public onNotify(notifyCallback: JSONRPCCallback): this {
        this.notifyCallback = notifyCallback;

        return this;
    }

    /**
     * 发送请求的方法。
     * @param method RPC 方法名称
     * @param params 参数列表，可为空
     * @param callback 接收到数据后的处理函数
     */
    public request(method: string, params: any, callback: JSONRPCCallback): this {
        return this._request(method, params, callback);
    }

    /**
     * `request`方法的底层实现。与`request`方法最大的区别在于其带有一个附加
     * 的参数`requestId`，用于表示这个操作是之前触发的，但是被推迟到现在执行了。
     */
    private _request(method: string, params: any, callback: JSONRPCCallback, requestId?: number | string): this {
        // 忽略掉超出的请求，但不包括被推迟执行（带有`requestId`）的请求。
        if (this.requestCount >= JSONRPC.MAX_REQUEST_COUNT && !requestId) {
            return this;
        }

        if (!requestId)
            requestId = `${new Date().getTime()}_${this.requestCount++}`;

        // 等待连接。
        if (!this.loaded) {
            const _this = this;
            setTimeout(function () {
                _this._request(method, params, callback, requestId = requestId);
            }, 1000);

            return this;
        }

        // 发送请求。
        this._ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method,
            params
        }));

        // 注册回调。
        this._callbacks[requestId] = callback;

        return this;
    }
}
