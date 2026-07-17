# pdd-collector

一个 Tampermonkey（篡改猴）用户脚本，用于在拼多多（拼多多 App 内嵌页 / mobile.pinduoduo.com、mobile.yangkeduo.com）商品详情页一键采集商品标题、轮播主图、详情页图片，并批量下载到本地。

## 项目结构

业务逻辑与 Tampermonkey 入口脚本是分离的，方便在不要求用户重新安装脚本的情况下更新功能：

```
src/pdd-goods.js          # 业务逻辑源码（采集、下载等具体实现）
vite.config.js            # 构建配置，将 src/pdd-goods.js 打包为 dist/pdd-goods.js（IIFE）
dist/pdd-goods.js         # 构建产物，提交到仓库，经 jsDelivr CDN 对外提供
loader/pdd-goods.user.js  # 真正安装到 Tampermonkey 里的脚本，只做一件事：
                           # 用 GM_xmlhttpRequest 拉取 dist/pdd-goods.js 并执行
```

即：Tampermonkey 里安装的是一个「加载器」，每次打开拼多多商品页时通过 HTTP 从 jsDelivr 拉取最新的业务脚本并运行。更新功能只需要修改 `src/`、构建、推送到仓库，已安装脚本的用户无需手动更新即可用到最新逻辑。

## 功能特性

- 在商品详情页（`/goodsXXX.html`）右上角自动注入「下载商品」悬浮按钮
- 一键采集：
  - 商品标题
  - 商品 ID（从 URL 的 `goods_id` 参数提取）
  - 轮播主图地址列表（自动去除首尾非商品图）
  - 详情页图片地址列表（自动去除首张封面图）
- 采集结果自动以 JSON 格式复制到剪贴板，方便粘贴到其他工具或表格
- 弹窗确认后，通过 `GM_download` 批量下载图片，按 `商品ID_商品标题/` 目录分类存放，文件名自动编号（如 `轮播主图-01.jpg`、`详情页-01.jpg`）
- 支持拼多多站内单页跳转（`pushState` / `replaceState` / `popstate` / `urlchange`），切换商品页时按钮会自动重新挂载

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展（支持移动端浏览器或桌面浏览器）
2. 新建用户脚本，将 [loader/pdd-goods.user.js](loader/pdd-goods.user.js) 的内容粘贴进去并保存

   > 注意安装的是 `loader/` 目录下的加载器脚本，不是 `src/pdd-goods.js`。加载器体积很小，只负责运行时拉取并执行 `dist/pdd-goods.js` 中的真正业务逻辑。

3. 打开拼多多商品详情页（如 `https://mobile.pinduoduo.com/goods.html?goods_id=xxx`），确认脚本已生效（可在浏览器控制台看到 `[PDD Loader]` 相关日志或直接看到下载按钮）

## 使用方法

1. 打开任意拼多多商品详情页，页面右侧会出现红色「下载商品」按钮
2. 点击按钮，脚本会等待页面渲染完成后采集商品信息
3. 采集结果（标题、商品链接、商品 ID、轮播主图与详情页图片地址）会自动复制到剪贴板
4. 弹出确认框，显示轮播主图与详情页图片数量，确认后即开始批量下载图片
5. 图片会下载到浏览器默认下载目录下的 `商品ID_商品标题/` 子目录中

## 输出结构示例

```
downloads/
└── 123456789_某商品标题/
    ├── 轮播主图-01.jpg
    ├── 轮播主图-02.jpg
    ├── 详情页-01.jpg
    ├── 详情页-02.jpg
    └── ...
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
npm install       # 安装依赖（vite）
npm run build      # 构建 src/pdd-goods.js -> dist/pdd-goods.js
npm run watch       # 监听文件变化自动重新构建，本地调试用
```

发布新版本业务逻辑的流程：

1. 修改 `src/pdd-goods.js`
2. `npm run build` 生成新的 `dist/pdd-goods.js`
3. 提交并推送到 `main` 分支（`dist/` 已从 `.gitignore` 中排除，需要随源码一起提交）
4. jsDelivr 会在数分钟内刷新缓存；如需立即生效，可访问 purge 接口手动清缓存：
   `https://purge.jsdelivr.net/gh/myskux-labs/pdd-collector@main/dist/pdd-goods.js`

已安装 loader 脚本的用户下次打开拼多多商品页时会自动拉取到最新的 `dist/pdd-goods.js`，无需重新安装或手动更新 Tampermonkey 脚本。

## 技术说明

- `loader/pdd-goods.user.js` 是唯一需要安装到 Tampermonkey 的文件，只负责在 `document-idle` 时通过 `GM_xmlhttpRequest` 请求 `dist/pdd-goods.js`（经 jsDelivr CDN 分发），拉取成功后用 `new Function` 执行，业务代码因此运行在与 loader 相同的脚本沙箱中，可以正常使用 `GM_download` / `GM_setClipboard` 等已授权的 GM API
- 请求 URL 附带时间戳查询参数用于绕过 Tampermonkey/浏览器的本地请求缓存；jsDelivr 边缘节点自身的缓存仍可能有数分钟延迟，见上文「开发与发布」的 purge 方式
- 如需锁定到某个稳定版本而非始终跟随 `main` 分支最新构建，可将 `loader/pdd-goods.user.js` 中 `SCRIPT_URL` 里的 `@main` 替换为具体的 git tag，例如 `@v0.6.0`
- `@match` 匹配 `mobile.yangkeduo.com` 与 `mobile.pinduoduo.com` 的所有页面，业务脚本仅在商品详情页（URL 匹配 `/goods\d*\.html/`）显示下载按钮
- 依赖 `GM_download` 权限执行图片下载，依赖 `GM_setClipboard` 权限复制采集结果（不支持时回退到 `navigator.clipboard`）
- 图片扩展名根据图片 URL 自动识别（jpg/jpeg/png/webp/gif），无法识别时默认使用 `jpg`
- 文件名中的非法字符（`\ / : * ? " < > |`）会被自动替换为下划线

## 注意事项

- 仅供个人学习、备份与研究使用，请勿用于批量爬取、商用侵权或违反拼多多用户协议的用途
- 页面结构（如 `aria-label="商品大图"` / `aria-label="查看图片"` 等选择器）依赖拼多多当前前端实现，若拼多多页面改版，脚本可能需要同步调整
- 批量下载图片时请求间隔 300ms，避免请求过于密集
- loader 会在运行时从远端拉取并执行代码，本质上是信任 `myskux-labs/pdd-collector@main` 这个仓库的内容；仅从可信来源安装 loader，如果 fork 或自建 CDN 源，请确认 `SCRIPT_URL` 指向自己可控的地址

## License

[MIT](LICENSE)
