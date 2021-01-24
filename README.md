# tinyrpc.js

简单实现的 JSON RPC 使用库。

使用方法：

```ts
import { JSONRPC } from 'tinyrpc';

JSONRPC('ws://localhost:9500/jsonrpc')
    .open()
    .onOpen(function() {
        
    })
    .onError(function () {

    })
    .onNotify(function (data) {
        console.log('通知：' + JSON.stringify(data));
    })
    .request('tellStatus', ['secret:123456'], function (data) {

    })
```
