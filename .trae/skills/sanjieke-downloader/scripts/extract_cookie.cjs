#!/usr/bin/env node
/**
 * 三节课Cookie提取器
 * 从Chrome DevTools获取cookie
 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');

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

async function getTabs() {
  const data = await httpGet(`http://127.0.0.1:${DEBUG_PORT}/json`);
  return JSON.parse(data).filter(t => t.type === 'page');
}

function sendWs(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
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
    setTimeout(() => {
      ws.removeListener('message', handler);
      reject(new Error('WebSocket timeout'));
    }, TIMEOUT);
  });
}

async function getCookies(wsUrl, urls) {
  const ws = new WebSocket(wsUrl);
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Get cookies timeout'));
    }, TIMEOUT);

    ws.on('open', async () => {
      try {
        const result = await sendWs(ws, 'Network.getCookies', { urls });
        ws.close();
        clearTimeout(timer);
        resolve(result);
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

async function main() {
  try {
    console.error('正在连接Chrome DevTools...');
    const tabs = await getTabs();
    
    // 找到三节课的tab
    const sanjiekeTab = tabs.find(t => t.url && t.url.includes('sanjieke.cn'));
    
    if (!sanjiekeTab) {
      console.error('未找到三节课页面。请先在Chrome中打开三节课网站并登录。');
      console.error('已打开的页面:');
      tabs.forEach(t => console.error(`  - ${t.title}: ${t.url}`));
      process.exit(1);
    }

    console.error(`找到三节课页面: ${sanjiekeTab.title}`);
    console.error(`URL: ${sanjiekeTab.url}`);
    console.error('正在提取cookie...');

    // 获取cookies
    const result = await getCookies(sanjiekeTab.webSocketDebuggerUrl, [
      'https://www.sanjieke.cn',
      'https://web-api.sanjieke.cn'
    ]);

    const cookies = result.cookies || [];
    
    if (cookies.length === 0) {
      console.error('未找到任何cookie。请确保您已登录三节课。');
      process.exit(1);
    }

    // 格式化为cookie字符串
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log(cookieStr);
    
    // 同时输出_jwt字段（如果存在）
    const jwtCookie = cookies.find(c => c.name === '_sjk_jwt');
    if (jwtCookie) {
      console.error(`\n找到JWT token: ${jwtCookie.value.substring(0, 50)}...`);
    } else {
      console.error('\n警告: 未找到 _sjk_jwt cookie，可能无法下载');
    }

  } catch (e) {
    console.error('提取cookie失败:', e.message);
    console.error('请确保Chrome已开启调试模式（运行 node cdp.cjs launch）');
    process.exit(1);
  }
}

main();
