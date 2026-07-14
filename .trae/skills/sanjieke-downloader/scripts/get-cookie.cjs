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
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  let tabs = [];
  for (let retry = 0; retry < 5; retry++) {
    const data = await httpGet('http://127.0.0.1:9222/json');
    tabs = JSON.parse(data).filter(t => t.type === 'page' && t.url.includes('sanjieke.cn'));
    if (tabs.length > 0) break;
    await new Promise(r => setTimeout(r, 2000));
    console.error('Waiting for sanjieke.cn page...');
  }

  const tab = tabs.find(t => t.url.includes('sanjieke.cn'));
  if (!tab) {
    console.error('Error: No sanjieke.cn page found. Please open sanjieke.cn in Chrome.');
    process.exit(1);
  }

  console.error(`Using tab: ${tab.title}`);
  console.error(`URL: ${tab.url}`);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.on('open', async () => {
    await sendWs(ws, 'Runtime.enable', {});
    await new Promise(r => setTimeout(r, 2000));

    const js = `(() => { return document.cookie; })()`;
    const result = await sendWs(ws, 'Runtime.evaluate', {
      expression: js,
      returnByValue: true,
      timeout: 5000
    });

    ws.close();
    console.log(result.result.value);
    process.exit(0);
  });

  ws.on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}

main();
