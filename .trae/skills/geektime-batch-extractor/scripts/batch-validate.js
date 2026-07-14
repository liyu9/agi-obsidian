const fs = require('fs');
const path = require('path');
const { validateFile, validateStructure } = require('./validate-lib');

function findMdFiles(dir) {
  var results = [];
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var full = path.join(dir, e.name);
      if (e.isDirectory()) results = results.concat(findMdFiles(full));
      else if (e.name.endsWith('.md')) results.push(full);
    }
  } catch (ex) {}
  return results.sort();
}

async function main() {
  var args = process.argv.slice(2);
  var JSON_MODE = false;
  if (args[0] === '--json') { JSON_MODE = true; args.shift(); }
  var baseDir = args[0];
  if (!baseDir) {
    console.error('Usage: node batch-validate.js [--json] "<baseDir>"');
    process.exit(1);
  }

  var files = findMdFiles(baseDir);
  if (files.length === 0) {
    console.error('No .md files found in: ' + baseDir);
    process.exit(1);
  }

  var results = [];
  var passCount = 0, failCount = 0;

  for (var i = 0; i < files.length; i++) {
    var r = validateFile(files[i]);
    r.file = path.relative(baseDir, files[i]);
    results.push(r);
    if (r.pass) passCount++;
    else failCount++;
  }

  var struct = validateStructure(baseDir);

  if (JSON_MODE) {
    console.log(JSON.stringify({total:files.length, pass:passCount, fail:failCount, results:results, structure:struct}));
  } else {
    console.log('Found ' + files.length + ' MD files\n');
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r.pass) {
        console.log('✅ ' + r.file + ' | ' + r.chars + 'c');
      } else {
        console.log('❌ ' + r.file + ' | FAIL ' + r.errors + ': ' + r.fails.join(', '));
      }
    }
    console.log('\n=== 目录结构校验 ===');
    struct.details.forEach(function(d) {
      if (d.level === 'PASS') console.log('✅ ' + d.msg);
      else if (d.level === 'WARN') console.log('⚠ ' + d.msg);
      else console.log('❌ ' + d.msg);
    });
    console.log('\n=== 汇总 ===');
    console.log('总计: ' + files.length + ' 篇');
    console.log('通过: ' + passCount + ' 篇');
    console.log('失败: ' + failCount + ' 篇');
    if (struct.errors > 0) console.log('结构错误: ' + struct.errors);
    if (failCount > 0 || struct.errors > 0) {
      console.log('\n失败列表:');
      for (var i = 0; i < results.length; i++) {
        if (!results[i].pass) console.log('  [文件] ' + results[i].file + ': ' + results[i].fails.join('; '));
      }
      struct.fails.forEach(function(f) { console.log('  [结构] ' + f); });
    }
  }

  if (failCount > 0) process.exit(1);
}

main();
