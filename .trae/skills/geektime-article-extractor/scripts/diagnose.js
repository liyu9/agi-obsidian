const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 5000 }, res => {
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

const ARTICLE_ID = process.argv[2];
if (!ARTICLE_ID) {
  console.error('Usage: node diagnose.js <articleId>');
  process.exit(1);
}

async function main() {
  var port = await findPort();
  if (!port) { console.error('Chrome port not found'); process.exit(1); }

  var versionInfo = JSON.parse(await httpGet('http://localhost:' + port + '/json/version'));
  var browser = await puppeteer.connect({ browserWSEndpoint: versionInfo.webSocketDebuggerUrl, defaultViewport: null });
  var pages = await browser.pages();
  var page = null;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].url().includes(ARTICLE_ID)) { page = pages[i]; break; }
  }
  if (!page) { console.error('Page not found: ' + ARTICLE_ID); await browser.disconnect(); process.exit(1); }

  var result = await page.evaluate(() => {
    var content = document.querySelector('[class*="articleContent"]');
    if (!content) return JSON.stringify({error: 'no content'});

    var allBlocks = content.querySelectorAll('[data-slate-object="block"]');
    var stats = { totalBlocks: allBlocks.length, textLength: content.innerText.length };
    var typeCounts = {};
    var items = [];

    for (var i = 0; i < allBlocks.length; i++) {
      var block = allBlocks[i];
      var t = block.getAttribute('data-slate-type') || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;

      var childCount = 0;
      for (var j = i + 1; j < allBlocks.length; j++) {
        if (block.contains(allBlocks[j])) childCount++; else break;
      }

      var html = block.innerHTML;
      var formats = {
        bold: (html.match(/data-slate-type="bold"/g) || []).length,
        code: (html.match(/data-slate-type="code"/g) || []).length,
        markClass: (html.match(/data-slate-type="mark-class"/g) || []).length,
        strong: (html.match(/<strong/gi) || []).length,
        htmlCode: (html.match(/<code/gi) || []).length
      };

      items.push({
        idx: i, type: t, tag: block.tagName,
        textLen: (block.innerText || '').length,
        preview: (block.innerText || '').substring(0, 100).replace(/\n/g, '\\n'),
        children: childCount, formats: formats
      });
    }

    stats.typeCounts = typeCounts;
    return JSON.stringify({ stats: stats, items: items }, null, 2);
  });

  console.log(result);
  await browser.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
