const cdp = require('./cdp-utils');

cdp.findPort().then(p => {
  console.log('Port:', p || 'Not found');
  return p ? cdp.getTabs(p) : null;
}).then(tabs => {
  if (tabs) {
    const articles = tabs.filter(t => t.url && t.url.includes('geekbang.org/column/article/')).map(t => {
      const m = t.url.match(/article\/(\d+)/);
      return { id: m ? m[1] : null, title: t.title, url: t.url.substring(0, 100) };
    }).filter(a => a.id);
    console.log('极客时间文章标签页:', articles.length);
    console.log(JSON.stringify(articles, null, 2));
  }
}).catch(console.error);
