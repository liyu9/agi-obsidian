const { spawn } = require('child_process');
const path = require('path');

const SAVE_BASE = 'd:\\360MoveData\\Users\\admin\\Desktop\\AgiP\\AGI-obsidian\\极客时间\\批量提取\\AI大模型项目落地实战';
const CACHE_BASE = 'd:\\360MoveData\\Users\\admin\\Desktop\\AgiP\\AGI-obsidian\\极客时间\\批量提取\\raw-data\\AI大模型项目落地实战';
const SCRIPT = path.join(__dirname, 'extract-single.js');

const articles = [
  { id: '812552', title: '阶段自测题（一）', idx: '25' },
  { id: '816865', title: '阶段自测题（二）', idx: '26' },
  { id: '816929', title: '结束语｜融入AI技术革命浪潮，实现人生百倍提升', idx: '27' },
];

const results = [];
let completed = 0;

function sanitizeDir(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '');
}

function runExtract(article) {
  return new Promise((resolve) => {
    const dirName = article.idx + '-' + sanitizeDir(article.title);
    const saveDir = path.join(SAVE_BASE, dirName);
    const cacheDir = path.join(CACHE_BASE, dirName);
    
    console.log(`[${article.idx}] Starting: ${article.id} - ${article.title.substring(0, 30)}...`);
    
    const proc = spawn('node', [SCRIPT, article.id, saveDir, cacheDir], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      completed++;
      try {
        const result = stdout.trim() ? JSON.parse(stdout.trim()) : { ok: false, error: 'No output' };
        result.idx = article.idx;
        result.articleId = article.id;
        results.push(result);
        
        if (result.ok) {
          console.log(`[${article.idx}] ✅ Success: ${result.title ? result.title.substring(0, 40) : article.title}`);
        } else {
          console.log(`[${article.idx}] ❌ Failed: ${result.error || 'Unknown error'}`);
        }
      } catch (e) {
        console.log(`[${article.idx}] ❌ Parse error: ${e.message}`);
        results.push({ ok: false, idx: article.idx, articleId: article.id, error: e.message });
      }
      
      if (completed === articles.length) {
        console.log('\n=== Batch Complete ===');
        console.log(JSON.stringify({ total: articles.length, results: results }, null, 2));
      }
      resolve();
    });
    
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill();
        console.log(`[${article.idx}] ⏰ Timeout`);
        results.push({ ok: false, idx: article.idx, articleId: article.id, error: 'Timeout' });
        completed++;
        if (completed === articles.length) {
          console.log('\n=== Batch Complete ===');
          console.log(JSON.stringify({ total: articles.length, results: results }, null, 2));
        }
        resolve();
      }
    }, 180000);
  });
}

async function main() {
  console.log('Starting batch extraction...\n');
  await Promise.all(articles.map(runExtract));
}

main().catch(console.error);
