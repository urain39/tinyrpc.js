export interface IMap<V> {
    [key: string]: V;
    [index: number]: V;
}

export type JSONRPCCallback = (data: any) => any;
