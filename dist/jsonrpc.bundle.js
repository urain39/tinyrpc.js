!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).TINYRPC={})}(this,function(e){"use strict";var i=void 0,o={}.hasOwnProperty,t=(h.prototype.onOpen=function(e){return this._ws.addEventListener("open",e),this._listeners.open.push(e),this},h.prototype.onError=function(e){return this._ws.addEventListener("error",e),this._listeners.error.push(e),this},h.prototype.onClose=function(e){return this._ws.addEventListener("close",e),this._listeners.close.push(e),this},h.prototype.onNotify=function(e,t){return this._notifiers[e]=t,this},h.prototype.request=function(e,t,s,r){return void 0===r&&(r=!1),this._request(e,t,s,r),this},h.prototype._request=function(e,t,s,r,n){if(n===i&&(n=this._requestId++,!r)){if(this.requestCount>=h.MAX_REQUEST_COUNT)return void s(i,{code:h.ERROR_MAX_CONCURRENT,message:"Max concurrent error"});this.requestCount++}var o;this.isReady?(o={jsonrpc:"2.0",id:n,method:e,params:t},this._ws.send(JSON.stringify(o)),this._handlers[n]=s):this._requests.push([e,t,s,r,n])},h.prototype.close=function(){for(var e,t=[],s=0;s<arguments.length;s++)t[s]=arguments[s];(e=this._ws).close.apply(e,t)},h.prototype.reconnect=function(){for(var e=this._listeners,t=new WebSocket(this.rpcPath),s=0,r=e.open;s<r.length;s++){var n=r[s];t.addEventListener("open",n)}for(var o=0,i=e.error;o<i.length;o++){n=i[o];t.addEventListener("error",n)}for(var h=0,a=e.message;h<a.length;h++){n=a[h];t.addEventListener("message",n)}for(var l=0,p=e.close;l<p.length;l++){n=p[l];t.addEventListener("close",n)}return this._ws=t,this},h.MAX_REQUEST_COUNT=8,h.ERROR_MAX_CONCURRENT=-32032,h);function h(e,t){this.rpcPath=e,this.preprocess=t,this.isReady=!1,this.requestCount=0,this._ws=new WebSocket(this.rpcPath),this._requestId=0,this._requests=[],this._listeners={open:[],error:[],message:[],close:[]},this._handlers={},this._notifiers={};var n=this;this.onOpen(function(){n.isReady=!0;for(var e=n._requests;0<e.length;)n._request.apply(n,e.shift())}),this.onClose(function(){n.isReady=!1}),this._ws.addEventListener("message",t=function(e){var t=JSON.parse(e.data),e=n.preprocess;if(e&&(t=e(t)),o.call(t,"id")){var s=t.id,r=n._handlers;if(o.call(r,s)){e=r[s];if(o.call(t,"result"))e(t.result,i);else{if(!o.call(t,"error"))throw new Error("Invalid response with no `result` or `error`");e(i,t.error)}delete r[s],n.requestCount--}}else{if(!o.call(t,"method"))throw new Error("Invalid response with no `id` or `method`");r=t.method,s=n._notifiers;o.call(s,r)&&(r=s[r],(t=t.params)&&r(t))}}),this._listeners.message.push(t)}e.JSONRPC=t,Object.defineProperty(e,"__esModule",{value:!0})});
