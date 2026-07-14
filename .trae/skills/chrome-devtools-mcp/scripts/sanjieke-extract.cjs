const WebSocket = require('ws');
const http = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

let _msgId = 1;
function sendWs(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = _msgId++;
    const handler = (msg) => {
      const data = JSON.parse(msg);
      if (data.id === id) {
        ws.removeListener('message', handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const data = await httpGet('http://127.0.0.1:9222/json');
  const tabs = JSON.parse(data).filter(t => t.type === 'page');
  const tab = tabs.find(t => t.url.includes('sanjieke.cn/lesson'));
  if (!tab) { console.error('Tab not found'); process.exit(1); }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.on('open', async () => {
    await sendWs(ws, 'Runtime.enable', {});

    const js = `(() => {
      const result = {};

      const videos = document.querySelectorAll('video');
      result.videoElements = [];
      videos.forEach(v => {
        result.videoElements.push({
          src: v.src || '',
          currentSrc: v.currentSrc || '',
          poster: v.poster || '',
          duration: v.duration || 0
        });
      });

      const sources = document.querySelectorAll('video source');
      result.videoSources = [];
      sources.forEach(s => {
        result.videoSources.push({
          src: s.src || '',
          type: s.type || ''
        });
      });

      const tracks = document.querySelectorAll('video track');
      result.tracks = [];
      tracks.forEach(t => {
        result.tracks.push({
          src: t.src || '',
          kind: t.kind || '',
          label: t.label || ''
        });
      });

      const iframes = document.querySelectorAll('iframe');
      result.iframes = [];
      iframes.forEach(f => {
        result.iframes.push({
          src: f.src || '',
          id: f.id || ''
        });
      });

      result.title = document.title;
      result.url = window.location.href;

      const allText = document.body.innerText;
      result.fullTextLength = allText.length;
      result.fullTextPreview = allText.substring(0, 8000);

      const perfEntries = performance.getEntriesByType('resource');
      result.videoUrls = perfEntries
        .filter(e => e.name.includes('.m3u8') || e.name.includes('.mp4') || e.name.includes('.flv') || e.name.includes('video') || e.name.includes('play'))
        .map(e => e.name);

      return JSON.stringify(result);
    })()`;

    const evalResult = await sendWs(ws, 'Runtime.evaluate', {
      expression: js,
      returnByValue: true,
      awaitPromise: true,
      timeout: 15000
    });

    ws.close();

    if (evalResult.exceptionDetails) {
      console.error('Error:', JSON.stringify(evalResult.exceptionDetails));
    } else {
      const parsed = JSON.parse(evalResult.result.value);
      console.log(JSON.stringify(parsed, null, 2));
    }
    process.exit(0);
  });

  ws.on('error', (e) => { console.error('WS Error:', e.message); process.exit(1); });
}

main();
