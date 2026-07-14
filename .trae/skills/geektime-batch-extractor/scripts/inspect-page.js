var cdp = require('./cdp-utils');
var ARTICLE_ID = process.argv[2] || '73397';

(async function() {
  var page = await cdp.findPageForArticle(ARTICLE_ID);
  if (!page) { console.log('Not found'); process.exit(1); }

  var result = await cdp.evalInPage(page.wsUrl,
    '(function() {' +
    'var content = document.querySelector("[class*=articleContent]");' +
    'if (!content) return JSON.stringify({error:"no content"});' +
    'var imgs = content.querySelectorAll("img");' +
    'var info = [];' +
    'for (var i = 0; i < imgs.length; i++) {' +
    '  info.push({src: imgs[i].src, alt: imgs[i].alt, w: imgs[i].naturalWidth, h: imgs[i].naturalHeight, cls: imgs[i].className});' +
    '}' +
    'var allEl = content.querySelectorAll("[data-slate-type]");' +
    'var types = {};' +
    'for (var i = 0; i < allEl.length; i++) {' +
    '  var t = allEl[i].getAttribute("data-slate-type");' +
    '  types[t] = (types[t] || 0) + 1;' +
    '}' +
    'return JSON.stringify({imgs: info, slateTypes: types});' +
    '})()'
  );

  var data = JSON.parse(result);
  console.log('Images:', data.imgs.length);
  data.imgs.forEach(function(img, i) {
    console.log('  ' + (i+1) + '. ' + img.src.substring(0, 80) + ' | ' + img.alt + ' | ' + img.w + 'x' + img.h + ' | cls=' + img.cls);
  });
  console.log('\nSlate types:', JSON.stringify(data.slateTypes));
})().catch(function(e) { console.error(e.message); process.exit(1); });
