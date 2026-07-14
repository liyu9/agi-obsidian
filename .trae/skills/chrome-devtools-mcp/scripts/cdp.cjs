#!/usr/bin/env node
/**
 * Chrome DevTools CDP 工具
 * 支持两种模式：
 * 1. 连接已有 Chrome（需用户手动确认）
 * 2. 自动启动调试 Chrome（无头模式/独立profile）
 */

const { exec, spawn } = require('child_process');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const TIMEOUT = 10000;

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

/**
 * 检测 Chrome 调试端口是否可用（使用 HTTP）
 */
async function checkChromeDebug() {
  try {
    const data = await httpGet(`http://127.0.0.1:${DEBUG_PORT}/json`);
    return data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * 启动带调试端口的 Chrome（使用 PowerShell）
 */
function launchDebugChrome(url = null) {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(os.tmpdir(), `chrome-debug-${Date.now()}`);
    const port = DEBUG_PORT;

    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$chromePath = '${CHROME_PATH.replace(/\\/g, '\\\\')}'
$port = ${port}
$userDataDir = '${userDataDir.replace(/\\/g, '\\\\')}'
${url ? `\$targetUrl = '${url}'` : ''}

# Create user data dir
New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null

# Build args
$args = @(
    "--remote-debugging-port=$port",
    "--user-data-dir=$userDataDir",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-popup-blocking"
)
${url ? '$args += $targetUrl' : ''}

# Launch Chrome
$proc = Start-Process -FilePath $chromePath -ArgumentList $args -PassThru -WindowStyle Hidden

# Wait for port to be listening
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    $listening = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
    if ($listening) {
        Write-Output "SUCCESS"
        exit 0
    }
}
Write-Output "TIMEOUT"
exit 1
`;

    console.error(`Launching Chrome with debug port ${port}...`);
    console.error(`Profile: ${userDataDir}`);

    const ps = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (stdout.includes('SUCCESS')) {
        console.error('Chrome debug mode ready!');
        resolve(true);
      } else {
        console.error(`Launch failed: ${stderr || stdout}`);
        resolve(false);
      }
    });

    ps.on('error', (err) => {
      console.error(`Spawn error: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * 获取 Chrome tabs（通过 HTTP JSON）
 */
async function getTabs() {
  return new Promise((resolve, reject) => {
    httpGet(`http://127.0.0.1:${DEBUG_PORT}/json`)
      .then(data => {
        const tabs = JSON.parse(data);
        resolve(tabs.filter(t => t.type === 'page'));
      })
      .catch(err => {
        reject(new Error('Failed to get tabs: ' + err.message));
      });
  });
}

/**
 * 在指定 tab 执行 JS
 */
async function evalInTab(wsUrl, expression, timeout = 30000) {
  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Evaluation timeout'));
    }, timeout);

    ws.on('open', async () => {
      try {
        // 启用 Runtime
        await sendWs(ws, 'Runtime.enable', {});

        // 等待一会儿让页面稳定
        await new Promise(r => setTimeout(r, 1000));

        // 执行表达式
        const result = await sendWs(ws, 'Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true,
          timeout
        });

        ws.close();
        clearTimeout(timer);

        if (result.exceptionDetails) {
          reject(new Error(result.exceptionDetails.text || 'Evaluation failed'));
        } else {
          resolve(result.result.value);
        }
      } catch (e) {
        ws.close();
        clearTimeout(timer);
        reject(e);
      }
    });

    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
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

/**
 * 在指定 tab 导航到 URL
 */
async function navigateTab(wsUrl, url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Navigation timeout'));
    }, 30000);

    let loaded = false;

    ws.on('open', async () => {
      try {
        // 启用 Page domain
        await sendWs(ws, 'Page.enable', {});

        // 设置加载事件监听
        ws.on('message', (msg) => {
          const data = JSON.parse(msg);
          if (data.method === 'Page.loadEventFired') {
            loaded = true;
            clearTimeout(timer);
            ws.close();
            resolve(true);
          }
        });

        // 导航
        await sendWs(ws, 'Page.navigate', { url });

        // 如果已经加载完成就不再等待
        if (loaded) {
          clearTimeout(timer);
          ws.close();
          resolve(true);
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

/**
 * 创建新标签页并导航
 */
async function createAndNavigateTo(url) {
  // 通过 HTTP 获取 tabs 找到 browser webSocketDebuggerUrl
  const data = await httpGet(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const tabs = JSON.parse(data);

  // 获取一个可用的 page tab
  const pageTab = tabs.find(t => t.type === 'page');
  if (!pageTab) throw new Error('No page tab found');

  // 连接到 browser 以创建 target
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Create target timeout'));
    }, 30000);

    ws.on('open', async () => {
      try {
        // 创建新 target
        const result = await sendWs(ws, 'Target.createTarget', { url });
        const newTargetId = result.targetId;

        clearTimeout(timer);
        ws.close();

        console.error(`Created new tab with targetId: ${newTargetId}`);
        resolve(newTargetId);
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

// 微信公众号提取脚本（简化版）
const WX_EXTRACT_JS = `(() => {
  const content = document.querySelector('#js_content');
  if (!content) {
    return JSON.stringify({
      error: 'Content not found',
      textLength: document.body.innerText.length
    });
  }

  const title = document.querySelector('.rich_media_title')?.textContent?.trim() || '';
  const author = document.querySelector('.rich_media_meta.rich_media_meta_primary')?.textContent?.trim() || '';
  const date = document.querySelector('#publish_time')?.textContent?.trim() || '';

  // 只获取纯文本
  const text = content.innerText;

  return JSON.stringify({
    title,
    author,
    date,
    text: text.substring(0, 50000),  // 限制长度
    textLength: text.length
  });
})()`;

// 通用内容提取（用于其他网站）
const GENERAL_EXTRACT_JS = `(() => {
  const body = document.body;
  const title = document.title || document.querySelector('h1')?.textContent?.trim() || '';

  // 获取主要内容区域
  const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.post', '.article'];
  let content = null;
  for (const sel of contentSelectors) {
    content = document.querySelector(sel);
    if (content && content.innerText.length > 500) break;
  }
  if (!content) content = body;

  const paragraphs = [];
  content.querySelectorAll('p').forEach(el => {
    const text = el.innerText.trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });

  const images = [];
  content.querySelectorAll('img').forEach(img => {
    if (img.naturalWidth > 100 && img.src) {
      images.push({ src: img.src, alt: img.alt || '' });
    }
  });

  return JSON.stringify({
    title,
    paragraphs,
    images,
    textLength: content.innerText.length,
    url: window.location.href
  });
})()`;

// 截图脚本
async function takeScreenshot(tab) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    ws.on('open', async () => {
      try {
        await sendWs(ws, 'Page.enable', {});
        await sendWs(ws, 'Page.setDownloadBehavior', { behavior: 'allow', downloadPath: os.tmpdir() });

        setTimeout(async () => {
          try {
            const result = await sendWs(ws, 'Page.captureScreenshot', { format: 'png' });
            ws.close();
            resolve(result);
          } catch (e) {
            ws.close();
            reject(e);
          }
        }, 1000);
      } catch (e) {
        ws.close();
        reject(e);
      }
    });

    ws.on('error', reject);
  });
}

// ============ 主命令处理 ============

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage:');
    console.log('  node cdp.cjs detect              - 检测 Chrome 调试端口');
    console.log('  node cdp.cjs list               - 列出所有页面 tabs');
    console.log('  node cdp.cjs launch [url]       - 启动调试 Chrome 并可跳转 URL');
    console.log('  node cdp.cjs extract <urlPart>   - 从指定 tab 提取内容');
    console.log('  node cdp.cjs screenshot [tabIdx] - 截图');
    console.log('');
    console.log('Examples:');
    console.log('  node cdp.cjs list');
    console.log('  node cdp.cjs launch https://mp.weixin.qq.com/s/xxx');
    console.log('  node cdp.cjs extract mp.weixin.qq.com');
    console.log('  node cdp.cjs screenshot');
    process.exit(0);
  }

  // detect 命令
  if (command === 'detect') {
    const available = await checkChromeDebug();
    if (available) {
      console.log(`Chrome debug port ${DEBUG_PORT}: AVAILABLE`);
      const tabs = await getTabs();
      console.log(`Open tabs: ${tabs.length}`);
    } else {
      console.log(`Chrome debug port ${DEBUG_PORT}: NOT AVAILABLE`);
      console.log('Use "node cdp.cjs launch [url]" to start Chrome with debug mode');
    }
    return;
  }

  // launch 命令 - 启动 Chrome 调试模式
  if (command === 'launch') {
    const url = args[1] || null;
    const available = await checkChromeDebug();

    if (available) {
      console.error('Chrome debug already available, using existing session...');
      const tabs = await getTabs();
      console.error(`Found ${tabs.length} tabs`);
    } else {
      console.error('No Chrome debug found, launching new instance...');
      const launched = await launchDebugChrome(url);
      if (launched) {
        console.error('Chrome launched successfully!');
      } else {
        console.error('Failed to launch Chrome');
        process.exit(1);
      }
    }

    // URL 已通过 launchDebugChrome 传递给 Chrome
    console.log(JSON.stringify({ success: true, url }));
    return;
  }

  // list 命令 - 列出 tabs
  if (command === 'list') {
    const available = await checkChromeDebug();
    if (!available) {
      console.error('Chrome debug not available.');
      console.error('Run "node cdp.cjs launch" first to start Chrome with debug mode.');
      process.exit(1);
    }

    const tabs = await getTabs();
    console.log(`Chrome Debug Port: ${DEBUG_PORT}`);
    console.log(`\nPages (${tabs.length}):\n`);

    tabs.forEach((tab, i) => {
      console.log(`[${i}] ${tab.title || 'No title'}`);
      console.log(`    ${tab.url}`);
      console.log('');
    });
    return;
  }

  // extract 命令 - 提取页面内容
  if (command === 'extract') {
    const urlFilter = args[1];
    if (!urlFilter) {
      console.error('Usage: node cdp.cjs extract <urlPart>');
      process.exit(1);
    }

    const available = await checkChromeDebug();
    if (!available) {
      console.error('Chrome debug not available. Run "node cdp.cjs launch [url]" first.');
      process.exit(1);
    }

    const tabs = await getTabs();
    const tab = tabs.find(t => t.url && t.url.includes(urlFilter));

    if (!tab) {
      console.error(`No tab found matching: ${urlFilter}`);
      console.error('\nAvailable tabs:');
      tabs.forEach(t => console.error(`  - ${t.title} (${t.url})`));
      process.exit(1);
    }

    console.error(`Extracting from: ${tab.title}`);
    console.error(`URL: ${tab.url}`);

    try {
      const isWeixin = tab.url.includes('mp.weixin.qq.com');
      const extractJS = isWeixin ? WX_EXTRACT_JS : GENERAL_EXTRACT_JS;
      const result = await evalInTab(tab.webSocketDebuggerUrl, extractJS);
      console.log(result);
    } catch (e) {
      console.error('Extraction failed:', e.message);
      process.exit(1);
    }
    return;
  }

  // screenshot 命令
  if (command === 'screenshot') {
    const available = await checkChromeDebug();
    if (!available) {
      console.error('Chrome debug not available.');
      process.exit(1);
    }

    const tabs = await getTabs();
    if (tabs.length === 0) {
      console.error('No tabs found');
      process.exit(1);
    }

    const tabIdx = args[1] ? parseInt(args[1]) : 0;
    const tab = tabs[tabIdx];

    if (!tab) {
      console.error(`Tab ${tabIdx} not found`);
      process.exit(1);
    }

    console.error(`Taking screenshot of: ${tab.title}`);

    try {
      const result = await takeScreenshot(tab);
      console.log(JSON.stringify(result));
    } catch (e) {
      console.error('Screenshot failed:', e.message);
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run without arguments to see usage.');
  process.exit(1);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
