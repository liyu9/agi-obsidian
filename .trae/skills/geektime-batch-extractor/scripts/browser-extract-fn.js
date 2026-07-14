function(bt) {
  function processEl(bt) {
    return function(node) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return '';
      var tag = node.tagName.toUpperCase();
      var slateType = node.getAttribute ? node.getAttribute('data-slate-type') : null;
      var content = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        content += processEl(bt)(node.childNodes[i]);
      }
      if (slateType === 'bold') return '**' + content + '**';
      if (slateType === 'code') return bt + content + bt;
      if (slateType === 'mark-class') return content;
      if (tag === 'STRONG' || tag === 'B') return '**' + content + '**';
      if (tag === 'CODE') return bt + content + bt;
      if (tag === 'EM' || tag === 'I') return '_' + content + '_';
      if (tag === 'A') return '[' + content + '](' + (node.getAttribute('href') || '') + ')';
      if (tag === 'BR') return '\n';
      return content;
    };
  }

  function h2m(html, bt) {
    if (!html) return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    return processEl(bt)(div).trim();
  }

  function extractCode(block) {
    var lines = [];
    var codeLines = block.querySelectorAll('[data-slate-type="code-line"]');
    for (var i = 0; i < codeLines.length; i++) {
      var clone = codeLines[i].cloneNode(true);
      var lineNums = clone.querySelectorAll('[data-code-line-number]');
      for (var j = 0; j < lineNums.length; j++) lineNums[j].remove();
      var t = clone.textContent || '';
      if (t) lines.push(t);
    }
    if (lines.length === 0) lines.push(block.textContent || '');
    return lines.join('\n');
  }

  function extractList(block, bt) {
    var items = [];
    var lines = block.querySelectorAll('[data-slate-type="list-line"]');
    if (lines.length > 0) {
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].querySelector('[data-code-line-number]')) continue;
        var t = h2m(lines[i].innerHTML, bt);
        if (t) items.push(t);
      }
    }
    return items;
  }

  var content = document.querySelector('[class*="articleContent"]');
  if (!content) return JSON.stringify({error:'no content'});
  if (content.innerText.includes('\u4ec5\u53ef\u8bd5\u770b\u90e8\u5206\u5185\u5bb9') && content.innerText.length < 1000) return JSON.stringify({error:'paywall'});

  var allBlocks = content.querySelectorAll('[data-slate-object="block"]');
  var consumed = {};
  var result = [], images = [], seen = {};

  var headImg = content.querySelector('img[class*="headImg"]');
  if (headImg && headImg.src) {
    seen[headImg.src] = true;
    images.push({src:headImg.src, alt:'\u5934\u56fe'});
    result.push({type:'image', src:headImg.src, alt:'\u5934\u56fe', isHead:true});
  }

  for (var i = 0; i < allBlocks.length; i++) {
    if (consumed[i]) continue;
    var block = allBlocks[i];
    var t = block.getAttribute('data-slate-type');
    for (var j = i + 1; j < allBlocks.length; j++) {
      if (block.contains(allBlocks[j])) { consumed[j] = true; } else { break; }
    }
    if (t === 'heading') {
      var text = h2m(block.innerHTML, bt);
      if (text) result.push({type:'heading', level:block.tagName, text:text});
    } else if (t === 'paragraph') {
      var text = h2m(block.innerHTML, bt);
      if (text) result.push({type:'paragraph', text:text});
    } else if (t === 'pre') {
      var code = extractCode(block);
      if (code) result.push({type:'code', text:code});
    } else if (t === 'blockquote' || t === 'block-quote') {
      var text = h2m(block.innerHTML, bt);
      if (text) result.push({type:'blockquote', text:text});
    } else if (t === 'list') {
      var items = extractList(block, bt);
      if (items.length > 0) result.push({type:'list', items:items});
      else {
        var text = h2m(block.innerHTML, bt);
        if (text) result.push({type:'paragraph', text:text});
      }
    } else if (t === 'image') {
      var img = block.querySelector('img');
      if (img && img.src && !seen[img.src]) {
        seen[img.src] = true;
        images.push({src:img.src, alt:img.alt||''});
        result.push({type:'image', src:img.src, alt:img.alt||''});
      }
    }
  }

  var allImgs = content.querySelectorAll('img');
  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i];
    if (img.naturalWidth > 100 && !seen[img.src]) {
      seen[img.src] = true;
      images.push({src:img.src, alt:img.alt||''});
      result.push({type:'image', src:img.src, alt:img.alt||''});
    }
  }

  var title = (document.querySelector('h1') && document.querySelector('h1').textContent || '').trim();
  return JSON.stringify({title:title, blocks:result, images:images, totalBlocks:allBlocks.length, textLength:content.innerText.length});
}
