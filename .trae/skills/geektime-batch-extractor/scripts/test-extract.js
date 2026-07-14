const cdp = require('./cdp-utils');
const WebSocket = require('ws');

(async function() {
  var page = await cdp.findPageForArticle('73270');
  if (!page) { console.log('Not found'); process.exit(1); }

  var expr = '(function(bt) { return JSON.stringify({test: bt}); })(String.fromCharCode(96))';

  var ws = new WebSocket(page.wsUrl);
  await new Promise(function(r) { ws.on('open', r); });
  var id = 1;

  function send(method, params) {
    return new Promise(function(resolve) {
      var myId = ++id;
      ws.on('message', function handler(msg) {
        var data = JSON.parse(msg);
        if (data.id === myId) {
          ws.off('message', handler);
          resolve(data);
        }
      });
      ws.send(JSON.stringify({ id: myId, method: method, params: params }));
    });
  }

  var result = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    timeout: 10000
  });

  console.log('Simple test:', JSON.stringify(result.result));

  var extractSrc = require('fs').readFileSync(require('path').join(__dirname, 'extract-single.js'), 'utf8');
  var match = extractSrc.match(/var EXTRACT_IN_BROWSER = \(function\(\) \{[\s\S]*?\}\)\(\);/);
  var fnSrc = match[0].replace('var EXTRACT_IN_BROWSER = ', '');
  var fullExpr = '(' + fnSrc + ')(String.fromCharCode(96))';

  console.log('\nFull expr length:', fullExpr.length);
  console.log('First 100:', fullExpr.substring(0, 100));
  console.log('Last 100:', fullExpr.substring(fullExpr.length - 100));

  result = await send('Runtime.evaluate', {
    expression: fullExpr,
    returnByValue: true,
    timeout: 30000
  });

  console.log('\nExtract result:', JSON.stringify(result).substring(0, 500));
  ws.close();
})().catch(function(e) { console.error('ERR:', e.message); process.exit(1); });
