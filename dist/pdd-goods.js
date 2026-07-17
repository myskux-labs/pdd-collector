(function() {
  "use strict";
  (function() {
    const BUTTON_ID = "pdd-goods-download-button";
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    function isGoodsPage() {
      return /\/goods\d*\.html/i.test(location.pathname);
    }
    function safeFileName(name) {
      return String(name || "pdd_goods").trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").slice(0, 100);
    }
    function normalizeImageUrl(url) {
      if (!url) return "";
      const value = String(url).trim();
      if (value.startsWith("//")) {
        return `https:${value}`;
      }
      return value;
    }
    function getImageUrl(img) {
      return normalizeImageUrl(
        img.getAttribute("data-src") || img.getAttribute("src") || ""
      );
    }
    function unique(list) {
      return [...new Set(list.filter(Boolean))];
    }
    function removeHeadTail(list) {
      if (list.length <= 2) return list;
      return list.slice(1, -1);
    }
    function removeHead(list) {
      return list.slice(1);
    }
    function getImageExt(url) {
      const cleanUrl = url.split("?")[0];
      const match = cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i);
      return match ? match[1].toLowerCase() : "jpg";
    }
    function collectTitle() {
      var _a, _b, _c, _d, _e;
      return ((_b = (_a = document.querySelector(".enable-select")) == null ? void 0 : _a.innerText) == null ? void 0 : _b.trim()) || ((_d = (_c = document.querySelector('meta[property="og:title"]')) == null ? void 0 : _c.content) == null ? void 0 : _d.trim()) || ((_e = document.title) == null ? void 0 : _e.trim()) || "pdd_goods";
    }
    function collectCarouselImages() {
      const images = [...document.querySelectorAll('img[aria-label="商品大图"]')].map(getImageUrl);
      return unique(removeHeadTail(images));
    }
    function collectDetailImages() {
      const images = [...document.querySelectorAll('img[aria-label="查看图片"]')].map(getImageUrl);
      return unique(removeHead(images));
    }
    async function collectGoods() {
      await sleep(800);
      return {
        url: location.href,
        goodsId: new URLSearchParams(location.search).get("goods_id") || "",
        title: collectTitle(),
        carouselImages: collectCarouselImages(),
        detailImages: collectDetailImages()
      };
    }
    function getGoodsDir(result) {
      const title = safeFileName(result.title);
      return result.goodsId ? `${result.goodsId}_${title}` : title;
    }
    function buildMarkdown(result) {
      const lines = [];
      lines.push(`# ${result.title}`);
      lines.push("");
      lines.push(`商品链接：${result.url}`);
      lines.push(`商品 ID：${result.goodsId}`);
      lines.push("");
      lines.push(`## 轮播主图`);
      lines.push("");
      result.carouselImages.forEach((url, index) => {
        const filename = `轮播主图-${String(index + 1).padStart(2, "0")}.${getImageExt(url)}`;
        lines.push(`${index + 1}. ${filename}`);
        lines.push(`   ${url}`);
      });
      lines.push("");
      lines.push(`## 详情页图片`);
      lines.push("");
      result.detailImages.forEach((url, index) => {
        const filename = `详情页-${String(index + 1).padStart(2, "0")}.${getImageExt(url)}`;
        lines.push(`${index + 1}. ${filename}`);
        lines.push(`   ${url}`);
      });
      lines.push("");
      return lines.join("\n");
    }
    function downloadImage(url, filename) {
      return new Promise((resolve, reject) => {
        GM_download({
          url,
          name: filename,
          saveAs: false,
          onload: resolve,
          onerror: reject,
          ontimeout: reject
        });
      });
    }
    async function downloadImages(result) {
      const dir = getGoodsDir(result);
      const tasks = [];
      result.carouselImages.forEach((url, index) => {
        const ext = getImageExt(url);
        tasks.push({
          url,
          filename: `${dir}/轮播主图-${String(index + 1).padStart(2, "0")}.${ext}`
        });
      });
      result.detailImages.forEach((url, index) => {
        const ext = getImageExt(url);
        tasks.push({
          url,
          filename: `${dir}/详情页-${String(index + 1).padStart(2, "0")}.${ext}`
        });
      });
      for (const task of tasks) {
        console.log("[PDD 下载图片]", task.filename, task.url);
        try {
          await downloadImage(task.url, task.filename);
        } catch (err) {
          console.error("[PDD 下载失败]", task.filename, err);
        }
        await sleep(300);
      }
    }
    async function copyJson(result) {
      const text = JSON.stringify(result, null, 2);
      if (typeof GM_setClipboard === "function") {
        GM_setClipboard(text);
        return;
      }
      await navigator.clipboard.writeText(text);
    }
    async function handleDownload() {
      const result = await collectGoods();
      getGoodsDir(result);
      buildMarkdown(result);
      console.log("[PDD 商品采集结果]", result);
      await copyJson(result);
      const total = result.carouselImages.length + result.detailImages.length;
      const ok = confirm([
        "标题.md 已下载到商品目录，采集结果已复制到剪贴板",
        "",
        `标题：${result.title}`,
        `轮播主图：${result.carouselImages.length} 张`,
        `详情页图片：${result.detailImages.length} 张`,
        "",
        `是否开始批量下载 ${total} 张图片？`
      ].join("\n"));
      if (!ok) return;
      await downloadImages(result);
    }
    function removeButton() {
      var _a;
      (_a = document.getElementById(BUTTON_ID)) == null ? void 0 : _a.remove();
    }
    function createButton() {
      if (!isGoodsPage()) {
        removeButton();
        return;
      }
      if (document.getElementById(BUTTON_ID)) return;
      const button = document.createElement("button");
      button.id = BUTTON_ID;
      button.textContent = "下载商品";
      button.style.cssText = `
      position: fixed;
      right: 12px;
      top: 80px;
      z-index: 999999;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      background: #e02e24;
      color: #fff;
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .16);
    `;
      button.addEventListener("click", handleDownload);
      document.body.appendChild(button);
    }
    function init() {
      createButton();
    }
    init();
    window.addEventListener("urlchange", init);
    window.addEventListener("popstate", init);
    const rawPushState = history.pushState;
    history.pushState = function(...args) {
      rawPushState.apply(this, args);
      init();
    };
    const rawReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      rawReplaceState.apply(this, args);
      init();
    };
    window.__collectPddGoods = collectGoods;
  })();
})();
