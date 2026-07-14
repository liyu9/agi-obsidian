const WebSocket = require('ws');
const http = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

let _msgId = 1;
function sendWs(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = _msgId++;
    const handler = (msg) => {
      const data = JSON.parse(msg);
      if (data.id === id) {
        ws.removeListener('message', handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const data = await httpGet('http://127.0.0.1:9222/json');
  const tabs = JSON.parse(data).filter(t => t.type === 'page');
  const tab = tabs.find(t => t.url.includes('sanjieke.cn/lesson'));
  if (!tab) { console.error('Tab not found'); process.exit(1); }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.on('open', async () => {
    await sendWs(ws, 'Runtime.enable', {});

    // Step 1: Find the transcript/文稿 element more thoroughly
    const findJs = `(() => {
      const result = {};
      
      // Search all elements containing '文稿'
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      const wengaoElements = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text === '文稿' || text === '文稿 ') {
          wengaoElements.push({
            tag: node.tagName,
            className: node.className,
            id: node.id,
            text: text,
            parentClass: node.parentElement?.className || '',
            parentId: node.parentElement?.id || '',
            parentTag: node.parentElement?.tagName || '',
            grandparentClass: node.parentElement?.parentElement?.className || '',
            outerHTML: node.outerHTML.substring(0, 300)
          });
        }
      }
      result.wengaoElements = wengaoElements;
      
      // Also check for any API URLs related to transcript
      const perfEntries = performance.getEntriesByType('resource');
      result.apiUrls = perfEntries
        .filter(e => e.name.includes('transcript') || e.name.includes('manuscript') || e.name.includes('text') || e.name.includes('content') || e.name.includes('note') || e.name.includes('wen-gao') || e.name.includes('wengao'))
        .map(e => e.name);
      
      // Check all script tags for API endpoints
      const scripts = document.querySelectorAll('script');
      result.scriptCount = scripts.length;
      
      // Try to find the video_id and lesson_id from the page
      const lessonIdMatch = window.location.href.match(/lesson\\/0\\/(\\d+)\\/(\\d+)/);
      result.courseId = lessonIdMatch ? lessonIdMatch[1] : null;
      result.classId = lessonIdMatch ? lessonIdMatch[2] : null;
      
      return JSON.stringify(result);
    })()`;

    const findResult = await sendWs(ws, 'Runtime.evaluate', {
      expression: findJs,
      returnByValue: true,
      timeout: 10000
    });

    const parsed = JSON.parse(findResult.result.value);
    console.error('Found elements:', JSON.stringify(parsed.wengaoElements, null, 2));
    console.error('API URLs:', JSON.stringify(parsed.apiUrls, null, 2));
    console.error('Course/Class ID:', parsed.courseId, parsed.classId);

    // Step 2: Try to click the 文稿 element
    if (parsed.wengaoElements.length > 0) {
      const el = parsed.wengaoElements[0];
      const clickJs = `(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.trim() === '文稿') {
            node.click();
            return 'Clicked: ' + node.tagName + '.' + node.className;
          }
        }
        return 'Not found for click';
      })()`;

      const clickResult = await sendWs(ws, 'Runtime.evaluate', {
        expression: clickJs,
        returnByValue: true,
        timeout: 5000
      });
      console.error('Click result:', clickResult.result.value);

      // Wait for content to load
      await new Promise(r => setTimeout(r, 3000));

      // Step 3: Extract transcript content
      const extractJs = `(() => {
        const result = {};
        const body = document.body.innerText;
        result.textLength = body.length;
        result.text = body;
        
        // Look for any new content that appeared
        const allDivs = document.querySelectorAll('div');
        result.newContentDivs = [];
        allDivs.forEach(d => {
          const text = d.innerText.trim();
          if (text.length > 200 && text.length < 50000) {
            const cls = d.className || '';
            if (cls && typeof cls === 'string') {
              result.newContentDivs.push({
                className: cls.substring(0, 100),
                textLength: text.length,
                preview: text.substring(0, 300)
              });
            }
          }
        });
        
        return JSON.stringify(result);
      })()`;

      const extractResult = await sendWs(ws, 'Runtime.evaluate', {
        expression: extractJs,
        returnByValue: true,
        timeout: 10000
      });

      const extractParsed = JSON.parse(extractResult.result.value);
      // Only output the relevant content
      if (extractParsed.newContentDivs.length > 0) {
        console.log(JSON.stringify(extractParsed.newContentDivs, null, 2));
      } else {
        console.log('No new transcript content found');
        console.log('Full text length:', extractParsed.textLength);
      }
    }

    // Step 4: Try the transcript API directly
    if (parsed.courseId && parsed.classId) {
      console.error('\nTrying transcript API...');
      const apiJs = `(() => {
        return new Promise((resolve) => {
          const courseId = '${parsed.courseId}';
          const classId = '${parsed.classId}';
          
          // Try fetching transcript API
          const apis = [
            '/api/course/transcript?course_id=' + courseId + '&class_id=' + classId,
            '/api/lesson/transcript?course_id=' + courseId + '&class_id=' + classId,
            '/api/v1/course/transcript?course_id=' + courseId + '&class_id=' + classId,
            '/api/v1/lesson/transcript?course_id=' + courseId + '&class_id=' + classId,
            '/api/course/' + courseId + '/lesson/' + classId + '/transcript',
            '/api/v1/course/' + courseId + '/lesson/' + classId + '/transcript',
          ];
          
          Promise.all(apis.map(url => 
            fetch(url).then(r => ({ url, status: r.status, ok: r.ok }))
              .catch(e => ({ url, error: e.message }))
          )).then(results => {
            resolve(JSON.stringify(results));
          });
        });
      })()`;

      const apiResult = await sendWs(ws, 'Runtime.evaluate', {
        expression: apiJs,
        returnByValue: true,
        awaitPromise: true,
        timeout: 15000
      });

      console.log('API results:', apiResult.result.value);
    }

    ws.close();
    process.exit(0);
  });

  ws.on('error', (e) => { console.error('WS Error:', e.message); process.exit(1); });
}

main();
