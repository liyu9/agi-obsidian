const fs = require('fs');
const path = require('path');
const cdp = require('./cdp-utils');

function sanitizeDirName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').trim();
}
function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

var INIT_FROM_DIRECTORY_JS = `(() => {
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
  return JSON.stringify({courseName: courseName, articles: articles, source: 'directory'});
})()`;

var INIT_FROM_TABS_JS = `(() => {
  var articles = [];
  var seen = {};
  var m = document.title.match(/^(.+?)\\s*[-|·]\\s*/);
  var articleTitle = m ? m[1].trim() : document.title.trim();
  var urlMatch = location.href.match(/\\/column\\/article\\/(\\d+)/);
  var id = urlMatch ? urlMatch[1] : null;
  if (id && !seen[id]) {
    seen[id] = true;
    articles.push({id: id, title: articleTitle});
  }
  return JSON.stringify({articles: articles, source: 'tab'});
})()`;

async function initFromDirectory(port, saveBaseDir) {
  var tabs = await cdp.getTabs(port);
  var dirTab = null;
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].url && tabs[i].url.indexOf('geekbang.org/column/') >= 0) {
      dirTab = tabs[i];
      break;
    }
  }
  if (!dirTab) return null;

  console.log('Found directory page: ' + dirTab.title);
  await cdp.scrollToBottom(dirTab.webSocketDebuggerUrl);
  await cdp.scrollToBottom(dirTab.webSocketDebuggerUrl);

  var rawJson = await cdp.evalInPage(dirTab.webSocketDebuggerUrl, INIT_FROM_DIRECTORY_JS);
  var data = JSON.parse(rawJson);
  if (!data.articles || data.articles.length === 0) return null;
  return data;
}

async function initFromTabs(port) {
  var tabs = await cdp.getTabs(port);
  var articles = [];
  var seen = {};
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    if (!tab.url || tab.url.indexOf('geekbang.org/column/article/') < 0) continue;
    var m = tab.url.match(/\/column\/article\/(\d+)/);
    if (!m) continue;
    var id = m[1];
    if (seen[id]) continue;
    seen[id] = true;
    var tabTitle = tab.title || '';
    var tm = tabTitle.match(/^(.+?)\s*[-|·]\s*/);
    var articleTitle = tm ? tm[1].trim() : tabTitle.trim();
    articles.push({id: id, title: articleTitle});
  }
  return articles;
}

async function main() {
  var args = process.argv.slice(2);
  var saveBaseDir = args[0];
  if (!saveBaseDir) {
    console.error('Usage: node init-course.js "<saveBaseDir>"');
    process.exit(1);
  }

  var port = await cdp.findPort();
  if (!port) {
    console.error('Chrome debug port not found');
    process.exit(1);
  }

  var data = await initFromDirectory(port, saveBaseDir);
  var source = 'directory';

  if (!data) {
    console.log('No directory page found, scanning article tabs...');
    var articles = await initFromTabs(port);
    if (!articles || articles.length === 0) {
      console.error('No geekbang.org article tabs found. Open the course directory page or article pages in Chrome.');
      process.exit(1);
    }
    data = { courseName: '未命名课程', articles: articles };
    source = 'tabs';
  }

  console.log('Course: ' + data.courseName);
  console.log('Articles: ' + data.articles.length);
  console.log('Source: ' + source);

  fs.mkdirSync(saveBaseDir, { recursive: true });
  fs.mkdirSync(path.join(saveBaseDir, 'assets'), { recursive: true });

  var parentDir = path.dirname(saveBaseDir);
  var courseDirName = sanitizeDirName(data.courseName) || 'course';
  var rawDataDir = path.join(parentDir, 'raw-data', courseDirName);
  fs.mkdirSync(rawDataDir, { recursive: true });

  var listData = [];

  for (var i = 0; i < data.articles.length; i++) {
    var article = data.articles[i];
    var mdFileName = sanitizeFileName(article.title) + '.md';
    var cacheDir = path.join(rawDataDir, String(article.id));
    fs.mkdirSync(path.join(cacheDir, 'assets'), { recursive: true });
    listData.push({ id: article.id, title: article.title, mdFileName: mdFileName, cacheDir: cacheDir });
  }

  var listFile = path.join(saveBaseDir, 'article-list.json');
  fs.writeFileSync(listFile, JSON.stringify(listData, null, 2), 'utf8');
  console.log('Saved: ' + listFile);

  var courseInfo = '# ' + data.courseName + '\n\n';
  courseInfo += '> 来源：极客时间\n';
  courseInfo += '> 文章数：' + data.articles.length + '\n';
  courseInfo += '> 提取日期：' + new Date().toISOString().slice(0, 10) + '\n\n';
  courseInfo += '## 目录\n\n';
  for (var i = 0; i < listData.length; i++) {
    var a = listData[i];
    var linkName = a.mdFileName.replace(/\.md$/, '');
    courseInfo += (i + 1) + '. [[' + linkName + ']]\n';
  }
  var courseFile = path.join(saveBaseDir, 'course-info.md');
  fs.writeFileSync(courseFile, courseInfo, 'utf8');
  console.log('Saved: ' + courseFile);
  console.log('Articles: ' + listData.length);
  console.log('Raw data dir: ' + rawDataDir);

  console.log(JSON.stringify({ok:true, courseName:data.courseName, totalArticles:listData.length, listFile:listFile, rawDataDir:rawDataDir, source:source}));
}

main().catch(function(e) {
  console.error('ERROR: ' + e.message);
  process.exit(1);
});
