import { IMap, JSONRPCCallback, sleep } from "./common";

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

        const _this = this;
        this._ws.addEventListener('open', function () {
            _this.loaded = true;
        });
        this._ws.addEventListener('message', function (event: MessageEvent) {
            const data = JSON.parse(event.data);
            const id = data.id;
            const callback = _this._callbacks[id];

            if (callback) {
                callback(data);
                _this.requestCount--;
            } else {
                _this.notifyCallback(data);
            }
        });

        return this;
    }

    /**
     * 使用该方法注册消息通知函数。
     * @param notifyCallback 消息通知函数
     * @returns {JSONRPC} this
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
    public async request(method: string, params: any, callback: JSONRPCCallback): Promise<void> {
        // 如果超过额定值，则忽略请求。
        if (this.requestCount >= JSONRPC.MAX_REQUEST_COUNT) {
            return;
        }

        /**
         * 注意：我们必须在真正异步执行（await）前增加计数，不然的话以
         * JS 的执行顺序，它会将多个请求都加进 事件队列 里，那样就不是
         * 我们想要的实现的效果了。
         */
        const id = `${new Date().getTime()}_${this.requestCount++}`;

        // 等待连接。
        while (!this.loaded) {
            await sleep(1000);
        }

        // 发送请求。
        this._ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id,
            method,
            params
        }));

        // 注册回调。
        this._callbacks[id] = callback;
    }
}
