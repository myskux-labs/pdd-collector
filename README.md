# pdd-collector

一个 Tampermonkey（篡改猴）用户脚本，用于在拼多多（拼多多 App 内嵌页 / mobile.pinduoduo.com、mobile.yangkeduo.com）商品详情页一键采集商品标题、轮播主图、详情页图片，并批量下载到本地。

## 项目结构

业务逻辑与 Tampermonkey 入口脚本是分离的，方便在不要求用户重新安装脚本的情况下更新功能：

```
src/pdd-goods.js          # 业务逻辑源码（采集、下载等具体实现）
vite.config.js            # 构建配置，将 src/pdd-goods.js 打包为 dist/pdd-goods.js（IIFE）
dist/pdd-goods.js         # 构建产物，提交到仓库，经 jsDelivr CDN 对外提供
loader/pdd-goods.user.js  # 真正安装到 Tampermonkey 里的脚本，只做一件事：
                           # 用 @require 声明加载 dist/pdd-goods.js
```

即：Tampermonkey 里安装的是一个「加载器」，元数据块里用 `@require` 指向 jsDelivr 上的业务脚本地址，由 Tampermonkey 自己负责拉取执行。更新功能只需要修改 `src/`、构建、推送到仓库，Tampermonkey 会按其更新检查周期自动拉取最新内容，已安装脚本的用户无需手动更新。

> 早期版本尝试过用 `GM_xmlhttpRequest` 拉取业务脚本文本后 `new Function()` eval 执行，实测在 Chrome / Edge 上会导致 `GM_download` 调用「看似成功但实际不下载文件」（`new Function` 创建的函数拿不到 Tampermonkey 注入 GM API 所在的闭包）。因此改用 Tampermonkey 官方支持的 `@require` 机制，业务代码与 loader 运行在同一个沙箱作用域，GM API 可以正常工作。

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

3. 打开拼多多商品详情页（如 `https://mobile.pinduoduo.com/goods.html?goods_id=xxx`），确认脚本已生效（能看到下载按钮即代表 `@require` 的业务脚本加载成功）

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
pnpm install      # 安装依赖（vite）
pnpm run clean    # 清除 dist/ 构建产物
pnpm run build    # 清除后重新构建 src/pdd-goods.js -> dist/pdd-goods.js
pnpm run watch    # 监听文件变化自动重新构建，本地调试用
```

发布新版本业务逻辑的流程：

1. 修改 `src/pdd-goods.js`
2. `pnpm run build` 生成新的 `dist/pdd-goods.js`
3. 提交并推送到 `main` 分支（`dist/` 已从 `.gitignore` 中排除，需要随源码一起提交）
4. jsDelivr 会在数分钟内刷新缓存；如需立即生效，可访问 purge 接口手动清缓存：
   `https://purge.jsdelivr.net/gh/myskux-labs/pdd-collector@main/dist/pdd-goods.js`

Tampermonkey 会按其自身「检查用户脚本更新」的周期（默认每天，也可在 Tampermonkey 设置里调整）重新拉取 `@require` 指向的内容，已安装 loader 脚本的用户无需重新安装或手动更新即可用上最新的 `dist/pdd-goods.js`；也可以在 Tampermonkey 管理面板里手动点「检查更新」立即刷新。

## 技术说明

- `loader/pdd-goods.user.js` 是唯一需要安装到 Tampermonkey 的文件，元数据块里通过 `@require` 声明加载 `dist/pdd-goods.js`（经 jsDelivr CDN 分发）。`@require` 的内容会被 Tampermonkey 合并进同一个脚本沙箱执行，因此业务代码可以正常使用 `GM_download` / `GM_setClipboard` 等已授权的 GM API
- **不要**改用 `GM_xmlhttpRequest` 拉取脚本文本后用 `new Function()`/`eval` 执行：`new Function` 创建的函数只能访问全局作用域，拿不到 Tampermonkey 用于注入 GM API 的闭包，实测会导致 `GM_download` 调用不报错、Promise 正常 resolve，但完全没有真正触发浏览器下载（Chrome / Edge 上复现）
- 如需锁定到某个稳定版本而非始终跟随 `main` 分支最新构建，可将 `loader/pdd-goods.user.js` 中 `@require` 里的 `@main` 替换为具体的 git tag，例如 `@v0.7.0`
- `@match` 匹配 `mobile.yangkeduo.com` 与 `mobile.pinduoduo.com` 的所有页面，业务脚本仅在商品详情页（URL 匹配 `/goods\d*\.html/`）显示下载按钮
- 依赖 `GM_download` 权限执行图片下载，依赖 `GM_setClipboard` 权限复制采集结果（不支持时回退到 `navigator.clipboard`）
- 图片扩展名根据图片 URL 自动识别（jpg/jpeg/png/webp/gif），无法识别时默认使用 `jpg`
- 文件名中的非法字符（`\ / : * ? " < > |`）会被自动替换为下划线

## 注意事项

- 仅供个人学习、备份与研究使用，请勿用于批量爬取、商用侵权或违反拼多多用户协议的用途
- 页面结构（如 `aria-label="商品大图"` / `aria-label="查看图片"` 等选择器）依赖拼多多当前前端实现，若拼多多页面改版，脚本可能需要同步调整
- 批量下载图片时请求间隔 300ms，避免请求过于密集
- loader 通过 `@require` 从远端加载并执行代码，本质上是信任 `myskux-labs/pdd-collector@main` 这个仓库的内容；仅从可信来源安装 loader，如果 fork 或自建 CDN 源，请确认 `@require` 地址指向自己可控的地址

## License

[MIT](LICENSE)
