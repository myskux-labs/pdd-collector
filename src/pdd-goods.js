// 拼多多商品采集业务逻辑
//
// 本文件由 Vite 构建为 dist/pdd-goods.js，通过 jsDelivr CDN 以 @require 的方式
// 提供给 loader/pdd-goods.user.js 加载执行。更新此文件后重新 build 并推送到仓库，
// Tampermonkey 会按其更新检查周期自动拉取最新内容，无需重新安装脚本。

import { Pane } from 'tweakpane';
import { zipSync } from 'fflate';

(function () {
  'use strict';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function isGoodsPage() {
    return /\/goods\d*\.html/i.test(location.pathname);
  }

  function safeFileName(name) {
    return String(name || 'pdd_goods')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 100);
  }

  function normalizeImageUrl(url) {
    if (!url) return '';

    const value = String(url).trim();

    if (value.startsWith('//')) {
      return `https:${value}`;
    }

    return value;
  }

  function getImageUrl(img) {
    return normalizeImageUrl(
      img.getAttribute('data-src') ||
      img.getAttribute('src') ||
      ''
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
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    return match ? match[1].toLowerCase() : 'jpg';
  }

  function collectTitle() {
    return (
      document.querySelector('.enable-select')?.innerText?.trim() ||
      document.querySelector('meta[property="og:title"]')?.content?.trim() ||
      document.title?.trim() ||
      'pdd_goods'
    );
  }

  function collectCarouselImages() {
    const images = [...document.querySelectorAll('img[aria-label="商品大图"]')]
      .map(getImageUrl);

    return unique(removeHeadTail(images));
  }

  function collectDetailImages() {
    const images = [...document.querySelectorAll('img[aria-label="查看图片"]')]
      .map(getImageUrl);

    return unique(removeHead(images));
  }

  async function collectGoods() {
    await sleep(800);

    return {
      url: location.href,
      goodsId: new URLSearchParams(location.search).get('goods_id') || '',
      title: collectTitle(),
      carouselImages: collectCarouselImages(),
      detailImages: collectDetailImages(),
    };
  }

  function getGoodsDir(result) {
    const title = safeFileName(result.title);
    return result.goodsId ? `${result.goodsId}_${title}` : title;
  }

  function buildMarkdown(result) {
    const lines = [];

    lines.push(`# ${result.title}`);
    lines.push('');
    lines.push(`商品链接：${result.url}`);
    lines.push(`商品 ID：${result.goodsId}`);
    lines.push('');
    lines.push(`## 轮播主图`);
    lines.push('');

    result.carouselImages.forEach((url, index) => {
      const filename = `轮播主图-${String(index + 1).padStart(2, '0')}.${getImageExt(url)}`;
      lines.push(`${index + 1}. ${filename}`);
      lines.push(`   ${url}`);
    });

    lines.push('');
    lines.push(`## 详情页图片`);
    lines.push('');

    result.detailImages.forEach((url, index) => {
      const filename = `详情页-${String(index + 1).padStart(2, '0')}.${getImageExt(url)}`;
      lines.push(`${index + 1}. ${filename}`);
      lines.push(`   ${url}`);
    });

    lines.push('');

    return lines.join('\n');
  }

  function downloadTextFile(content, filename) {
    const blob = new Blob([content], {
      type: 'text/markdown;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function fetchImageBuffer(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        onload: (res) => {
          if (res.status < 200 || res.status >= 300) {
            reject(new Error(`HTTP ${res.status}`));
            return;
          }

          resolve(new Uint8Array(res.response));
        },
        onerror: reject,
        ontimeout: reject,
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
        filename: `轮播主图-${String(index + 1).padStart(2, '0')}.${ext}`,
      });
    });

    result.detailImages.forEach((url, index) => {
      const ext = getImageExt(url);
      tasks.push({
        url,
        filename: `详情页-${String(index + 1).padStart(2, '0')}.${ext}`,
      });
    });

    const files = {};

    for (const task of tasks) {
      console.log('[PDD 打包图片]', task.filename, task.url);

      try {
        files[task.filename] = await fetchImageBuffer(task.url);
      } catch (err) {
        console.error('[PDD 图片获取失败]', task.filename, err);
      }

      await sleep(300);
    }

    if (Object.keys(files).length === 0) {
      throw new Error('没有可打包的图片');
    }

    const zipped = zipSync(files);
    const blob = new Blob([zipped], { type: 'application/zip' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      await new Promise((resolve, reject) => {
        GM_download({
          url: blobUrl,
          name: `${dir}.zip`,
          saveAs: false,
          onload: resolve,
          onerror: reject,
          ontimeout: reject,
        });
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async function copyJson(result) {
    const text = JSON.stringify(result, null, 2);

    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text);
      return;
    }

    await navigator.clipboard.writeText(text);
  }

  let pane = null;
  let downloadButton = null;
  let lastResult = null;

  const state = {
    status: '尚未识别',
    title: '',
    carouselCount: 0,
    detailCount: 0,
  };

  async function handleRecognize() {
    state.status = '识别中...';
    if (downloadButton) downloadButton.disabled = true;
    pane.refresh();

    try {
      const result = await collectGoods();
      lastResult = result;

      state.title = result.title;
      state.carouselCount = result.carouselImages.length;
      state.detailCount = result.detailImages.length;
      state.status = '识别完成';

      console.log('[PDD 商品采集结果]', result);
      await copyJson(result);

      if (downloadButton) {
        downloadButton.disabled = result.carouselImages.length + result.detailImages.length === 0;
      }
    } catch (err) {
      state.status = '识别失败';
      console.error('[PDD 识别失败]', err);
    } finally {
      pane.refresh();
    }
  }

  async function handleDownloadClick() {
    if (!lastResult) return;

    state.status = '打包下载中...';
    downloadButton.disabled = true;
    pane.refresh();

    try {
      await downloadImages(lastResult);
      state.status = '下载完成';
    } catch (err) {
      state.status = '下载失败';
      console.error('[PDD 下载失败]', err);
    } finally {
      downloadButton.disabled = false;
      pane.refresh();
    }
  }

  function destroyPane() {
    if (!pane) return;

    pane.dispose();
    pane = null;
    downloadButton = null;
  }

  function createPane() {
    if (!isGoodsPage()) {
      destroyPane();
      return;
    }

    if (pane) return;

    pane = new Pane({ title: 'PDD 采集工具' });
    pane.element.style.cssText = `
      position: fixed;
      top: 80px;
      right: 12px;
      z-index: 999999;
      width: 260px;
    `;

    pane.addBinding(state, 'status', { label: '状态', readonly: true });
    pane.addBinding(state, 'title', { label: '标题', readonly: true });
    pane.addBinding(state, 'carouselCount', { label: '轮播主图', readonly: true });
    pane.addBinding(state, 'detailCount', { label: '详情页图片', readonly: true });

    pane.addButton({ title: '识别' }).on('click', handleRecognize);

    downloadButton = pane.addButton({ title: '下载' });
    downloadButton.disabled = true;
    downloadButton.on('click', handleDownloadClick);
  }

  function init() {
    createPane();
  }

  init();

  window.addEventListener('urlchange', init);
  window.addEventListener('popstate', init);

  const rawPushState = history.pushState;
  history.pushState = function (...args) {
    rawPushState.apply(this, args);
    init();
  };

  const rawReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    rawReplaceState.apply(this, args);
    init();
  };

  window.__collectPddGoods = collectGoods;
})();
