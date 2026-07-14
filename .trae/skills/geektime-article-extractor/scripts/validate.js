const { validateFile } = require('./validate-lib');

var args = process.argv.slice(2);
var JSON_MODE = false;
if (args[0] === '--json') { JSON_MODE = true; args.shift(); }
var mdFile = args[0];

if (!mdFile) {
  console.error('Usage: node validate.js [--json] <output.md>');
  process.exit(1);
}

var result = validateFile(mdFile);
result.file = mdFile;

if (JSON_MODE) {
  console.log(JSON.stringify(result));
} else {
  console.log('=== ' + require('path').basename(mdFile) + ' ===');
  for (var i = 0; i < result.details.length; i++) {
    var d = result.details[i];
    if (d.level === 'PASS') console.log('\u2713 ' + d.msg);
    else if (d.level === 'WARN') console.log('\u26A0 ' + d.msg);
    else console.log('\u2717 ' + d.msg);
  }
  console.log('\n=== \u6821\u9A8C\u7ED3\u679C ===');
  console.log('\u9519\u8BEF: ' + result.errors + ', \u8B66\u544A: ' + result.warnings);
  if (!result.pass) console.log('\u274C \u6821\u9A8C\u672A\u901A\u8FC7');
  else console.log('\u2705 \u6821\u9A8C\u901A\u8FC7' + (result.warnings > 0 ? ' (' + result.warnings + ' \u6761\u8B66\u544A)' : ''));
}

if (!result.pass) process.exit(1);
