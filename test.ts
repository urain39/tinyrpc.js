import { JSONRPC } from './lib/jsonrpc';

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

// 五秒后关闭
// setTimeout(function () {
// 	rpc.close();
// }, 5000);

rpc.heartbeat('', [], function (isDead, result, error) {
	if (isDead) {
		console.log('心跳包丢失！');

		return;
	}

	if (error) {
		console.log('心跳包错误：' + JSON.stringify(error));
	} else {
		console.log('心跳包：' + JSON.stringify(result));
	}
});


rpc.onError(function() {
	rpc.reconnect();
});
