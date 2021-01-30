export interface IMap<V> {
    [key: string]: V;
    [index: number]: V;
}

export type ArgumentsType<FN extends (...args: any[]) => any> =
    FN extends (...args: infer AT) => any ? AT : any[];

export interface JSONRPCEventListenerMap {
    open: Exclude<typeof WebSocket.prototype.onopen, null>[];
    error: Exclude<typeof WebSocket.prototype.onerror, null>[];
    message: Exclude<typeof WebSocket.prototype.onmessage, null>[];
    close: Exclude<typeof WebSocket.prototype.onclose, null>[];
}

/**
 * JSONRPC （`JSONRPCResponse`中）参数的类型。
 */
export type JSONRPCParams = unknown[] | IMap<unknown> | undefined;

/**
 * JSONRPC （`JSONRPCResponse`中）ID的类型。
 */
export type JSONRPCID = string | number;

/**
 * JSONRPC （`JSONRPCResponse`中）结果的类型。
 */
export type JSONRPCResult = any;

/**
 * JSONRPC （`JSONRPCResponse`中）错误的类型。
 */
export interface JSONRPCError {
    code: number;
    message: string;
    data?: any[];
}

/**
 * JSONRPC 通知的类型。
 */
export interface JSONRPCNotification {
    jsonrpc: '2.0';
    method: string;
    params?: JSONRPCParams;
}

/**
 * JSONRPC 请求的类型。
 */
export interface JSONRPCRequest extends JSONRPCNotification {
    id: JSONRPCID;
}

/**
 * JSONRPC 基础响应的类型。
 */
export interface JSONRPCResponse {
    jsonrpc: '2.0';
    id: JSONRPCID;
}

/**
 * JSONRPC 结果响应的类型。
 */
export interface JSONRPCResultResponse extends JSONRPCResponse {
    result: JSONRPCResult;
}

/**
 * JSONRPC 错误响应的类型。
 */
export interface JSONRPCErrorResponse extends JSONRPCResponse {
    error: JSONRPCError;
}

/**
 * JSONRPC 数据处理的回调类型。
 */
export type JSONRPCHandler = (result: JSONRPCResult, error?: JSONRPCError) => any;

type JSONRPCHandlerArguments = ArgumentsType<JSONRPCHandler>;

/**
 * JSONRPC 心跳包处理的回调类型。
 */
export type JSONRPCHeartbeatHandler = (isDead: boolean, ...args: JSONRPCHandlerArguments) => any;

/**
 * JSONRPC 处理通知的回调类型。
 */
export type JSONRPCNotifier = (params: JSONRPCParams) => any;

/**
 * JSONRPC 响应的预处理回调。
 */
export type JSONRPCPreprocess = (data: any) => any;
