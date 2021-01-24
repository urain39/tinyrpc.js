# TinyRPC.js

简单实现的 JSON RPC 使用库。

使用方法：

```ts
import { JSONRPC } from 'tinyrpc';

JSONRPC('ws://localhost:9500/jsonrpc')
    .onOpen(function (event) {
        console.log('成功：' + event.data);
    })
    .onError(function (error) {
        console.log('错误：' + error.message);
    })
    .onNotify(function (data) {
        console.log('通知：' + JSON.stringify(data));
    })
    .request('tellStatus', ['secret:123456'], function (data) {
        console.log('任务：' + JSON.stringify(data));
    });
```

TINY RPC中的`request`方法并非是异步的，它会在每次请求时判断连接状态。

也就是说上面类似 Promise 链式调用的语法其实并非是必须的，你完全可以
写成下面的格式：

```ts
for (let i = 0; i < 100; i++) {
     rpc.request('aria2.tellActive', ['token:arcticfox'], function (data) {
        console.log('收到结果：' + JSON.stringify(data));
    });
}
```

除此以外 Tiny RPC 中可以限制同一时间内最大的请求数量，你可以修改属性`JSONRPC.MAX_REQUEST_COUNT`
来实现。默认我将其设置为`8`个。
