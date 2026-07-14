const fs = require('fs');
const path = require('path');

function findMdFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findMdFiles(full));
      } else if (entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  } catch (ex) {}
  return results.sort();
}

const BASE_DIR = 'd:\\360MoveData\\Users\\admin\\Desktop\\AgiP\\AGI-obsidian\\极客时间\\批量提取\\AI大模型项目落地实战';

const files = findMdFiles(BASE_DIR);
let totalFixed = 0;
let totalFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // 修复空链接: ]() -> 移除链接标记，保留文字
  content = content.replace(/\[([^\]]*)\]\(\s*\)/g, '$1');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    const fixed = (original.match(/\]\(\s*\)/g) || []).length;
    totalFixed += fixed;
    totalFiles++;
    console.log(`✅ ${path.relative(BASE_DIR, file)}: 修复 ${fixed} 处空链接`);
  }
}

console.log(`\n修复完成: ${totalFiles} 个文件, 共 ${totalFixed} 处空链接`);
