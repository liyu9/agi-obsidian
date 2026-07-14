const fs = require('fs');
const path = require('path');
const { validateFile } = require('./validate-lib');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

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
  var pattern = raw.id ? new RegExp('^\\d{8}-' + raw.id + '-\\d{2}-') : /^\d{8}-\d+-\d{2}-/;
  var imageFiles = files.filter(function(f) { return pattern.test(f) && f.match(/\.(png|jpg|jpeg|gif|webp)$/i); });
  if (raw.images && imageFiles.length > 0) {
    for (var idx = 0; idx < raw.images.length && idx < imageFiles.length; idx++) {
      imageMap[raw.images[idx].src] = 'assets/' + imageFiles[idx];
    }
  }
  return imageMap;
}

async function main() {
  var args = process.argv.slice(2);
  var ARTICLE_ID = args[0];
  var SAVE_DIR = args[1];
  var CACHE_DIR = args[2] || SAVE_DIR;
  if (!ARTICLE_ID || !SAVE_DIR) {
    console.error('Usage: node regen.js <articleId> "<saveDir>" ["<cacheDir>"]');
    process.exit(1);
  }

  var cacheAssetsDir = path.join(CACHE_DIR, 'assets');
  var rawFile = path.join(cacheAssetsDir, 'article-raw.json');
  if (!fs.existsSync(rawFile)) {
    console.log(JSON.stringify({ok:false, id:ARTICLE_ID, error:'No cached data'}));
    process.exit(1);
  }

  var raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  raw.id = ARTICLE_ID;

  var saveAssetsDir = path.join(SAVE_DIR, 'assets');
  var imageMap = buildImageMap(raw, saveAssetsDir);

  fs.mkdirSync(saveAssetsDir, { recursive: true });
  for (var url in imageMap) {
    var rel = imageMap[url];
    if (!rel.startsWith('http')) {
      var srcPath = path.join(cacheAssetsDir, path.basename(rel));
      var dstPath = path.join(SAVE_DIR, rel);
      if (fs.existsSync(srcPath) && !fs.existsSync(dstPath)) {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }

  var mdBody = generateMd(raw, imageMap);
  var today = new Date().toISOString().slice(0, 10);
  var md = '# ' + raw.title + '\n\n' + mdBody + '---\n来源：极客时间\n链接：https://time.geekbang.org/column/article/' + ARTICLE_ID + '\n日期：' + today + '\n';
  var mdFile = path.join(SAVE_DIR, sanitizeFileName(raw.title) + '.md');
  fs.writeFileSync(mdFile, md, 'utf8');

  var vResult = validateFile(mdFile);
  var output = {
    ok: true,
    id: ARTICLE_ID,
    title: raw.title,
    validated: vResult.pass,
    chars: md.length,
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
