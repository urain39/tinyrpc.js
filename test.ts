import { JSONRPC } from './lib/jsonrpc';

new JSONRPC('ws://192.168.1.250:6800/jsonrpc')
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
	.request('aria2.tellActive', undefined, function (result, error) {
		if (result) {
			console.log('结果：' + JSON.stringify(result));
		} else if (error) {
			console.log('错误：' + JSON.stringify(error));
		}
	});
