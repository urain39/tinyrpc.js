export interface IMap<V> {
    [key: string]: V;
    [index: number]: V;
}

/**
 * JSONRPC （`JSONRPCResponse`中）参数的类型。
 */
export type JSONRPCParams = unknown[] | IMap<unknown> | null;

/**
 * JSONRPC （`JSONRPCResponse`中）ID的类型。
 */
export type JSONRPCID = string | number;

/**
 * JSONRPC （`JSONRPCResponse`中）结果的类型。
 */
export type JSONRPCResult = unknown;

/**
 * JSONRPC （`JSONRPCResponse`中）错误的类型。
 */
export interface JSONRPCError {
    code: number;
    message: string;
    data?: unknown[];
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
 * JSONRPC 处理错误的回调类型。
 */
export type JSONRPCRejectCallback = (error: Error) => any;

/**
 * JSONRPC 数据处理的回调类型。
 */
export type JSONRPCHandler =  (result: JSONRPCResult, error?: JSONRPCError) => any;

/**
 * JSONRPC 处理通知的回调类型。
 */
export type JSONRPCNotifier = (params: JSONRPCParams) => any;
