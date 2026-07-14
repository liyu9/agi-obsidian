const cdp = require('d:\\360MoveData\\Users\\admin\\Desktop\\AgiP\\AGI-obsidian\\.trae\\skills\\geektime-batch-extractor\\scripts\\cdp-utils');
const fs = require('fs');
const path = require('path');

const EXTRACT_FN = function(BT) {
  var blocks = document.querySelectorAll('[data-slate-object="block"]');
  var title = document.querySelector('.kfJBvb')?.textContent || document.querySelector('h1')?.textContent || document.title || '';
  var parts = []; var imgs = [];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.querySelector('img')) {
      var src = b.querySelector('img').src;
      imgs.push(src);
      parts.push('![](' + src + ')');
      continue;
    }
    var text = b.innerText.trim();
    if (text) parts.push(text);
  }

  return JSON.stringify({title: title.replace(/\\n/g,' ').trim(), body: parts.join('\n\n'), images: imgs});
}.toString();

const AI_BASE = 'd:\\360MoveData\\Users\\admin\\Desktop\\AgiP\\AGI-obsidian\\12-学习笔记\\06-极客时间-AI大模型项目落地实战';
const RAG_BASE = 'd:\\360MoveData\\Users\admin\\Desktop\\AgiP\\AGI-obsidian\\12-学习笔记\\06-极客时间-RAG系统实战课';

const AI_IDS = [
  '799681','799732','800225','801261','801454','801597','802682',
  '802863','803508','804277','804698','804722','805907',
  '806863','806875','807931','808421','808898','809359','810698',
  '810098','814328','815533','816865','816929','812552'
];

const RAG_IDS = [
  '806059','806091','806130','806979','807070','807859','808306',
  '809016','809066','809371','810048','810723','812551','813383',
  '813933','813934','814486','815540','815860','816606','817424',
  '817949','818511','819241','819675','813827','820328','821044','821100'
];

async function extractArticle(ws, id, base) {
  var targetUrl = 'https://time.geekbang.org/column/article/' + id;
  await cdp.evalInPage(ws, 'window.location.href = "' + targetUrl + '"');
  await new Promise(r => setTimeout(r, 5000));
  await cdp.waitForElement(ws, '[data-slate-object="block"]', 15000).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  var rawJson, raw;
  try {
    rawJson = await cdp.evalInPage(ws, '(' + EXTRACT_FN + ')()');
    raw = JSON.parse(rawJson);
  } catch(e) {
    return { ok: false, error: e.message };
  }

  var h1 = raw.title;
  var numMatch = h1.match(/^(\d+)/);
  var num = numMatch ? numMatch[1] : '00';
  if (h1.match(/^开篇词/)) num = '00';
  else if (h1.match(/^结束语/)) num = '99';
  else if (h1.match(/^结课/)) num = '98';
  else if (h1.match(/^加餐/)) num = '97';
  else if (h1.match(/^阶段自测/)) num = '96';
  var cleanTitle = h1.replace(/^\d+[\s｜|]*\s*/, '');
  var dirName = (num + '-' + cleanTitle).replace(/[\\/:*?"<>|]/g, '_');
  var subDir = path.join(base, dirName);
  fs.mkdirSync(subDir, { recursive: true });
  var assetsDir = path.join(subDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  var today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  var mdBody = raw.body;

  var lines = mdBody.split('\n');
  var deduped = [];
  var prevBlock = '';
  var curBlock = '';
  for (var j = 0; j < lines.length; j++) {
    if (lines[j].trim() === '') {
      if (curBlock && curBlock !== prevBlock) {
        deduped.push(curBlock);
        prevBlock = curBlock;
      }
      curBlock = '';
      deduped.push('');
      continue;
    }
    curBlock += (curBlock ? '\n' : '') + lines[j];
  }
  if (curBlock && curBlock !== prevBlock) deduped.push(curBlock);
  mdBody = deduped.join('\n');

  var allLines = mdBody.split('\n');
  var finalLines = [];
  for (var j = 0; j < allLines.length; j++) {
    if (j > 0 && allLines[j] === allLines[j-1] && allLines[j].trim().length > 0) continue;
    finalLines.push(allLines[j]);
  }
  mdBody = finalLines.join('\n');
  var imgCount = 0;
  for (var i = 0; i < raw.images.length; i++) {
    var imgUrl = raw.images[i];
    if (!imgUrl.startsWith('http')) continue;
    var ext = imgUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) ? '.' + RegExp.$1 : '.jpg';
    var localName = today + '-' + String(i + 1).padStart(2, '0') + '-图片' + (i + 1) + ext;
    try {
      var resp = await fetch(imgUrl);
      var buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(path.join(assetsDir, localName), buf);
      mdBody = mdBody.replace(imgUrl, 'assets/' + localName);
      imgCount++;
    } catch(e) {}
  }

  var md = '# ' + h1 + '\n\n' + mdBody + '\n\n---\n来源：极客时间\n链接：' + targetUrl + '\n日期：' + today + '\n';
  fs.writeFileSync(path.join(subDir, dirName + '.md'), md, 'utf8');
  return { ok: true, dirName: dirName, imgs: imgCount + '/' + raw.images.length, h1: h1 };
}

async function run() {
  var port = await cdp.findPort();
  var tabs = await cdp.getTabs(port);
  var tab = tabs.find(t => t.url.includes('time.geekbang.org') && t.webSocketDebuggerUrl);
  if (!tab) { console.log('FAIL: no tab'); return; }
  var ws = tab.webSocketDebuggerUrl;

  console.log('=== AI大模型 (' + AI_IDS.length + '篇) ===');
  for (var i = 0; i < AI_IDS.length; i++) {
    var r = await extractArticle(ws, AI_IDS[i], AI_BASE);
    if (r.ok) console.log('OK: ' + r.dirName + ' (' + r.imgs + ') [' + r.h1 + ']');
    else console.log('FAIL: ' + AI_IDS[i] + ' ' + r.error);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== RAG系统实战课 (' + RAG_IDS.length + '篇) ===');
  for (var i = 0; i < RAG_IDS.length; i++) {
    var r = await extractArticle(ws, RAG_IDS[i], RAG_BASE);
    if (r.ok) console.log('OK: ' + r.dirName + ' (' + r.imgs + ') [' + r.h1 + ']');
    else console.log('FAIL: ' + RAG_IDS[i] + ' ' + r.error);
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('\nDone!');
}

run().catch(e => console.error(e));
