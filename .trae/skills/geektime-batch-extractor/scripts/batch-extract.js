const cdp = require('./cdp-utils');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

var LIST_FILE = process.argv[2];
var START_FROM = parseInt(process.argv[3]) || 0;
var BATCH_SIZE = parseInt(process.argv[4]) || 3;

if (!LIST_FILE) {
  console.error('Usage: node batch-extract.js <listFile> [startIndex] [batchSize]');
  process.exit(1);
}

var list = JSON.parse(fs.readFileSync(LIST_FILE, 'utf8'));
var baseDir = path.dirname(LIST_FILE);
var parentDir = path.dirname(baseDir);
var courseDirName = path.basename(baseDir);
var rawDataDir = path.join(parentDir, 'raw-data', courseDirName);

var items = list.slice(START_FROM);
var results = [];

function extractOne(article) {
  var saveDir = path.join(baseDir, article.dirName);
  var cacheDir = path.join(rawDataDir, article.dirName);
  fs.mkdirSync(path.join(saveDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(cacheDir, 'assets'), { recursive: true });
  try {
    var out = execSync('node extract-single.js ' + article.id + ' "' + saveDir + '" "' + cacheDir + '"', {
      cwd: __dirname,
      timeout: 120000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    var lines = out.trim().split('\n');
    var jsonLine = lines[lines.length - 1];
    return JSON.parse(jsonLine);
  } catch(e) {
    var stdout = e.stdout || '';
    var lines = stdout.trim().split('\n');
    var jsonLine = lines[lines.length - 1];
    try { return JSON.parse(jsonLine); } catch(ex) {}
    return { ok: false, id: article.id, error: e.message.substring(0, 100) };
  }
}

console.log('Total articles:', list.length);
console.log('Starting from:', START_FROM);
console.log('Items to process:', items.length);
console.log('Batch size:', BATCH_SIZE);
console.log('');

var batchNum = 0;
for (var i = 0; i < items.length; i += BATCH_SIZE) {
  batchNum++;
  var batch = items.slice(i, i + BATCH_SIZE);
  console.log('--- Batch ' + batchNum + ' (articles ' + (START_FROM + i + 1) + '-' + (START_FROM + i + batch.length) + ') ---');

  for (var j = 0; j < batch.length; j++) {
    var article = batch[j];
    process.stdout.write('  Extracting [' + article.id + '] ' + article.title.substring(0, 30) + '... ');
    var result = extractOne(article);
    results.push(result);
    if (result.ok) {
      console.log(result.validated ? 'OK (' + result.chars + 'c, ' + result.images + 'img)' : 'OK but validation FAILED: ' + (result.fails || []).join(', '));
    } else {
      console.log('FAILED: ' + result.error);
    }
  }
}

var okCount = results.filter(function(r) { return r.ok; }).length;
var failCount = results.filter(function(r) { return !r.ok; }).length;
var valFailCount = results.filter(function(r) { return r.ok && !r.validated; }).length;

console.log('\n=== Summary ===');
console.log('Processed:', results.length);
console.log('Success:', okCount);
console.log('Failed:', failCount);
console.log('Validation failures:', valFailCount);

if (failCount > 0 || valFailCount > 0) {
  console.log('\nFailed articles:');
  results.filter(function(r) { return !r.ok || !r.validated; }).forEach(function(r) {
    console.log('  ' + r.id + ': ' + (r.ok ? 'validation: ' + (r.fails||[]).join(', ') : r.error));
  });
}

console.log('\n' + JSON.stringify({total: results.length, ok: okCount, failed: failCount, valFailed: valFailCount}));
