import { JSDOM } from 'jsdom';
import { JSONRPC } from './lib/jsonrpc';

global.WebSocket = new JSDOM('').window.WebSocket;

const rpc = new JSONRPC('ws://localhost:6800/jsonrpc')
	.onOpen(function () {
		console.log('连接成功！');
	})
	.onError(function () {
		console.log('连接失败！');
	})
	.onNotify('aria2.onDownloadStart', function (params) {
		console.log('下载开始：' + JSON.stringify(params));
	})
	.onNotify('aria2.onDownloadComplete', function (params) {
		console.log('下载完成：' + JSON.stringify(params));
	})
	.onClose(function () {
		console.log('通讯关闭！');
	})
	.request('aria2.tellActive', void 0, function (result, error) {
		if (result) {
			console.log('结果：' + JSON.stringify(result));
		} else if (error) {
			console.log('错误：' + JSON.stringify(error));
		}
	});

// 最大连接（拒绝）测试。
for (let i = 0; i < 20; i++) rpc.request("test", void 0, function (result, error) {
	console.log('id: ' + i);

	if (error)
		console.log(error);
	else
		console.log(result);
});

// 延迟五秒后重试。
setTimeout(function () {
	rpc.request("test", void 0, function (result, error) {
		console.log('-------五秒后------');

		if (error)
			console.log(error);
		else
			console.log(result);
	});
}, 5000);

// 五秒后关闭
// setTimeout(function () {
// 	rpc.close();
// }, 5000);

rpc.onError(function () {
	setTimeout(function () {
		rpc.reconnect();
	}, 3000)
});
