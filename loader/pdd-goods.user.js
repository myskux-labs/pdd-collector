// ==UserScript==
// @name         PDD 商品标题图片下载
// @namespace    https://taodev.local/
// @version      0.7.0
// @description  拼多多商品标题、轮播主图、详情页图片采集下载，业务逻辑通过 @require 从远程加载，方便更新
// @match        https://mobile.yangkeduo.com/*
// @match        https://mobile.pinduoduo.com/*
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        window.onurlchange
// @require      https://cdn.jsdelivr.net/gh/myskux-labs/pdd-collector@main/dist/pdd-goods.js
// @run-at       document-idle
// @updateURL    https://cdn.jsdelivr.net/gh/myskux-labs/pdd-collector@main/loader/pdd-goods.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/myskux-labs/pdd-collector@main/loader/pdd-goods.user.js
// ==/UserScript==

// 业务逻辑通过上面的 @require 从远程加载并执行，源码见 src/pdd-goods.js（构建产物 dist/pdd-goods.js）。
// @require 让业务代码运行在与本脚本相同的沙箱作用域中，GM_download / GM_setClipboard 等 API 才能正常工作
// ——不要改回用 GM_xmlhttpRequest 拉取后 new Function()/eval 执行，那样业务代码拿不到 GM API
// 所在的闭包，会导致 GM_download 看起来调用成功但实际不会真正触发下载。
//
// Tampermonkey 会按其自身的"检查更新"周期自动重新拉取 @require 的内容，
// 已安装本脚本的用户无需手动更新即可用到 dist/pdd-goods.js 的最新版本。
