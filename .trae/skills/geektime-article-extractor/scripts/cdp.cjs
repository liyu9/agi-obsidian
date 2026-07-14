#!/usr/bin/env node

const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const DEFAULT_PORT = 9222;
const TIMEOUT = 5000;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function findPort() {
  for (const port of [9222, 9223, 9224]) {
    try {
      await httpGet(`http://localhost:${port}/json/version`);
      return port;
    } catch {}
  }
  return null;
}

async function getBrowserWs(port) {
  const info = JSON.parse(await httpGet(`http://localhost:${port}/json/version`));
  return info.webSocketDebuggerUrl;
}

async function getTabs(port) {
  const tabs = JSON.parse(await httpGet(`http://localhost:${port}/json`));
  return tabs.filter(t => t.type === 'page');
}

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    const handler = (msg) => {
      const data = JSON.parse(msg);
      if (data.id === id) {
        ws.off('message', handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(wsUrl, expression) {
  const ws = new WebSocket(wsUrl);
  return new Promise((resolve, reject) => {
    ws.on('open', async () => {
      try {
        await cdpSend(ws, 'Runtime.enable');
        const result = await cdpSend(ws, 'Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true,
          timeout: 15000
        });
        ws.close();
        if (result.exceptionDetails) {
          reject(new Error(result.exceptionDetails.text || 'Evaluation failed'));
        } else {
          resolve(result.result.value);
        }
      } catch (e) {
        ws.close();
        reject(e);
      }
    });
    ws.on('error', reject);
  });
}

const EXTRACT_JS = `(() => {
  const content = document.querySelector('[class*="articleContent"]');
  if (!content) return JSON.stringify({error: 'articleContent not found', bodyLength: document.body.innerText.length});
  
  const isPaywall = document.body.innerText.includes('仅可试看部分内容');
  if (isPaywall && content.innerText.length < 1000) {
    return JSON.stringify({error: 'paywall', bodyLength: content.innerText.length});
  }
  
  const blocks = content.querySelectorAll('[data-slate-object="block"]');
  const result = [];
  const headImg = content.querySelector('img[class*="headImg"]');
  if (headImg) result.push({type:'image', src:headImg.src, alt:'头图'});
  
  blocks.forEach(block => {
    const t = block.getAttribute('data-slate-type');
    if (t === 'heading') {
      result.push({type:'heading', level:block.tagName, text:block.textContent.trim()});
    } else if (t === 'paragraph') {
      let html = block.innerHTML;
      html = html.replace(/<strong[^>]*>([\\s\\S]*?)<\\/strong>/g, '**$1**');
      html = html.replace(/<code[^>]*>([\\s\\S]*?)<\\/code>/g, '\`$1\`');
      html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/g, '[$2]($1)');
      html = html.replace(/<br[^>]*>/g, '\\n');
      html = html.replace(/<[^>]+>/g, '');
      html = html.replace(/&nbsp;/g, ' ');
      html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const text = html.trim();
      if (text) result.push({type:'paragraph', text});
    } else if (t === 'list') {
      const items = [];
      block.querySelectorAll('[data-slate-type="list-line"]').forEach(line => {
        let html = line.innerHTML;
        html = html.replace(/<strong[^>]*>([\\s\\S]*?)<\\/strong>/g, '**$1**');
        html = html.replace(/<code[^>]*>([\\s\\S]*?)<\\/code>/g, '\`$1\`');
        html = html.replace(/<[^>]+>/g, '');
        html = html.replace(/&nbsp;/g, ' ');
        html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        items.push(html.trim());
      });
      result.push({type:'list', items});
    } else if (t === 'image') {
      const img = block.querySelector('img');
      if (img) result.push({type:'image', src:img.src, alt:img.alt||''});
    } else if (t === 'code-block') {
      result.push({type:'code', text:block.textContent});
    } else if (t === 'blockquote') {
      let html = block.innerHTML;
      html = html.replace(/<strong[^>]*>([\\s\\S]*?)<\\/strong>/g, '**$1**');
      html = html.replace(/<code[^>]*>([\\s\\S]*?)<\\/code>/g, '\`$1\`');
      html = html.replace(/<[^>]+>/g, '');
      html = html.replace(/&nbsp;/g, ' ');
      html = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      result.push({type:'blockquote', text:html.trim()});
    } else if (t === 'pre') {
      result.push({type:'pre', text:block.textContent});
    } else if (t === 'code-line') {
      result.push({type:'code-line', text:block.textContent});
    } else if (t === 'block-quote') {
      result.push({type:'block-quote', text:block.textContent.trim()});
    } else if (t === 'quote-line') {
      result.push({type:'quote-line', text:block.textContent.trim()});
    } else if (t === 'list-line') {
      result.push({type:'list-line', text:block.textContent.trim()});
    }
  });
  
  const images = Array.from(content.querySelectorAll('img')).filter(i=>i.naturalWidth>100).map(i=>({src:i.src,alt:i.alt||''}));
  const title = document.querySelector('h1')?.textContent?.trim() || '';
  
  return JSON.stringify({title, blocks:result, images, totalBlocks:blocks.length, textLength:content.innerText.length});
})()`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage:');
    console.log('  node cdp.mjs list              List Chrome tabs');
    console.log('  node cdp.mjs eval <target> <js> Evaluate JS expression');
    console.log('  node cdp.mjs extract [url]     Extract article content');
    console.log('  node cdp.mjs detect            Detect Chrome debug port');
    process.exit(0);
  }

  const port = await findPort();
  if (!port) {
    console.error('ERROR: Chrome debug port not found. Start Chrome with --remote-debugging-port=9222');
    process.exit(1);
  }

  if (command === 'detect') {
    console.log(`Chrome debug port: ${port}`);
    const info = JSON.parse(await httpGet(`http://localhost:${port}/json/version`));
    console.log(`Browser: ${info.Browser}`);
    console.log(`WebSocket: ${info.webSocketDebuggerUrl}`);
    return;
  }

  if (command === 'list') {
    const tabs = await getTabs(port);
    for (const tab of tabs) {
      const id = tab.id?.substring(0, 8) || tab.targetId?.substring(0, 8) || '?';
      console.log(`[${id}] ${tab.title}`);
      console.log(`    ${tab.url}`);
    }
    return;
  }

  if (command === 'eval') {
    const target = args[1];
    const expr = args.slice(2).join(' ');
    if (!target || !expr) {
      console.error('Usage: node cdp.mjs eval <targetPrefix> "<js-expression>"');
      process.exit(1);
    }
    const tabs = await getTabs(port);
    const tab = tabs.find(t => (t.id || t.targetId || '').startsWith(target));
    if (!tab) {
      console.error(`Tab not found: ${target}`);
      process.exit(1);
    }
    const wsUrl = tab.webSocketDebuggerUrl;
    const result = await evalInPage(wsUrl, expr);
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'extract') {
    const urlFilter = args[1] || 'time.geekbang.org/column/article';
    const tabs = await getTabs(port);
    const tab = tabs.find(t => t.url.includes(urlFilter));
    if (!tab) {
      console.error(`No tab found matching: ${urlFilter}`);
      console.error('Available tabs:');
      for (const t of tabs) console.error(`  ${t.url}`);
      process.exit(1);
    }
    console.error(`Extracting from: ${tab.title}`);
    const wsUrl = tab.webSocketDebuggerUrl;
    const result = await evalInPage(wsUrl, EXTRACT_JS);
    const parsed = JSON.parse(result);
    if (parsed.error) {
      console.error(`ERROR: ${parsed.error}`);
      process.exit(1);
    }
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
