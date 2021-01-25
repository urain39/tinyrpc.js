# TinyRPC.js

简单实现的 JSON RPC 使用库。

使用方法：

```ts
import { JSONRPC } from 'tinyrpc';

const rpc = JSONRPC('ws://localhost:9500/jsonrpc');

rpc
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

// 无论完成与否，10秒后关闭连接。
setTimeout(function () {
    rpc.close();
}, 10000);
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

除此以外 Tiny RPC 中会限制同一时间内最大的请求数量，默认我将其设置为`8`个，
如有需要，可以自行配置修改`JSONRPC.MAX_REQUEST_COUNT`。

