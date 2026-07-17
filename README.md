# pdd-collector

一个 Tampermonkey（篡改猴）用户脚本，用于在拼多多（拼多多 App 内嵌页 / mobile.pinduoduo.com、mobile.yangkeduo.com）商品详情页一键采集商品标题、轮播主图、详情页图片，并批量下载到本地。

## 项目结构

业务逻辑与 Tampermonkey 入口脚本是分离的，方便在不要求用户重新安装脚本的情况下更新功能：

```
src/pdd-goods.js              # 业务逻辑源码（采集、下载等具体实现）
vite.config.js                # 构建配置，将 src/pdd-goods.js 打包为 dist/pdd-goods.js（IIFE）
dist/pdd-goods.js             # 构建产物，提交到仓库，经 jsDelivr CDN 对外提供
loader/pdd-goods.user.js      # 真正安装到 Tampermonkey 里的脚本，只做一件事：
                               # 用 @require 声明加载 dist/pdd-goods.js（生产环境，指向 jsDelivr）
loader/pdd-goods.dev.user.js  # 本地调试专用 loader，@require 指向本地 vite preview 服务器
```

即：Tampermonkey 里安装的是一个「加载器」，元数据块里用 `@require` 指向 jsDelivr 上的业务脚本地址，由 Tampermonkey 自己负责拉取执行。更新功能只需要修改 `src/`、构建、推送到仓库，Tampermonkey 会按其更新检查周期自动拉取最新内容，已安装脚本的用户无需手动更新。

> 早期版本尝试过用 `GM_xmlhttpRequest` 拉取业务脚本文本后 `new Function()` eval 执行，实测在 Chrome / Edge 上会导致 `GM_download` 调用「看似成功但实际不下载文件」（`new Function` 创建的函数拿不到 Tampermonkey 注入 GM API 所在的闭包）。因此改用 Tampermonkey 官方支持的 `@require` 机制，业务代码与 loader 运行在同一个沙箱作用域，GM API 可以正常工作。

## 功能特性

- 在商品详情页（`/goodsXXX.html`）右上角自动注入一个 [Tweakpane](https://github.com/cocopon/tweakpane) 悬浮面板，面板内显示状态、标题、轮播主图/详情页图片数量，底部是「识别」「下载」两个按钮
- 点击「识别」采集：
  - 商品标题
  - 商品 ID（从 URL 的 `goods_id` 参数提取）
  - 轮播主图地址列表（自动去除首尾非商品图）
  - 详情页图片地址列表（自动去除首张封面图）
  - 采集结果自动以 JSON 格式复制到剪贴板，方便粘贴到其他工具或表格；识别成功后「下载」按钮才会启用
- 点击「下载」，基于最近一次识别结果，用 `GM_xmlhttpRequest` 逐张抓取轮播主图/详情页图片的二进制数据，连同一份 `商品信息.md`（标题、商品链接、商品 ID、图片文件名与原始 URL 对照表）一起用 [fflate](https://github.com/101arrowz/fflate) 打包成一个 `商品ID_商品标题.zip`，再用 `GM_download` 一次性下载这个 zip（图片文件名自动编号，如 `轮播主图-01.jpg`、`详情页-01.jpg`）
- 支持拼多多站内单页跳转（`pushState` / `replaceState` / `popstate` / `urlchange`），切换到非商品页时面板自动销毁，回到商品页时自动重新创建

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展（支持移动端浏览器或桌面浏览器）
2. 新建用户脚本，将 [loader/pdd-goods.user.js](loader/pdd-goods.user.js) 的内容粘贴进去并保存

   > 注意安装的是 `loader/` 目录下的加载器脚本，不是 `src/pdd-goods.js`。加载器体积很小，只负责运行时拉取并执行 `dist/pdd-goods.js` 中的真正业务逻辑。

3. 打开拼多多商品详情页（如 `https://mobile.pinduoduo.com/goods.html?goods_id=xxx`），确认脚本已生效（能看到右上角的 Tweakpane 面板即代表 `@require` 的业务脚本加载成功）

## 使用方法

1. 打开任意拼多多商品详情页，页面右上角会出现 Tweakpane 悬浮面板
2. 点击「识别」，脚本会等待页面渲染完成后采集商品信息（标题、商品 ID、轮播主图与详情页图片地址），面板上会显示识别结果，采集结果同时会自动复制到剪贴板
3. 识别完成后「下载」按钮变为可用，点击「下载」即抓取所有图片并打包成一个 zip 文件下载
4. zip 会下载到浏览器默认下载目录下，文件名为 `商品ID_商品标题.zip`

## 输出结构示例

下载到的是单个 zip 文件（`123456789_某商品标题.zip`），解压后图片和 `商品信息.md` 平铺在 zip 根目录：

```
商品信息.md
轮播主图-01.jpg
轮播主图-02.jpg
详情页-01.jpg
详情页-02.jpg
...
```

采集结果 JSON（复制到剪贴板）结构：

```json
{
  "url": "https://mobile.pinduoduo.com/goods.html?goods_id=xxx",
  "goodsId": "xxx",
  "title": "商品标题",
  "carouselImages": ["https://...", "..."],
  "detailImages": ["https://...", "..."]
}
```

## 开发与发布

```bash
pnpm install      # 安装依赖（vite、tweakpane、concurrently）
pnpm run clean    # 清除 dist/ 构建产物
pnpm run build    # 清除后重新构建 src/pdd-goods.js -> dist/pdd-goods.js（tweakpane 一并打包进单文件）
pnpm run watch    # 监听文件变化自动重新构建 dist/pdd-goods.js
pnpm run serve    # 用 vite preview 把 dist/ 用 HTTP 暴露出来（默认 http://localhost:4173/pdd-goods.js）
pnpm run dev      # build 一次，然后并行跑 watch + serve，本地调试入口，见下方「本地调试」
pnpm run purge    # 主动刷新 jsDelivr 对 dist/pdd-goods.js 和 loader/pdd-goods.user.js 的边缘缓存
```

## 本地调试

生产环境的 `loader/pdd-goods.user.js` 通过 `@require` 指向 jsDelivr，改一次代码要走 build → 推送 → purge 一整套流程，不适合开发时高频迭代。本地调试改用单独的 [loader/pdd-goods.dev.user.js](loader/pdd-goods.dev.user.js)，`@require` 指向本地的 `vite preview` 服务器：

1. `pnpm run dev`：先构建一次，再并行启动 `vite build --watch`（保存 `src/pdd-goods.js` 自动重新打包）和 `vite preview --host --port 4173`（把 `dist/` 用 HTTP 暴露出来）
2. 把 [loader/pdd-goods.dev.user.js](loader/pdd-goods.dev.user.js) 安装到 Tampermonkey（和正式 loader 是两个独立脚本，建议同一时间只启用一个，避免面板重复出现两份）
3. 打开拼多多商品详情页调试，改 `src/pdd-goods.js` 保存后直接刷新页面即可看到效果，不需要手动点「检查更新」

能做到"改完刷新就生效"，是因为 Tampermonkey 对 `@require http://localhost:...` **不会缓存**，每次页面加载都会重新拉取——这一点和 jsDelivr（`@main` 分支缓存最长 12 小时）以及普通 `https://` 的 `@require`（缓存到 Tampermonkey 下次检查更新）都不同，是社区里公认的本地调试写法。

如果要用手机等其他设备测试（不是运行 `pnpm run dev` 的电脑），把 dev loader 里的 `localhost` 换成这台电脑的局域网 IP（`vite preview --host` 启动时会打印 `Network: http://<局域网IP>:4173/`），确保两台设备在同一局域网。这种情况下 Tampermonkey 是否仍然免缓存未经验证，如果改完刷新页面没反应，去 Tampermonkey 管理面板对 dev 脚本手动点一次「检查更新」。

发布新版本业务逻辑的流程：

1. 修改 `src/pdd-goods.js`
2. `pnpm run build` 生成新的 `dist/pdd-goods.js`
3. 提交并推送到 `main` 分支（`dist/` 已从 `.gitignore` 中排除，需要随源码一起提交）
4. `pnpm run purge` 主动清除 jsDelivr 边缘缓存，让新内容立即生效

> jsDelivr 对 `@main` 这类分支引用的 CDN 缓存最长可达 12 小时（tag/commit 引用则接近永久缓存，因为被当作不可变内容）。**给 URL 加时间戳/随机 query string 之类的"缓存穿透"技巧对 jsDelivr 无效**——它的缓存 key 只按仓库+ref+文件路径计算，会直接忽略 query string。真正有效的是官方的 [purge 接口](https://www.jsdelivr.com/tools/purge)，即上面的 `pnpm run purge`。

Tampermonkey 自身也有「检查用户脚本更新」的周期（默认每天，可在 Tampermonkey 设置里调整），会重新拉取 `@require` 指向的内容；结合 `pnpm run purge` 主动清缓存，已安装 loader 脚本的用户基本可以在当天甚至几分钟内用上最新的 `dist/pdd-goods.js`，无需重新安装。也可以在 Tampermonkey 管理面板里手动点「检查更新」立即刷新。

## 技术说明

- `loader/pdd-goods.user.js` 是唯一需要安装到 Tampermonkey 的文件，元数据块里通过 `@require` 声明加载 `dist/pdd-goods.js`（经 jsDelivr CDN 分发）。`@require` 的内容会被 Tampermonkey 合并进同一个脚本沙箱执行，因此业务代码可以正常使用 `GM_download` / `GM_setClipboard` 等已授权的 GM API
- **不要**改用 `GM_xmlhttpRequest` 拉取脚本文本后用 `new Function()`/`eval` 执行：`new Function` 创建的函数只能访问全局作用域，拿不到 Tampermonkey 用于注入 GM API 的闭包，实测会导致 `GM_download` 调用不报错、Promise 正常 resolve，但完全没有真正触发浏览器下载（Chrome / Edge 上复现）
- 如需锁定到某个稳定版本而非始终跟随 `main` 分支最新构建，可将 `loader/pdd-goods.user.js` 中 `@require` 里的 `@main` 替换为具体的 git tag，例如 `@v0.7.0`
- `@match` 匹配 `mobile.yangkeduo.com` 与 `mobile.pinduoduo.com` 的所有页面，业务脚本仅在商品详情页（URL 匹配 `/goods\d*\.html/`）显示 Tweakpane 面板
- UI 使用 [Tweakpane](https://github.com/cocopon/tweakpane) v4（`addBinding`/`addButton` API），压缩打包用 [fflate](https://github.com/101arrowz/fflate) 的 `zipSync`，两者都作为普通 npm 依赖随业务代码一起被 Vite 打包进 `dist/pdd-goods.js`，不需要额外的 `@require`/CDN 引入
- 下载流程：`GM_xmlhttpRequest`（`responseType: 'arraybuffer'`）逐张抓取图片二进制，连同 `fflate.strToU8` 编码的 `商品信息.md` 文本一起 → `fflate.zipSync` 在内存里打包成 zip → 包成 `Blob` 后 `URL.createObjectURL` 得到 blob URL → 交给 `GM_download` 一次性下载。`GM_download` 支持 blob URL 作为 `url` 参数
- **`@connect *` 是必须的**：`GM_xmlhttpRequest` 与 `GM_download` 不同，会真正按 `@connect` 白名单校验目标域名，域名不在白名单时请求被静默拦截（无 `onload`/`onerror` 回调）。拼多多的图片 CDN 域名多且会变化，无法逐个枚举，因此用 `@connect *`
- 依赖 `GM_download` 权限保存最终的 zip，依赖 `GM_xmlhttpRequest` 权限抓取图片二进制，依赖 `GM_setClipboard` 权限复制采集结果（不支持时回退到 `navigator.clipboard`）
- 图片扩展名根据图片 URL 自动识别（jpg/jpeg/png/webp/gif），无法识别时默认使用 `jpg`
- 文件名中的非法字符（`\ / : * ? " < > |`）会被自动替换为下划线

## 注意事项

- 仅供个人学习、备份与研究使用，请勿用于批量爬取、商用侵权或违反拼多多用户协议的用途
- 页面结构（如 `aria-label="商品大图"` / `aria-label="查看图片"` 等选择器）依赖拼多多当前前端实现，若拼多多页面改版，脚本可能需要同步调整
- 逐张抓取图片二进制数据时请求间隔 300ms，避免请求过于密集；单张图片抓取失败会跳过并在控制台报错，不影响其余图片打包
- loader 通过 `@require` 从远端加载并执行代码，本质上是信任 `myskux-labs/pdd-collector@main` 这个仓库的内容；仅从可信来源安装 loader，如果 fork 或自建 CDN 源，请确认 `@require` 地址指向自己可控的地址

## License

[MIT](LICENSE)
