# pdd-collector

一个 Tampermonkey（篡改猴）用户脚本，用于在拼多多（拼多多 App 内嵌页 / mobile.pinduoduo.com、mobile.yangkeduo.com）商品详情页一键采集商品标题、轮播主图、详情页图片，并批量下载到本地。

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
2. 新建用户脚本，将 [pdd-goods.js](pdd-goods.js) 的内容粘贴进去并保存
3. 打开拼多多商品详情页（如 `https://mobile.pinduoduo.com/goods.html?goods_id=xxx`），确认脚本已生效

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

## 技术说明

- `@match` 匹配 `mobile.yangkeduo.com` 与 `mobile.pinduoduo.com` 的所有页面，仅在商品详情页（URL 匹配 `/goods\d*\.html/`）显示下载按钮
- 依赖 `GM_download` 权限执行图片下载，依赖 `GM_setClipboard` 权限复制采集结果（不支持时回退到 `navigator.clipboard`）
- 图片扩展名根据图片 URL 自动识别（jpg/jpeg/png/webp/gif），无法识别时默认使用 `jpg`
- 文件名中的非法字符（`\ / : * ? " < > |`）会被自动替换为下划线

## 注意事项

- 仅供个人学习、备份与研究使用，请勿用于批量爬取、商用侵权或违反拼多多用户协议的用途
- 页面结构（如 `aria-label="商品大图"` / `aria-label="查看图片"` 等选择器）依赖拼多多当前前端实现，若拼多多页面改版，脚本可能需要同步调整
- 批量下载图片时请求间隔 300ms，避免请求过于密集

## License

[MIT](LICENSE)
