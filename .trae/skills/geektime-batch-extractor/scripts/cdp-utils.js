const http = require('http');
const https = require('https');
const WebSocket = require('ws');

function httpGet(url, timeout) {
  timeout = timeout || 10000;
  return new Promise(function(resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: timeout }, function(res) {
      if (res.statusCode >= 300 && res.headers.location) {
        httpGet(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve(data); });
    }).on('error', reject);
  });
}

async function findPort() {
  for (var i = 0; i < 3; i++) {
    var port = [9222, 9223, 9224][i];
    try {
      await httpGet('http://localhost:' + port + '/json/version', 3000);
      return port;
    } catch (e) {}
  }
  return null;
}

async function getBrowserWs(port) {
  var info = JSON.parse(await httpGet('http://localhost:' + port + '/json/version'));
  return info.webSocketDebuggerUrl;
}

async function getTabs(port) {
  var tabs = JSON.parse(await httpGet('http://localhost:' + port + '/json'));
  return tabs.filter(function(t) { return t.type === 'page'; });
}

var _msgId = 1;
function cdpSend(ws, method, params) {
  params = params || {};
  return new Promise(function(resolve, reject) {
    var id = _msgId++;
    var handler = function(msg) {
      try {
        var data = JSON.parse(msg);
      } catch(e) { return; }
      if (data.id === id) {
        ws.off('message', handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: id, method: method, params: params }));
  });
}

function evalInPage(wsUrl, expression) {
  return new Promise(function(resolve, reject) {
    var ws = new WebSocket(wsUrl);
    var settled = false;
    ws.on('open', function() {
      cdpSend(ws, 'Runtime.evaluate', {
        expression: expression,
        returnByValue: true,
        awaitPromise: true,
        timeout: 30000
      }).then(function(result) {
        settled = true;
        ws.close();
        if (result.exceptionDetails) {
          reject(new Error(result.exceptionDetails.text || 'Evaluation failed'));
        } else {
          resolve(result.result.value);
        }
      }).catch(function(e) {
        settled = true;
        ws.close();
        reject(e);
      });
    });
    ws.on('error', function(e) {
      if (!settled) reject(e);
    });
  });
}

async function findPageForArticle(articleId) {
  var port = await findPort();
  if (!port) return null;
  var tabs = await getTabs(port);
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].url && tabs[i].url.indexOf(articleId) >= 0) {
      return { port: port, tab: tabs[i], wsUrl: tabs[i].webSocketDebuggerUrl };
    }
  }
  return null;
}

async function findCoursePage() {
  var port = await findPort();
  if (!port) return null;
  var tabs = await getTabs(port);
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].url && tabs[i].url.indexOf('geekbang.org/column/') >= 0) {
      return { port: port, tab: tabs[i], wsUrl: tabs[i].webSocketDebuggerUrl };
    }
  }
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].url && tabs[i].url.indexOf('geekbang.org') >= 0) {
      return { port: port, tab: tabs[i], wsUrl: tabs[i].webSocketDebuggerUrl };
    }
  }
  return null;
}

async function waitForElement(wsUrl, selector, timeoutMs) {
  timeoutMs = timeoutMs || 10000;
  var start = Date.now();
  while (Date.now() - start < timeoutMs) {
    var found = await evalInPage(wsUrl,
      'document.querySelector(\'' + selector + '\') ? true : false'
    );
    if (found) return true;
    await new Promise(function(r) { setTimeout(r, 500); });
  }
  return false;
}

async function scrollToBottom(wsUrl) {
  await evalInPage(wsUrl, [
    'window.scrollTo(0, document.body.scrollHeight);',
    'new Promise(function(r) { setTimeout(r, 2000); });'
  ].join('\n'));
  await new Promise(function(r) { setTimeout(r, 2500); });
}

module.exports = {
  httpGet: httpGet,
  findPort: findPort,
  getBrowserWs: getBrowserWs,
  getTabs: getTabs,
  cdpSend: cdpSend,
  evalInPage: evalInPage,
  findPageForArticle: findPageForArticle,
  findCoursePage: findCoursePage,
  waitForElement: waitForElement,
  scrollToBottom: scrollToBottom
};
