var src = require('fs').readFileSync(require('path').join(__dirname, 'extract-single.js'), 'utf8');
var start = src.indexOf('var EXTRACT_IN_BROWSER');
var end = src.indexOf('})();', start) + ');'.length;
var decl = src.substring(start, end);
var evalStr = '(' + decl.replace('var EXTRACT_IN_BROWSER = ', '') + ')(String.fromCharCode(96))';
require('fs').writeFileSync(require('path').join(__dirname, '_debug_expr.txt'), evalStr, 'utf8');
console.log('Written', evalStr.length, 'chars');
console.log('Last 100:', evalStr.substring(evalStr.length - 100));
