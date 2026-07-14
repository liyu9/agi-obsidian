var fs = require('fs');
var path = require('path');

function validateFile(mdFile) {
  var md = fs.readFileSync(mdFile, 'utf8');
  var mdDir = path.dirname(mdFile);
  var errors = 0, warnings = 0, fails = [], details = [];

  function fail(msg) { errors++; fails.push(msg); details.push({level:'FAIL',msg:msg}); }
  function warn(msg) { warnings++; details.push({level:'WARN',msg:msg}); }
  function pass(msg) { details.push({level:'PASS',msg:msg}); }

  if (md.length < 2000) { warn('内容过短: ' + md.length + ' chars'); } else { pass('长度: ' + md.length + ' chars'); }
  if (md.includes('仅可试看部分内容')) { fail('包含付费墙提示'); }
  if (!md.match(/^# .+/m)) { fail('缺少一级标题'); } else { pass('包含一级标题'); }

  var h2Count = (md.match(/^## /gm) || []).length;
  if (h2Count < 2) { warn('二级标题少: ' + h2Count); } else { pass('二级标题: ' + h2Count); }

  var lines = md.split('\n');
  var inTilde = false;
  var codeBlockOpen = 0;
  for (var li = 0; li < lines.length; li++) {
    if (lines[li].match(/^~~~/)) { inTilde = !inTilde; continue; }
    if (!inTilde && lines[li].match(/^```/)) { codeBlockOpen++; }
  }
  if (codeBlockOpen % 2 !== 0) { fail('代码块未闭合: ``` ' + codeBlockOpen + ' 次'); } else { pass('代码块闭合: ' + (codeBlockOpen / 2) + ' 个'); }

  var codeRegex = /```\n([\s\S]*?)```/g;
  var codeMatch, emptyCode = 0, codeIdx = 0;
  while ((codeMatch = codeRegex.exec(md)) !== null) {
    codeIdx++;
    if (codeMatch[1].trim().length === 0) { emptyCode++; fail('代码块 #' + codeIdx + ' 为空'); }
  }
  if (emptyCode === 0 && codeIdx > 0) { pass('无空代码块'); }

  var boldCount = (md.match(/\*\*[^*]+\*\*/g) || []).length;
  pass('Bold: ' + boldCount);
  var inlineCodeCount = (md.match(/`[^`\n]+`/g) || []).length;
  pass('Inline code: ' + inlineCodeCount);

  if (md.includes('&nbsp;')) { warn('包含未转换的 &nbsp;'); }

  var emptyHeadings = md.match(/^#{1,3}\s*$/gm);
  if (emptyHeadings) { fail('空标题: ' + emptyHeadings.length + ' 处'); } else { pass('无空标题'); }

  var brokenLinks = md.match(/\]\(\s*\)/g);
  if (brokenLinks) { warn('空链接: ' + brokenLinks.length + ' 处'); } else { pass('无空链接'); }

  if (!md.includes('---')) { warn('缺少来源分隔线'); } else { pass('包含来源分隔线'); }

  var imgRegex = /!\[.*?\]\((.*?)\)/g, im;
  var localImgs = 0, remoteImgs = 0;
  while ((im = imgRegex.exec(md)) !== null) {
    if (im[1].startsWith('http')) { remoteImgs++; }
    else {
      localImgs++;
      var fp = path.resolve(mdDir, im[1]);
      if (!fs.existsSync(fp)) { fail('图片不存在: ' + im[1]); }
      else { var size = fs.statSync(fp).size; if (size < 1024) { warn('图片过小: ' + im[1]); } }
    }
  }
  pass('图片: ' + (localImgs + remoteImgs) + ' (本地:' + localImgs + ', 远程:' + remoteImgs + ')');
  if (remoteImgs > 0) { warn(remoteImgs + ' 张图片未下载'); }

  return {
    pass: errors === 0,
    errors: errors,
    warnings: warnings,
    fails: fails,
    details: details,
    chars: md.length,
    bold: boldCount,
    inlineCode: inlineCodeCount
  };
}

module.exports = { validateFile: validateFile };

if (require.main === module) {
  var args = process.argv.slice(2);
  var JSON_MODE = false;
  if (args[0] === '--json') { JSON_MODE = true; args.shift(); }
  var mdFile = args[0];
  if (!mdFile) { console.error('Usage: node validate-lib.js [--json] <mdFile>'); process.exit(1); }

  var result = validateFile(mdFile);
  result.file = mdFile;

  if (JSON_MODE) {
    console.log(JSON.stringify(result));
  } else {
    console.log('\n=== 校验结果 ===');
    for (var i = 0; i < result.details.length; i++) {
      var d = result.details[i];
      if (d.level === 'PASS') console.log('✓ ' + d.msg);
      else if (d.level === 'WARN') console.log('⚠ ' + d.msg);
      else console.log('✗ ' + d.msg);
    }
    console.log('错误: ' + result.errors + ', 警告: ' + result.warnings);
    if (!result.pass) console.log('❌ 校验未通过');
    else console.log('✅ 校验通过' + (result.warnings > 0 ? ' (' + result.warnings + ' 条警告)' : ''));
  }
  if (!result.pass) process.exit(1);
}
