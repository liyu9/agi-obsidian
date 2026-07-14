const puppeteer = require('puppeteer');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { validateFile } = require('./validate-lib');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

function sanitizeDirName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').trim();
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    var mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 10000 }, res => {
      if (res.statusCode >= 300 && res.headers.location) {
        httpGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function findPort() {
  for (const port of [9222, 9223, 9224]) {
    try { await httpGet('http://localhost:' + port + '/json/version'); return port; } catch {}
  }
  return null;
}

function download(url, filepath, retries) {
  retries = retries || 1;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.headers.location) {
        download(res.headers.location, filepath, retries).then(resolve).catch(reject);
        return;
      }
      const file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve({ ok: true, url: url }); });
    }).on('error', e => {
      if (retries > 0) {
        download(url, filepath, retries - 1).then(resolve).catch(reject);
      } else {
        fs.unlink(filepath, () => {});
        reject(e);
      }
    });
  });
}

function downloadParallel(tasks, concurrency) {
  concurrency = concurrency || 5;
  if (tasks.length === 0) return Promise.resolve([]);
  var idx = 0;
  var completed = 0;
  var results = [];
  return new Promise(resolve => {
    function next() {
      if (idx >= tasks.length) return;
      var i = idx++;
      var task = tasks[i];
      task.fn().then(r => {
        results[i] = r;
        completed++;
        if (completed === tasks.length) resolve(results);
        else next();
      }).catch(e => {
        results[i] = { ok: false, error: e.message };
        completed++;
        if (completed === tasks.length) resolve(results);
        else next();
      });
    }
    for (var c = 0; c < Math.min(concurrency, tasks.length); c++) next();
  });
}

function extractInBrowser(bt) {
  function processEl(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toUpperCase();
    var slateType = node.getAttribute ? node.getAttribute('data-slate-type') : null;
    var content = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      content += processEl(node.childNodes[i]);
    }
    if (slateType === 'bold') return '**' + content + '**';
    if (slateType === 'code') return bt + content + bt;
    if (slateType === 'mark-class') return content;
    if (tag === 'STRONG' || tag === 'B') return '**' + content + '**';
    if (tag === 'CODE') return bt + content + bt;
    if (tag === 'EM' || tag === 'I') return '_' + content + '_';
    if (tag === 'A') return '[' + content + '](' + (node.getAttribute('href') || '') + ')';
    if (tag === 'BR') return '\n';
    return content;
  }

  function h2m(html) {
    if (!html) return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    return processEl(div).trim();
  }

  function extractCode(block) {
    var lines = [];
    var codeLines = block.querySelectorAll('[data-slate-type="code-line"]');
    for (var i = 0; i < codeLines.length; i++) {
      var clone = codeLines[i].cloneNode(true);
      var lineNums = clone.querySelectorAll('[data-code-line-number]');
      for (var j = 0; j < lineNums.length; j++) lineNums[j].remove();
      var t = clone.textContent || '';
      if (t) lines.push(t);
    }
    if (lines.length === 0) lines.push(block.textContent || '');
    return lines.join('\n');
  }

  function extractList(block) {
    var items = [];
    var lines = block.querySelectorAll('[data-slate-type="list-line"]');
    if (lines.length > 0) {
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].querySelector('[data-code-line-number]')) continue;
        var t = h2m(lines[i].innerHTML);
        if (t) items.push(t);
      }
    }
    return items;
  }

  var content = document.querySelector('[class*="articleContent"]');
  if (!content) return JSON.stringify({error:'no content'});
  if (content.innerText.includes('仅可试看部分内容') && content.innerText.length < 1000) return JSON.stringify({error:'paywall'});

  var allBlocks = content.querySelectorAll('[data-slate-object="block"]');
  var consumed = {};
  var result = [], images = [], seen = {};

  var headImg = content.querySelector('img[class*="headImg"]');
  if (headImg && headImg.src) result.push({type:'image',src:headImg.src,alt:'头图',isHead:true});

  for (var i = 0; i < allBlocks.length; i++) {
    if (consumed[i]) continue;
    var block = allBlocks[i];
    var t = block.getAttribute('data-slate-type');
    for (var j = i + 1; j < allBlocks.length; j++) {
      if (block.contains(allBlocks[j])) { consumed[j] = true; } else { break; }
    }
    if (t === 'heading') {
      var text = h2m(block.innerHTML);
      if (text) result.push({type:'heading',level:block.tagName,text:text});
    } else if (t === 'paragraph') {
      var text = h2m(block.innerHTML);
      if (text) result.push({type:'paragraph',text:text});
    } else if (t === 'pre') {
      var code = extractCode(block);
      if (code) result.push({type:'code',text:code});
    } else if (t === 'blockquote' || t === 'block-quote') {
      var text = h2m(block.innerHTML);
      if (text) result.push({type:'blockquote',text:text});
    } else if (t === 'list') {
      var items = extractList(block);
      if (items.length > 0) result.push({type:'list',items:items});
      else {
        var text = h2m(block.innerHTML);
        if (text) result.push({type:'paragraph',text:text});
      }
    } else if (t === 'image') {
      var img = block.querySelector('img');
      if (img && img.src && !seen[img.src]) {
        seen[img.src] = true;
        images.push({src:img.src,alt:img.alt||''});
        result.push({type:'image',src:img.src,alt:img.alt||''});
      }
    }
  }

  var allImgs = content.querySelectorAll('img');
  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i];
    if (img.naturalWidth > 100 && !seen[img.src]) {
      seen[img.src] = true;
      images.push({src:img.src,alt:img.alt||''});
    }
  }

  var title = (document.querySelector('h1') && document.querySelector('h1').textContent || '').trim();
  return JSON.stringify({title:title,blocks:result,images:images,totalBlocks:allBlocks.length,textLength:content.innerText.length});
}

function extractInBrowserCourseDetail(bt) {
  function processEl(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toUpperCase();
    var content = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      content += processEl(node.childNodes[i]);
    }
    if (tag === 'STRONG' || tag === 'B') return '**' + content + '**';
    if (tag === 'CODE') return bt + content + bt;
    if (tag === 'EM' || tag === 'I') return '_' + content + '_';
    if (tag === 'A') return '[' + content + '](' + (node.getAttribute('href') || '') + ')';
    if (tag === 'BR') return '\n';
    if (tag === 'SPAN') return content;
    if (tag === 'P' || tag === 'DIV') return content + '\n\n';
    return content;
  }

  function h2m(html) {
    if (!html) return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    return processEl(div).trim();
  }

  var content = document.querySelector('._typo_y8ker_16._content_1a0p0_25') ||
                document.querySelector('[class*="_content_"]') ||
                document.querySelector('[class*="articleContent"]');
  if (!content) return JSON.stringify({error:'no content'});
  if (content.innerText.includes('仅可试看部分内容') && content.innerText.length < 1000) return JSON.stringify({error:'paywall'});

  var result = [], images = [], seen = {};

  for (var i = 0; i < content.children.length; i++) {
    var el = content.children[i];
    var tag = el.tagName.toUpperCase();

    if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4') {
      var text = h2m(el.innerHTML);
      if (text) result.push({type:'heading', level: tag, text: text});
    } else if (tag === 'P') {
      var imgs = el.querySelectorAll('img');
      if (imgs.length > 0) {
        for (var j = 0; j < imgs.length; j++) {
          var img = imgs[j];
          if (img.src && !seen[img.src]) {
            seen[img.src] = true;
            images.push({src: img.src, alt: img.alt || ''});
            result.push({type:'image', src: img.src, alt: img.alt || ''});
          }
        }
      }
      var text = h2m(el.innerHTML);
      if (text) result.push({type:'paragraph', text: text});
    } else if (tag === 'BLOCKQUOTE') {
      var text = h2m(el.innerHTML);
      if (text) result.push({type:'blockquote', text: text});
    } else if (tag === 'UL' || tag === 'OL') {
      var items = [];
      var lis = el.querySelectorAll('li');
      for (var j = 0; j < lis.length; j++) {
        var t = h2m(lis[j].innerHTML);
        if (t) items.push(t);
      }
      if (items.length > 0) result.push({type:'list', items: items});
    } else if (tag === 'PRE') {
      var code = el.innerText || el.textContent || '';
      if (code) {
        var lines = code.split('\n');
        var clean = [];
        for (var li = 0; li < lines.length; li++) {
          var l = lines[li].replace(/\t/g, '').trim();
          if (l) clean.push(l);
        }
        code = clean.join('\n');
        if (code) result.push({type:'code', text: code});
      }
    } else if (tag === 'DIV') {
      var imgs = el.querySelectorAll('img');
      for (var j = 0; j < imgs.length; j++) {
        var img = imgs[j];
        if (img.src && !seen[img.src]) {
          seen[img.src] = true;
          images.push({src: img.src, alt: img.alt || ''});
          result.push({type:'image', src: img.src, alt: img.alt || ''});
        }
      }
    } else if (tag === 'IMG') {
      if (el.src && !seen[el.src]) {
        seen[el.src] = true;
        images.push({src: el.src, alt: el.alt || ''});
        result.push({type:'image', src: el.src, alt: el.alt || ''});
      }
    }
  }

  var allImgs = content.querySelectorAll('img');
  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i];
    if (img.naturalWidth > 100 && !seen[img.src]) {
      seen[img.src] = true;
      images.push({src:img.src,alt:img.alt||''});
    }
  }

  var title = '';
  var h1 = document.querySelector('h1');
  if (h1 && h1.textContent.trim()) {
    title = h1.textContent.trim();
  } else {
    var dt = document.title || '';
    var idx = dt.lastIndexOf('-');
    title = idx > 0 ? dt.slice(0, idx).trim() : dt;
  }
  return JSON.stringify({title:title,blocks:result,images:images,totalBlocks:content.children.length,textLength:content.innerText.length});
}

var COURSE_INFO_JS = `(() => {
  var el = document.querySelector('[class*="columnTitle"]') ||
           document.querySelector('[class*="courseTitle"]') ||
           document.querySelector('[class*="course-name"]') ||
           document.querySelector('[class*="column-name"]');
  if (el) return JSON.stringify({courseName: el.textContent.trim()});
  var breadcrumb = document.querySelectorAll('[class*="breadcrumb"] a, [class*="Breadcrumb"] a');
  for (var i = 0; i < breadcrumb.length; i++) {
    var t = breadcrumb[i].textContent.trim();
    if (t && t.length > 1 && t.length < 50) return JSON.stringify({courseName: t});
  }
  return JSON.stringify({courseName: ''});
})()`;

async function detectCourseDir(articleId, saveBaseDir, browser) {
  var pages = await browser.pages();
  var page = null;
  for (var i = 0; i < pages.length; i++) {
    var u = pages[i].url();
    if (u.includes('geekbang.org/column/article/' + articleId) || u.includes('geekbang.org/column/article/' + articleId)) {
      page = pages[i];
      break;
    }
  }
  if (!page) {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].url().includes('geekbang.org')) { page = pages[i]; break; }
    }
    if (!page) return saveBaseDir;
    await page.goto('https://time.geekbang.org/column/article/' + articleId, { waitUntil: 'networkidle2', timeout: 30000 });
  }
  await page.waitForSelector('[data-slate-object="block"]', { timeout: 10000 }).catch(() => {});

  var courseName = '';
  try {
    var info = await page.evaluate(COURSE_INFO_JS);
    var data = JSON.parse(info);
    courseName = data.courseName || '';
  } catch (e) {}

  if (!courseName) {
    try {
      var apiResult = await page.evaluate(async (aid) => {
        var res = await fetch('https://time.geekbang.org/serv/v1/article', {
          method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
          body: JSON.stringify({id: aid, include_neighbors: true, is_freely: false})
        });
        var d = await res.json();
        return {sku: (d.data||{}).sku, title: (d.data||{}).article_title};
      }, parseInt(articleId));
      if (apiResult.sku) {
        var listRes = await page.evaluate(async (sku) => {
          var res = await fetch('https://time.geekbang.org/serv/v1/column/articles', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
            body: JSON.stringify({cid: sku, order: 'earliest', need_detail: false})
          });
          return await res.json();
        }, apiResult.sku);
        if (listRes.data && listRes.data.list && listRes.data.list.length > 0) {
          var colInfo = listRes.data.list[0];
          if (colInfo.column_title) courseName = colInfo.column_title;
        }
      }
    } catch (e) {}
  }

  if (!courseName) return saveBaseDir;

  var dirName = '极客时间-' + courseName;
  var courseDir = path.join(saveBaseDir, dirName);
  fs.mkdirSync(courseDir, { recursive: true });
  console.log('Course dir: ' + courseDir);
  return courseDir;
}

var INIT_EXTRACT_JS = `(() => {
  var title = document.querySelector('h1');
  var courseName = title ? title.textContent.trim() : '';
  var items = document.querySelectorAll('[class*="columnArticleItem"]');
  if (items.length === 0) items = document.querySelectorAll('a[href*="/column/article/"]');
  var articles = [];
  var seen = {};
  for (var i = 0; i < items.length; i++) {
    var link = items[i].tagName === 'A' ? items[i] : items[i].querySelector('a[href*="/column/article/"]');
    if (!link) continue;
    var href = link.getAttribute('href') || '';
    var m = href.match(/\\/column\\/article\\/(\\d+)/);
    if (!m) continue;
    var id = m[1];
    if (seen[id]) continue;
    seen[id] = true;
    var titleEl = link.querySelector('[class*="title"]') || link;
    articles.push({id: id, title: titleEl.textContent.trim()});
  }
  return JSON.stringify({courseName: courseName, articles: articles});
})()`;

function generateMd(raw, imageMap) {
  var blocks = raw.blocks;
  var md = '';
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (block.type === 'heading') {
      var l = block.level === 'H1' ? '# ' : block.level === 'H2' ? '## ' : '### ';
      md += l + block.text + '\n\n';
    } else if (block.type === 'paragraph') {
      md += block.text + '\n\n';
    } else if (block.type === 'list') {
      for (var j = 0; j < block.items.length; j++) md += '- ' + block.items[j] + '\n';
      md += '\n';
    } else if (block.type === 'image') {
      var local = imageMap[block.src] || block.src;
      md += '![' + (block.alt||'') + '](' + local + ')\n\n';
    } else if (block.type === 'code') {
      var fence = block.text.indexOf('```') >= 0 ? '~~~' : '```';
      md += fence + '\n' + block.text + '\n' + fence + '\n\n';
    } else if (block.type === 'blockquote') {
      var lines = block.text.split('\n');
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
      var collapsed = [], prevEmpty = false;
      for (var j = 0; j < lines.length; j++) {
        if (lines[j] === '') { if (!prevEmpty) { collapsed.push(''); prevEmpty = true; } }
        else { collapsed.push(lines[j]); prevEmpty = false; }
      }
      for (var j = 0; j < collapsed.length; j++) md += '> ' + collapsed[j] + '\n';
      md += '\n';
    }
  }
  return md;
}

function buildImageMap(raw, assetsDir) {
  var imageMap = {};
  if (raw.imageFiles) {
    for (var url in raw.imageFiles) {
      imageMap[url] = raw.imageFiles[url];
    }
    return imageMap;
  }
  var files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
  var imageFiles = files.filter(function(f) { return f.match(/^\d{8}-\d+-\d{2}-.+\.(png|jpg|jpeg|gif|webp)$/i); });
  if (raw.images && imageFiles.length > 0) {
    for (var idx = 0; idx < raw.images.length && idx < imageFiles.length; idx++) {
      imageMap[raw.images[idx].src] = 'assets/' + imageFiles[idx];
    }
  }
  return imageMap;
}

function saveMd(raw, imageMap, saveDir, articleId) {
  var mdBody = generateMd(raw, imageMap);
  var today = new Date().toISOString().slice(0, 10);
  var md = '# ' + raw.title + '\n\n' + mdBody + '---\n来源：极客时间\n链接：https://time.geekbang.org/column/article/' + articleId + '\n日期：' + today + '\n';
  var mdFile = path.join(saveDir, sanitizeFileName(raw.title) + '.md');
  fs.writeFileSync(mdFile, md, 'utf8');
  return mdFile;
}

function updateProgress(saveBaseDir, articleId, status, info) {
  var progressFile = path.join(saveBaseDir, 'extraction-progress.md');
  var content = '';
  if (fs.existsSync(progressFile)) {
    content = fs.readFileSync(progressFile, 'utf8');
  }
  var lines = content.split('\n');
  var found = false;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(articleId) >= 0 && lines[i].indexOf('|') >= 0) {
      var parts = lines[i].split('|');
      if (parts.length >= 5) {
        parts[3] = ' ' + status + ' ';
        parts[4] = ' ' + (info || '') + ' ';
        lines[i] = parts.join('|');
        found = true;
      }
      break;
    }
  }
  fs.writeFileSync(progressFile, lines.join('\n'), 'utf8');
}

async function doInit(saveBaseDir, port) {
  var versionInfo = JSON.parse(await httpGet('http://localhost:' + port + '/json/version'));
  var browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: null });
  var pages = await browser.pages();
  var page = null;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].url().includes('geekbang.org/column/intro/')) {
      page = pages[i];
      break;
    }
  }
  if (!page) {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].url().includes('geekbang.org/column/')) {
        page = pages[i];
        break;
      }
    }
  }
  if (!page) {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].url().includes('geekbang.org')) { page = pages[i]; break; }
    }
  }
  if (!page) {
    console.error('No geekbang.org page found');
    await browser.disconnect();
    process.exit(1);
  }

  var rawJson = await page.evaluate(INIT_EXTRACT_JS);
  var data = JSON.parse(rawJson);
  if (!data.articles || data.articles.length === 0) {
    console.error('No articles found. Make sure the course directory page is open.');
    await browser.disconnect();
    process.exit(1);
  }

  console.log('Course: ' + data.courseName);
  console.log('Articles: ' + data.articles.length);

  fs.mkdirSync(saveBaseDir, { recursive: true });

  var dirIndex = 0;
  var progressLines = ['# 提取进度', '', '| # | ID | 标题 | 状态 | 校验 |', '|---|---|---|---|---|'];

  for (var i = 0; i < data.articles.length; i++) {
    var article = data.articles[i];
    var prefix = String(dirIndex).padStart(2, '0');
    var dirName = prefix + '-' + sanitizeDirName(article.title);
    if (dirIndex === 0 && (article.title.indexOf('开篇') >= 0 || article.title.indexOf('导读') >= 0)) {
      dirName = '00-开篇词';
    }
    var articleDir = path.join(saveBaseDir, dirName);
    fs.mkdirSync(path.join(articleDir, 'assets'), { recursive: true });
    article._dirName = dirName;
    article._dir = articleDir;
    dirIndex++;
    progressLines.push('| ' + (i + 1) + ' | ' + article.id + ' | ' + article.title + ' | ⬜ 待提取 | |');
  }

  var listFile = path.join(saveBaseDir, 'article-list.json');
  var listData = data.articles.map(function(a) {
    return { id: a.id, title: a.title, dirName: a._dirName, dir: a._dir };
  });
  fs.writeFileSync(listFile, JSON.stringify(listData, null, 2), 'utf8');
  console.log('Saved: ' + listFile);

  var progressFile = path.join(saveBaseDir, 'extraction-progress.md');
  fs.writeFileSync(progressFile, progressLines.join('\n') + '\n', 'utf8');
  console.log('Saved: ' + progressFile);

  var courseInfo = '# ' + data.courseName + '\n\n';
  courseInfo += '> 来源：极客时间\n';
  courseInfo += '> 文章数：' + data.articles.length + '\n';
  courseInfo += '> 提取日期：' + new Date().toISOString().slice(0, 10) + '\n\n';
  courseInfo += '## 目录\n\n';
  for (var i = 0; i < data.articles.length; i++) {
    var a = data.articles[i];
    courseInfo += (i + 1) + '. [' + a.title + '](' + a._dirName + '/' + sanitizeFileName(a.title) + '.md)\n';
  }
  var courseFile = path.join(saveBaseDir, 'course-info.md');
  fs.writeFileSync(courseFile, courseInfo, 'utf8');
  console.log('Saved: ' + courseFile);

  console.log('Directories created: ' + data.articles.length);
  await browser.disconnect();
}

async function doExtractSingle(articleId, saveDir, browser) {
  var assetsDir = path.join(saveDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  var rawFile = path.join(assetsDir, 'article-raw.json');

  var pages = await browser.pages();
  var page = null;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].url().includes(articleId)) { page = pages[i]; break; }
  }
  if (!page) {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].url().includes('geekbang.org')) { page = pages[i]; break; }
    }
    if (!page) {
      return { ok: false, error: 'Page not found and no geekbang tab to navigate: ' + articleId, id: articleId };
    }
    console.log('  Navigating to article ' + articleId + '...');
    await page.goto('https://time.geekbang.org/column/article/' + articleId, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  var pageUrl = page.url();
  var isCourseDetail = pageUrl.indexOf('course/detail/') >= 0;
  
  if (isCourseDetail) {
    await page.waitForSelector('._typo_y8ker_16', { timeout: 10000 }).catch(() => {});
    console.log('Extracting (course detail): ' + articleId);
    var rawJson = await page.evaluate(extractInBrowserCourseDetail, '`');
  } else {
    await page.waitForSelector('[data-slate-object="block"]', { timeout: 10000 }).catch(() => {});
    console.log('Extracting: ' + articleId);
    var rawJson = await page.evaluate(extractInBrowser, '`');
  }
  
  var raw = JSON.parse(rawJson);
  if (raw.error) {
    return { ok: false, error: raw.error, id: articleId };
  }
  console.log('  Blocks: ' + raw.blocks.length + ', Images: ' + raw.images.length + ', Chars: ' + raw.textLength);

  var datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  var imageMap = {};

  var downloadTasks = [];
  for (var i = 0; i < raw.images.length; i++) {
    (function(img, idx) {
      var ext = (img.src.match(/\.(png|jpg|jpeg|gif|webp)/i) || ['png'])[0].replace(/^\./, '');
      var desc = img.alt || (idx === 0 ? '头图' : '图片' + idx);
      var filename = datePrefix + '-' + articleId + '-' + String(idx + 1).padStart(2, '0') + '-' + desc + '.' + ext;
      var filepath = path.join(assetsDir, filename);
      var localPath = 'assets/' + filename;
      downloadTasks.push({
        fn: function() { return download(img.src, filepath, 1).then(function() { return { ok: true, url: img.src, local: localPath }; }); },
        url: img.src,
        local: localPath
      });
    })(raw.images[i], i);
  }

  var dlResults = await downloadParallel(downloadTasks, 5);
  for (var i = 0; i < dlResults.length; i++) {
    var r = dlResults[i];
    if (r.ok && r.url) {
      imageMap[r.url] = r.local;
      console.log('  OK: ' + r.local);
    } else {
      var task = downloadTasks[i];
      imageMap[task.url] = task.url;
      console.error('  FAIL: ' + task.local + (r.error ? ' - ' + r.error : ''));
    }
  }

  raw.imageFiles = imageMap;
  fs.writeFileSync(rawFile, JSON.stringify(raw, null, 2), 'utf8');
  console.log('  Cached: ' + rawFile);

  var mdFile = saveMd(raw, imageMap, saveDir, articleId);
  console.log('  Saved: ' + mdFile + ' (' + fs.readFileSync(mdFile, 'utf8').length + ' chars)');

  var vResult = validateFile(mdFile);
  if (!vResult.pass) {
    console.log('  ❌ 校验失败 (' + vResult.errors + ' FAIL): ' + vResult.fails.join('; '));
    return { ok: true, id: articleId, validated: false, fails: vResult.fails };
  } else {
    console.log('  ✅ 校验通过' + (vResult.warnings > 0 ? ' (' + vResult.warnings + ' WARN)' : ''));
    return { ok: true, id: articleId, validated: true, warnings: vResult.warnings };
  }
}

async function doRegen(articleId, saveDir) {
  var assetsDir = path.join(saveDir, 'assets');
  var rawFile = path.join(assetsDir, 'article-raw.json');
  if (!fs.existsSync(rawFile)) {
    console.error('No cached data: ' + rawFile);
    process.exit(1);
  }
  console.log('Regenerating from cache: ' + rawFile);
  var raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));

  var imageMap = buildImageMap(raw, assetsDir);
  var mdFile = saveMd(raw, imageMap, saveDir, articleId);
  console.log('  Saved: ' + mdFile + ' (' + fs.readFileSync(mdFile, 'utf8').length + ' chars)');

  var vResult = validateFile(mdFile);
  if (!vResult.pass) {
    console.log('  ❌ 校验失败 (' + vResult.errors + ' FAIL): ' + vResult.fails.join('; '));
    process.exit(1);
  } else {
    console.log('  ✅ 校验通过' + (vResult.warnings > 0 ? ' (' + vResult.warnings + ' WARN)' : ''));
  }
}

async function doBatch(listFile, saveBaseDir, port) {
  if (!fs.existsSync(listFile)) {
    console.error('List file not found: ' + listFile);
    process.exit(1);
  }
  var articles = JSON.parse(fs.readFileSync(listFile, 'utf8'));
  console.log('Batch mode: ' + articles.length + ' articles');

  var versionInfo = JSON.parse(await httpGet('http://localhost:' + port + '/json/version'));
  var browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: null });

  var results = { ok: 0, fail: 0, validated: 0, failedArticles: [] };

  for (var i = 0; i < articles.length; i++) {
    var article = articles[i];
    var saveDir = article.dir || path.join(saveBaseDir, article.dirName);
    console.log('\n[' + (i + 1) + '/' + articles.length + '] ' + article.id + ' - ' + article.title);

    var mdExists = false;
    try {
      var files = fs.readdirSync(saveDir);
      for (var f of files) { if (f.endsWith('.md') && f.indexOf(article.id) >= 0) { mdExists = true; break; } }
    } catch (e) {}

    if (mdExists) {
      console.log('  SKIP: already extracted');
      results.ok++;
      updateProgress(saveBaseDir, article.id, '✅已存在', '跳过');
      continue;
    }

    try {
      var result = await doExtractSingle(article.id, saveDir, browser);
      if (result.ok) {
        results.ok++;
        if (result.validated) {
          results.validated++;
          updateProgress(saveBaseDir, article.id, '✅通过', '');
        } else {
          results.failedArticles.push({ id: article.id, reason: result.fails.join('; ') });
          updateProgress(saveBaseDir, article.id, '⚠️提取但校验失败', result.fails.join('; '));
        }
      } else {
        results.fail++;
        results.failedArticles.push({ id: article.id, reason: result.error });
        updateProgress(saveBaseDir, article.id, '❌失败', result.error);
      }
    } catch (e) {
      results.fail++;
      results.failedArticles.push({ id: article.id, reason: e.message });
      updateProgress(saveBaseDir, article.id, '❌异常', e.message);
      console.error('  ERROR: ' + e.message);
    }
  }

  await browser.disconnect();

  console.log('\n=== 批量提取完成 ===');
  console.log('成功: ' + results.ok + ', 校验通过: ' + results.validated + ', 失败: ' + results.fail);
  if (results.failedArticles.length > 0) {
    console.log('\n失败文章:');
    for (var i = 0; i < results.failedArticles.length; i++) {
      var fa = results.failedArticles[i];
      console.log('  ' + fa.id + ': ' + fa.reason);
    }
  }

  var reportFile = path.join(saveBaseDir, 'batch-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), 'utf8');
  console.log('Report: ' + reportFile);

  if (results.fail > 0) process.exit(1);
}

async function main() {
  var args = process.argv.slice(2);

  if (args[0] === '--init') {
    args.shift();
    var saveBaseDir = args[0];
    if (!saveBaseDir) { console.error('Usage: extract-full.js --init <saveBaseDir>'); process.exit(1); }
    var port = await findPort();
    if (!port) { console.error('Chrome debug port not found'); process.exit(1); }
    await doInit(saveBaseDir, port);
    return;
  }

  if (args[0] === '--batch') {
    args.shift();
    var listFile = args[0];
    var saveBaseDir = args[1];
    if (!listFile) { console.error('Usage: extract-full.js --batch <listFile> [saveBaseDir]'); process.exit(1); }
    if (!saveBaseDir) saveBaseDir = path.dirname(listFile);
    var port = await findPort();
    if (!port) { console.error('Chrome debug port not found'); process.exit(1); }
    await doBatch(listFile, saveBaseDir, port);
    return;
  }

  var REGEN = false;
  if (args[0] === '--regen') { REGEN = true; args.shift(); }
  var ARTICLE_ID = args[0];
  var SAVE_DIR = args[1];

  if (!ARTICLE_ID || !SAVE_DIR) {
    console.error('Usage: node extract-full.js [--regen] <articleId> <saveDir>');
    console.error('       node extract-full.js --init <saveBaseDir>');
    console.error('       node extract-full.js --batch <listFile> [saveBaseDir]');
    process.exit(1);
  }

  if (REGEN) {
    await doRegen(ARTICLE_ID, SAVE_DIR);
    return;
  }

  var port = await findPort();
  if (!port) { console.error('Chrome debug port not found'); process.exit(1); }

  var versionInfo = JSON.parse(await httpGet('http://localhost:' + port + '/json/version'));
  var browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: null });

  var courseDir = await detectCourseDir(ARTICLE_ID, SAVE_DIR, browser);
  var result = await doExtractSingle(ARTICLE_ID, courseDir, browser);
  await browser.disconnect();

  if (!result.ok) { console.error('ERROR: ' + result.error); process.exit(1); }
  if (!result.validated) process.exit(1);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
