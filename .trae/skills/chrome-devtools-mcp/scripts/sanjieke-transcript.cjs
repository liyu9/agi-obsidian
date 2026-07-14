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

    // Step 1: Click on the transcript tab
    const clickJs = `(() => {
      const tabs = document.querySelectorAll('[class*=tab], [class*=Tab], [role=tab], button, span, div');
      let transcriptTab = null;
      for (const el of tabs) {
        if (el.textContent.trim() === '文稿') {
          transcriptTab = el;
          break;
        }
      }
      if (transcriptTab) {
        transcriptTab.click();
        return 'Clicked transcript tab';
      }
      return 'Transcript tab not found';
    })()`;

    const clickResult = await sendWs(ws, 'Runtime.evaluate', {
      expression: clickJs,
      returnByValue: true,
      timeout: 5000
    });
    console.error(clickResult.result.value);

    // Wait for content to load
    await new Promise(r => setTimeout(r, 3000));

    // Step 2: Extract transcript content
    const extractJs = `(() => {
      const result = {};
      
      // Try various selectors for transcript content
      const selectors = [
        '[class*=transcript]', '[class*=Transcript]',
        '[class*=manuscript]', '[class*=Manuscript]',
        '[class*=wen-gao]', '[class*=wengao]',
        '[class*=text-content]', '[class*=textContent]',
        '[class*=lesson-text]', '[class*=course-text]',
        '.transcript', '.manuscript',
        '[class*=content-detail]', '[class*=detail-content]'
      ];
      
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 50) {
          result.selector = sel;
          result.text = el.innerText.trim();
          break;
        }
      }
      
      // If no specific selector found, try getting all visible text after clicking tab
      if (!result.text) {
        const body = document.body.innerText;
        result.fullText = body;
        result.textLength = body.length;
      }
      
      // Also try to find any network requests for transcript API
      result.url = window.location.href;
      
      // Check for any hidden transcript elements
      const allDivs = document.querySelectorAll('div');
      result.potentialTranscriptDivs = [];
      allDivs.forEach(d => {
        const cls = d.className || '';
        if (typeof cls === 'string' && (cls.includes('transcript') || cls.includes('manuscript') || cls.includes('wengao') || cls.includes('wen-gao') || cls.includes('text-content'))) {
          result.potentialTranscriptDivs.push({
            className: cls,
            text: d.innerText.substring(0, 500),
            visible: d.offsetParent !== null
          });
        }
      });
      
      return JSON.stringify(result);
    })()`;

    const extractResult = await sendWs(ws, 'Runtime.evaluate', {
      expression: extractJs,
      returnByValue: true,
      timeout: 10000
    });

    ws.close();

    const parsed = JSON.parse(extractResult.result.value);
    console.log(JSON.stringify(parsed, null, 2));
    process.exit(0);
  });

  ws.on('error', (e) => { console.error('WS Error:', e.message); process.exit(1); });
}

main();
