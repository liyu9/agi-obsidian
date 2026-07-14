const cdp = require('./cdp-utils');

(async function() {
  var tabs = await cdp.getTabs(9222);
  var catalogTab = tabs.find(function(t) { return t.url && t.url.indexOf('column/intro/100021701') >= 0; });
  if (!catalogTab) { console.log('Catalog page not found'); process.exit(1); }
  console.log('Found: ' + catalogTab.title);

  var raw = await cdp.evalInPage(catalogTab.webSocketDebuggerUrl, '(' + function() {
    var items = document.querySelectorAll('a[href*="/column/article/"]');
    var articles = [];
    var seen = {};
    for (var i = 0; i < items.length; i++) {
      var href = items[i].getAttribute('href') || '';
      var m = href.match(/\/column\/article\/(\d+)/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = true;
      articles.push({ id: m[1], title: (items[i].textContent || '').trim().substring(0, 60) });
    }
    return JSON.stringify(articles);
  }.toString() + ')()');

  var articles = JSON.parse(raw);
  console.log('Found articles: ' + articles.length);

  var openTabs = await cdp.getTabs(9222);
  var openIds = {};
  for (var i = 0; i < openTabs.length; i++) {
    var m = openTabs[i].url && openTabs[i].url.match(/\/column\/article\/(\d+)/);
    if (m) openIds[m[1]] = true;
  }
  var toOpen = articles.filter(function(a) { return !openIds[a.id]; });
  console.log('Already open: ' + (articles.length - toOpen.length) + ', Need to open: ' + toOpen.length);

  if (toOpen.length === 0) {
    console.log('All tabs already open!');
    process.exit(0);
  }

  var http = require('http');
  function httpPost(port, path, body) {
    return new Promise(function(resolve, reject) {
      var data = JSON.stringify(body);
      var req = http.request({ hostname: 'localhost', port: port, path: path, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, function(res) {
        var d = ''; res.on('data', function(c) { d += c; }); res.on('end', function() { resolve(JSON.parse(d)); });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  for (var i = 0; i < toOpen.length; i++) {
    var a = toOpen[i];
    var url = 'https://time.geekbang.org/column/article/' + a.id;
    try {
      await httpPost(9222, '/json/new?' + url, {});
      if ((i + 1) % 5 === 0 || i === toOpen.length - 1) console.log('  Progress: ' + (i + 1) + '/' + toOpen.length);
      await new Promise(function(r) { setTimeout(r, 300); });
    } catch(e) {
      console.log('  Failed: ' + a.id + ' - ' + e.message);
    }
  }
  console.log('Done!');
})().catch(function(e) { console.error('ERROR:', e.message); process.exit(1); });
