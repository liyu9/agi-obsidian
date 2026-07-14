const fs = require('fs');
const path = require('path');
const https = require('https');
const cdp = require('./cdp-utils');
const { validateFile } = require('./validate-lib');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

function download(url, filepath, retries) {
  retries = retries || 1;
  return new Promise(function(resolve, reject) {
    var timeoutId;
    var request = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 }, function(res) {
      if (res.statusCode >= 300 && res.headers.location) {
        download(res.headers.location, filepath, retries).then(resolve).catch(reject);
        return;
      }
      clearTimeout(timeoutId);
      var file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on('finish', function() { file.close(); resolve({ ok: true, url: url }); });
    });
    timeoutId = setTimeout(function() {
      request.destroy(new Error('timeout 30s'));
    }, 30000);
    request.on('error', function(e) {
      clearTimeout(timeoutId);
      if (retries > 0) {
        download(url, filepath, retries - 1).then(resolve).catch(reject);
      } else {
        try { fs.unlinkSync(filepath); } catch (ex) {}
        reject(e);
      }
    });
  });
}

function downloadParallel(tasks, concurrency) {
  concurrency = concurrency || 5;
  var idx = 0;
  var completed = 0;
  var results = [];
  return new Promise(function(resolve) {
    function next() {
      if (idx >= tasks.length) return;
      var i = idx++;
      var task = tasks[i];
      task.fn().then(function(r) {
        results[i] = r;
        completed++;
        if (completed === tasks.length) resolve(results);
        else next();
      }).catch(function(e) {
        results[i] = { ok: false, error: e.message };
        completed++;
        if (completed === tasks.length) resolve(results);
        else next();
      });
    }
    for (var c = 0; c < Math.min(concurrency, tasks.length); c++) next();
  });
}

var EXTRACT_IN_BROWSER = fs.readFileSync(path.join(__dirname, 'browser-extract-fn.js'), 'utf8').trim();

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
      for (var j = 0; j < lines.length; j++) md += '> ' + lines[j] + '\n';
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
  var imageFiles = files.filter(function(f) { return f.match(/^\d{8}-\d{2}-.+\.(png|jpg|jpeg|gif|webp)$/i); });
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

async function main() {
  var args = process.argv.slice(2);
  var ARTICLE_ID = args[0];
  var SAVE_DIR = args[1];
  var CACHE_DIR = args[2] || SAVE_DIR;
  if (!ARTICLE_ID || !SAVE_DIR) {
    console.error('Usage: node extract-single.js <articleId> "<saveDir>" ["<cacheDir>"]');
    process.exit(1);
  }

  var saveAssetsDir = path.join(SAVE_DIR, 'assets');
  fs.mkdirSync(saveAssetsDir, { recursive: true });
  var cacheAssetsDir = path.join(CACHE_DIR, 'assets');
  fs.mkdirSync(cacheAssetsDir, { recursive: true });
  var rawFile = path.join(cacheAssetsDir, 'article-raw.json');

  var page = await cdp.findPageForArticle(ARTICLE_ID);
  if (!page) {
    var result = JSON.stringify({ok:false, id:ARTICLE_ID, error:'Page not found'});
    console.log(result);
    process.exit(0);
  }

  await cdp.waitForElement(page.wsUrl, '[data-slate-object="block"]', 10000).catch(function() {});

  var rawJson = await cdp.evalInPage(page.wsUrl, '(' + EXTRACT_IN_BROWSER + ')(String.fromCharCode(96))');
  var raw = JSON.parse(rawJson);
  if (raw.error) {
    console.log(JSON.stringify({ok:false, id:ARTICLE_ID, error:raw.error}));
    process.exit(0);
  }

  var datePrefix = '20260509';
  var imageMap = {};
  var downloadTasks = [];

  for (var i = 0; i < raw.images.length; i++) {
    (function(img, idx) {
      var ext = (img.src.match(/\.(png|jpg|jpeg|gif|webp)/i) || ['png'])[0].replace(/^\./, '');
      var desc = img.alt || (idx === 0 ? '头图' : '图片' + idx);
      var filename = datePrefix + '-' + String(idx + 1).padStart(2, '0') + '-' + desc + '.' + ext;
      var cacheFilepath = path.join(cacheAssetsDir, filename);
      var saveFilepath = path.join(saveAssetsDir, filename);
      var localPath = 'assets/' + filename;
      downloadTasks.push({
        fn: function() {
          return download(img.src, cacheFilepath, 1).then(function() {
            fs.copyFileSync(cacheFilepath, saveFilepath);
            return { ok: true, url: img.src, local: localPath };
          });
        },
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
    } else {
      var task = downloadTasks[i];
      imageMap[task.url] = task.url;
    }
  }

  raw.imageFiles = imageMap;
  fs.writeFileSync(rawFile, JSON.stringify(raw, null, 2), 'utf8');

  var mdFile = saveMd(raw, imageMap, SAVE_DIR, ARTICLE_ID);
  var mdContent = fs.readFileSync(mdFile, 'utf8');

  var vResult = validateFile(mdFile);
  var output = {
    ok: true,
    id: ARTICLE_ID,
    title: raw.title,
    validated: vResult.pass,
    chars: mdContent.length,
    images: raw.images.length,
    blocks: raw.blocks.length,
    warnings: vResult.warnings
  };
  if (!vResult.pass) {
    output.fails = vResult.fails;
  }
  console.log(JSON.stringify(output));
  if (!vResult.pass) process.exit(1);
}

main().catch(function(e) {
  console.log(JSON.stringify({ok:false, id:process.argv[2]||'', error:e.message}));
  process.exit(1);
});
