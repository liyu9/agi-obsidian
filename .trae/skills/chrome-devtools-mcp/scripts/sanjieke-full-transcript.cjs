const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

    // First click the 文稿 tab to ensure it's active
    const clickJs = `(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.trim() === '文稿') {
          node.click();
          return 'Clicked';
        }
      }
      return 'Not found';
    })()`;

    await sendWs(ws, 'Runtime.evaluate', {
      expression: clickJs,
      returnByValue: true,
      timeout: 5000
    });

    await new Promise(r => setTimeout(r, 2000));

    // Extract full transcript from outline-panel-body
    const extractJs = `(() => {
      const panel = document.querySelector('.outline-panel-body') || document.querySelector('.outline-panel');
      if (!panel) return JSON.stringify({ error: 'Panel not found' });
      
      const text = panel.innerText.trim();
      return JSON.stringify({ text, length: text.length });
    })()`;

    const result = await sendWs(ws, 'Runtime.evaluate', {
      expression: extractJs,
      returnByValue: true,
      timeout: 10000
    });

    ws.close();

    const parsed = JSON.parse(result.result.value);
    if (parsed.error) {
      console.error('Error:', parsed.error);
      process.exit(1);
    }

    console.log('Transcript length:', parsed.length);
    console.log('---TRANSCRIPT_START---');
    console.log(parsed.text);
    console.log('---TRANSCRIPT_END---');

    // Save to file
    const saveDir = 'd:\\360MoveData\\Users\\admin\\Desktop\\AgiP\\AGI-obsidian';
    const fileName = '四步通关-转型AI产品经理-课程介绍-文稿.md';
    const content = `# 四步通关，转型AI产品经理 - 课程介绍

> 课程来源：https://www.sanjieke.cn/lesson/0/34009638/37275578

---

${parsed.text}

---

*笔记整理日期：2026-05-19*
`;
    
    const filePath = path.join(saveDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.error('\nSaved to:', filePath);

    process.exit(0);
  });

  ws.on('error', (e) => { console.error('WS Error:', e.message); process.exit(1); });
}

main();
