// ==UserScript==
// @name         PDD 商品标题图片下载
// @namespace    https://taodev.local/
// @version      0.6.0
// @description  远程加载拼多多商品采集业务脚本（标题、轮播主图、详情页图片），业务逻辑通过 HTTP 拉取，方便热更新
// @match        https://mobile.yangkeduo.com/*
// @match        https://mobile.pinduoduo.com/*
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        window.onurlchange
// @connect      cdn.jsdelivr.net
// @run-at       document-idle
// @updateURL    https://cdn.jsdelivr.net/gh/myskux-labs/pdd-collector@main/loader/pdd-goods.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/myskux-labs/pdd-collector@main/loader/pdd-goods.user.js
// ==/UserScript==

(function () {
  'use strict';

  // 业务脚本地址：Vite 构建产物，托管在本仓库 dist/ 目录，经 jsDelivr CDN 分发。
  // 如需锁定到具体版本，可将 @main 替换为具体 tag，例如 @v0.6.0。
  var SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/myskux-labs/pdd-collector@main/dist/pdd-goods.js';

  GM_xmlhttpRequest({
    method: 'GET',
    url: SCRIPT_URL + '?_=' + Date.now(),
    onload: function (res) {
      if (res.status < 200 || res.status >= 300) {
        console.error('[PDD Loader] 拉取业务脚本失败', res.status);
        return;
      }

      try {
        // eslint-disable-next-line no-new-func
        new Function(res.responseText)();
      } catch (err) {
        console.error('[PDD Loader] 执行业务脚本出错', err);
      }
    },
    onerror: function (err) {
      console.error('[PDD Loader] 请求业务脚本出错', err);
    },
  });
})();
