export interface IMap<V> {
    [key: string]: V;
    [index: number]: V;
}

export type JSONRPCCallback = (data: any) => any;

export function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
        setTimeout(() => resolve(), ms);
    });
}
