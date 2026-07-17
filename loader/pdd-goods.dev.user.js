// ==UserScript==
// @name         PDD 商品标题图片下载（本地开发）
// @namespace    https://taodev.local/
// @version      0.0.0
// @description  本地调试用 loader：@require 指向本地 vite preview 服务器，不走 jsDelivr，不会自动更新
// @match        https://mobile.yangkeduo.com/*
// @match        https://mobile.pinduoduo.com/*
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        window.onurlchange
// @require      http://localhost:4173/pdd-goods.js
// @run-at       document-idle
// ==/UserScript==

// 仅用于本地开发调试，不要发布/分享这个脚本。
//
// 使用方法：
// 1. `pnpm run dev`（在项目根目录）：同时启动 `vite build --watch`（保存 src/pdd-goods.js 自动重新构建
//    dist/pdd-goods.js）和 `vite preview --host --port 4173`（把 dist/ 目录用 HTTP 暴露出来）
// 2. 把本文件（loader/pdd-goods.dev.user.js）安装到 Tampermonkey 里（和正式的
//    loader/pdd-goods.user.js 是两个独立脚本，可以同时装着，但同一时间建议只启用一个，
//    避免面板出现两份）
// 3. 打开拼多多商品详情页（桌面 Chrome/Edge 用 DevTools 设备工具栏模拟移动端 UA 即可），
//    修改 src/pdd-goods.js 保存后，刷新页面就能看到最新效果
//
// Tampermonkey 对 `@require http://localhost:...` 不会做缓存，每次页面加载都会重新拉取，
// 所以不需要像正式环境那样手动点「检查更新」或调用 jsDelivr purge。
//
// 如果要在手机等其他设备上测试（不是运行 `pnpm run dev` 的这台电脑），把上面 @require 里的
// `localhost` 换成这台电脑的局域网 IP（`pnpm run dev` 启动时 vite preview 会打印
// `Network: http://<局域网IP>:4173/`），并确认手机和电脑在同一局域网。这种情况下 Tampermonkey
// 是否仍然免缓存未经验证，如果修改后页面没有变化，先去 Tampermonkey 管理面板对这个脚本手动点
// 「检查更新」。
