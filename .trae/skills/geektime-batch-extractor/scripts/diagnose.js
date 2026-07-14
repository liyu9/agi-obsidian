const cdp = require('./cdp-utils');

var ARTICLE_ID = process.argv[2];
if (!ARTICLE_ID) {
  console.error('Usage: node diagnose.js <articleId>');
  process.exit(1);
}

async function main() {
  var page = await cdp.findPageForArticle(ARTICLE_ID);
  if (!page) {
    console.error('Page not found: ' + ARTICLE_ID);
    process.exit(1);
  }

  var DIAGNOSE_JS = `(() => {
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
        preview: (block.innerText || '').substring(0, 100).replace(/\\n/g, '\\\\n'),
        children: childCount, formats: formats
      });
    }

    stats.typeCounts = typeCounts;
    return JSON.stringify({stats: stats, items: items}, null, 2);
  })()`;

  var result = await cdp.evalInPage(page.wsUrl, DIAGNOSE_JS);
  console.log(result);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
