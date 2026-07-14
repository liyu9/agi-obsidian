const fs = require('fs');
const path = require('path');

var baseDir = process.argv[2];
if (!baseDir) { console.error('Usage: node batch-validate.js <baseDir>'); process.exit(1); }

function findMdFiles(dir) {
  var results = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var e of entries) {
    var full = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(findMdFiles(full));
    else if (e.name.endsWith('.md')) results.push(full);
  }
  return results.sort();
}

function validate(mdFile) {
  var md = fs.readFileSync(mdFile, 'utf8');
  var mdDir = path.dirname(mdFile);
  var errors = 0, warnings = 0, fails = [], warns = [];

  if (md.length < 2000) { warnings++; warns.push('内容过短:' + md.length + '(短文)'); }
  if (md.includes('仅可试看部分内容')) { errors++; fails.push('付费墙'); }
  if (!md.match(/^# .+/m)) { errors++; fails.push('缺少一级标题'); }

  var codeBlockOpen = (md.match(/```/g) || []).length;
  if (codeBlockOpen % 2 !== 0) { errors++; fails.push('代码块未闭合'); }

  var codeRegex = /```\n([\s\S]*?)```/g, codeIdx = 0, cm;
  while ((cm = codeRegex.exec(md)) !== null) {
    codeIdx++;
    if (cm[1].trim().length === 0) { errors++; fails.push('代码块#' + codeIdx + '为空'); }
  }

  var h2Count = (md.match(/^## /gm) || []).length;
  if (h2Count < 2) { warnings++; warns.push('二级标题少:' + h2Count); }

  var boldCount = (md.match(/\*\*[^*]+\*\*/g) || []).length;
  var inlineCodeCount = (md.match(/`[^`\n]+`/g) || []).length;

  var emptyH = md.match(/^#{1,3}\s*$/gm);
  if (emptyH) { errors++; fails.push('空标题' + emptyH.length + '处'); }

  var brokenLinks = md.match(/\]\(\s*\)/g);
  if (brokenLinks) { warnings++; warns.push('空链接' + brokenLinks.length + '处(原文交叉引用)'); }

  var imgRegex = /!\[.*?\]\((.*?)\)/g, im, imgMissing = 0, imgTotal = 0;
  while ((im = imgRegex.exec(md)) !== null) {
    imgTotal++;
    if (!im[1].startsWith('http')) {
      var fp = path.resolve(mdDir, im[1]);
      if (!fs.existsSync(fp)) { errors++; fails.push('图片不存在:' + im[1]); imgMissing++; }
    }
  }

  return {
    file: path.basename(mdFile),
    chars: md.length,
    pass: errors === 0,
    errors: errors,
    warnings: warnings,
    fails: fails,
    warns: warns,
    bold: boldCount,
    inlineCode: inlineCodeCount,
    codeBlocks: codeIdx,
    images: imgTotal
  };
}

var files = findMdFiles(baseDir);
console.log('Found ' + files.length + ' MD files\n');

var results = [];
var passCount = 0, failCount = 0;

for (var f of files) {
  var r = validate(f);
  results.push(r);
  var shortName = r.file.replace(/^[0-9]*｜/, '').substring(0, 30);
  if (r.pass) {
    passCount++;
    console.log('✅ ' + r.file.substring(0, 40) + ' | ' + r.chars + 'c B:' + r.bold + ' IC:' + r.inlineCode + ' CB:' + r.codeBlocks + ' IMG:' + r.images);
  } else {
    failCount++;
    console.log('❌ ' + r.file.substring(0, 40) + ' | FAIL ' + r.errors + ': ' + r.fails.join(', '));
  }
}

console.log('\n=== 汇总 ===');
console.log('总计: ' + files.length + ' 篇');
console.log('通过: ' + passCount + ' 篇');
console.log('失败: ' + failCount + ' 篇');

if (failCount > 0) {
  console.log('\n失败列表:');
  for (var r of results) {
    if (!r.pass) console.log('  ' + r.file + ': ' + r.fails.join('; '));
  }
}
