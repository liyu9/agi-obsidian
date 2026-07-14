const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const IMG_SUBDIR = 'images';

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const lib = u.protocol === 'https:' ? https : http;
        lib.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchHtml(res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(destPath)) return resolve();
        const u = new URL(url);
        const lib = u.protocol === 'https:' ? https : http;
        const file = fs.createWriteStream(destPath);
        lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                fs.unlink(destPath, () => {});
                return resolve(downloadFile(res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href, destPath));
            }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => { file.close(); fs.unlink(destPath, () => {}); reject(err); });
    });
}

function convertBlockquotes(html) {
    return html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, inner) => {
        let content = inner.trim();
        content = content.replace(/<\/?p[^>]*>/gi, '\n');
        content = content.replace(/<br\s*\/?>/gi, '\n');
        content = content.replace(/<strong>(.*?)<\/strong>/gis, '**$1**');
        content = content.replace(/<b>(.*?)<\/b>/gis, '**$1**');
        content = content.replace(/<em>(.*?)<\/em>/gis, '*$1*');
        content = content.replace(/<i>(.*?)<\/i>/gis, '*$1*');
        content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)');
        content = content.replace(/<code>(.*?)<\/code>/gis, '`$1`');
        content = content.replace(/<[^>]+>/g, '');
        content = content.replace(/&nbsp;/g, ' ');
        content = content.replace(/&amp;/g, '&');
        content = content.replace(/&lt;/g, '<');
        content = content.replace(/&gt;/g, '>');
        content = content.replace(/&quot;/g, '"');
        content = content.replace(/&#39;/g, "'");
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.replace(/^\n+|\n+$/g, '');
        const lines = content.split('\n').filter(l => l.length > 0);
        const quoted = lines.map(l => '> ' + l).join('\n');
        return '\n\n' + quoted + '\n\n';
    });
}

function convertTables(html) {
    return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, inner) => {
        let mdTable = '';
        const hasHeader = /<thead/i.test(inner);

        let rowsHtml = inner;
        rowsHtml = rowsHtml.replace(/<thead[^>]*>([\s\S]*?)<\/thead>/gi, '$1');
        rowsHtml = rowsHtml.replace(/<tbody[^>]*>([\s\S]*?)<\/tbody>/gi, '$1');

        const rows = [];
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(rowsHtml)) !== null) {
            const cells = [];
            const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
                let cellContent = cellMatch[2].trim();
                cellContent = cellContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
                cells.push(cellContent);
            }
            if (cells.length > 0) rows.push(cells);
        }

        if (rows.length === 0) return match;

        const colCount = Math.max(...rows.map(r => r.length));
        const padded = rows.map(r => {
            while (r.length < colCount) r.push('');
            return r;
        });

        const headerRow = padded[0];
        const bodyRows = padded.slice(1);
        const allRows = hasHeader && bodyRows.length > 0 ? bodyRows : padded;

        const joinedRows = hasHeader && bodyRows.length > 0
            ? [headerRow, ...bodyRows]
            : padded;

        mdTable += '| ' + joinedRows[0].join(' | ') + ' |\n';
        mdTable += '| ' + joinedRows[0].map(() => '---').join(' | ') + ' |\n';

        for (const row of joinedRows.slice(1)) {
            mdTable += '| ' + row.join(' | ') + ' |\n';
        }

        return `\n${mdTable}\n`;
    });
}

function htmlToMarkdown(html, courseNum) {
    const images = [];
    let md = html;

    md = md.replace(/<figure class="highlight[^>]*>[\s\S]*?<td class="code"><pre>([\s\S]*?)<\/pre><\/td>[\s\S]*?<\/figure>/gi, (match, code) => {
        return '\n```\n' + code.trim() + '\n```\n';
    });
    md = md.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, '$1');
    md = md.replace(/<\/?figcaption[^>]*>/gi, '');

    md = convertTables(md);

    md = convertBlockquotes(md);

    md = md.replace(/<img[^>]*>/gi, (match) => {
        const srcMatch = match.match(/src="([^"]+)"/i);
        if (!srcMatch) return match;
        const src = srcMatch[1];
        const altMatch = match.match(/alt="([^"]*)"/i);
        const alt = altMatch ? altMatch[1] : '';
        const filename = path.basename(src).replace(/\?.*$/, '');
        const decoded = decodeURIComponent(filename);
        images.push({ url: src, filename: decoded, alt });
        return `\n![${alt || decoded}](images/course_${courseNum}/${decoded})\n`;
    });

    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gis, '\n# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n### $1\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gis, '\n#### $1\n');

    md = md.replace(/<pre[^>]*>/gi, '\n```\n');
    md = md.replace(/<\/pre>/gi, '\n```\n');

    md = md.replace(/<span class="line"[^>]*>/gi, '');
    md = md.replace(/<\/span>/gi, '');

    md = md.replace(/<strong>(.*?)<\/strong>/gis, '**$1**');
    md = md.replace(/<b>(.*?)<\/b>/gis, '**$1**');
    md = md.replace(/<em>(.*?)<\/em>/gis, '*$1*');
    md = md.replace(/<i>(.*?)<\/i>/gis, '*$1*');

    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)');
    md = md.replace(/<code>(.*?)<\/code>/gis, '`$1`');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    md = md.replace(/<\/p>/gi, '\n\n');
    md = md.replace(/<p[^>]*>/gi, '');

    md = md.replace(/<li[^>]*>/gi, '\n- ');
    md = md.replace(/<\/li>/gi, '');
    md = md.replace(/<\/?ul[^>]*>/gi, '\n');
    md = md.replace(/<\/?ol[^>]*>/gi, '\n');

    md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
    md = md.replace(/# \[\]\(#.*?\)/g, '# ');
    md = md.replace(/<a[^>]*class="[^"]*header-anchor[^"]*"[^>]*>.*?<\/a>/gi, '');
    md = md.replace(/\n\s*\n\s*\n/g, '\n\n');

    const blocks = md.split('```');
    for (let i = 1; i < blocks.length; i += 2) {
        const lines = blocks[i].trim().split('\n');
        const isLineNumbers = lines.every(l => /^\d+$/.test(l.trim()));
        if (isLineNumbers && i + 2 < blocks.length) {
            blocks[i] = '\n' + blocks[i + 1].trim() + '\n';
            blocks[i + 1] = '';
        }
    }
    md = blocks.join('```');

    md = md.replace(/```\n+```/g, '');
    md = md.replace(/```\n+```/g, '').replace(/\n{4,}/g, '\n\n\n');

    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    md = md.replace(/&#x27;/g, "'");

    md = md.replace(/^\s+```/gm, '```');

    return { markdown: md, images };
}

function extractTitle(html, url) {
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
        let title = titleMatch[1].trim()
            .replace(/\s*[-–—|]\s*我没有三颗心脏的博客.*$/, '')
            .replace(/\s*[-–—|]\s*.*[博博客].*$/, '')
            .replace(/[<>:"/\\|?*]/g, '');
        return title;
    }
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) return h1Match[1].replace(/<[^>]+>/g, '').trim().replace(/[<>:"/\\|?*]/g, '');
    const urlPath = new URL(url).pathname.replace(/\/$/, '');
    return urlPath.split('/').pop() || 'article';
}

function extractArticle(html) {
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) return articleMatch[1];

    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) return mainMatch[1];

    const contentMatch = html.match(/<div[^>]*class="[^"]*(?:content|post-content|article-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch) return contentMatch[1];

    return html;
}

function fixEncoding(mdPath) {
    try {
        const content = fs.readFileSync(mdPath, 'utf-8');
        const cleaned = content.replace(/\uFFFD/g, '').replace(/\?{2,}/g, '');
        if (cleaned !== content) {
            fs.writeFileSync(mdPath, cleaned, 'utf-8');
            return true;
        }
        return false;
    } catch (e) {
        console.log(`  ⚠ 编码修复失败: ${e.message}`);
        return false;
    }
}

function countCodeBlocksFences(content) {
    const count = (content.match(/```/g) || []).length;
    return count % 2 === 0;
}

async function processArticle(url, num, saveDir) {
    console.log(`\n[${num}] ${url}`);

    const html = await fetchHtml(url);
    const title = extractTitle(html, url);
    const articleHtml = extractArticle(html);

    const courseImgDir = path.join(saveDir, IMG_SUBDIR, `course_${num}`);
    fs.mkdirSync(courseImgDir, { recursive: true });

    const { markdown, images } = htmlToMarkdown(articleHtml, num);

    let downloaded = 0;
    for (const img of images) {
        const imgPath = path.join(courseImgDir, img.filename);
        if (!fs.existsSync(imgPath)) {
            try {
                await downloadFile(img.url, imgPath);
                downloaded++;
            } catch (e) {
                console.log(`  ✗ 下载失败: ${img.filename}`);
            }
        }
    }
    if (downloaded > 0) console.log(`  ↓ ${downloaded} 张图片`);

    let finalMd = `# ${title}\n\n`;
    finalMd += `> 课程来源：${url}\n\n`;
    finalMd += `---\n\n`;
    finalMd += markdown.trim() + '\n\n';
    finalMd += `---\n\n`;
    finalMd += `*笔记整理日期：${new Date().toISOString().split('T')[0]}*\n`;

    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '');
    const mdPath = path.join(saveDir, `${num}-${safeTitle}.md`);
    fs.writeFileSync(mdPath, finalMd, 'utf-8');

    fixEncoding(mdPath);

    const fencesOk = countCodeBlocksFences(fs.readFileSync(mdPath, 'utf-8'));
    console.log(`[${num}] ✓ ${path.basename(mdPath)} (${images.length}图片, 代码块${fencesOk ? '✓' : '⚠'})`);

    return { num, title, images: images.length, fencesOk };
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log('用法:');
        console.log('  单篇: node extract-article.cjs <url> <"保存目录">');
        console.log('  批量(序号): node extract-article.cjs --batch <URL模式> <起始> <结束> <"保存目录">');
        console.log('  批量(列表): node extract-article.cjs --urls <urls.json> <"保存目录">');
        console.log('  修复编码: node extract-article.cjs --fix <"保存目录">');
        return;
    }

    if (args[0] === '--fix') {
        const fixDir = args[1] || '.';
        const mdFiles = fs.readdirSync(fixDir).filter(f => f.endsWith('.md')).map(f => path.join(fixDir, f));
        let fixed = 0;
        for (const f of mdFiles) {
            if (fixEncoding(f)) { fixed++; console.log(`  ✓ ${path.basename(f)}`); }
        }
        console.log(`\n修复完成: ${fixed} 个文件`);
        return;
    }

    if (args[0] === '--batch') {
        const urlPattern = args[1];
        const start = parseInt(args[2]);
        const end = parseInt(args[3]);
        const saveDir = args[4] || '.';

        if (!urlPattern || isNaN(start) || isNaN(end)) {
            console.log('错误: --batch 需要 <URL模式> <起始> <结束> [保存目录]');
            return;
        }

        fs.mkdirSync(saveDir, { recursive: true });

        console.log(`批量提取 ${start}-${end}: ${urlPattern}\n`);

        const results = [];
        for (let i = start; i <= end; i++) {
            const url = urlPattern.replace(/\{n\}/g, String(i));
            try {
                const r = await processArticle(url, i, saveDir);
                results.push(r);
            } catch (e) {
                console.log(`[${i}] ✗ 失败: ${e.message}`);
            }
        }

        console.log(`\n=== 完成: ${results.length}/${end - start + 1} 篇 ===`);
        const totalImages = results.reduce((s, r) => s + r.images, 0);
        const fencesIssues = results.filter(r => !r.fencesOk);
        console.log(`图片: ${totalImages} 张`);
        if (fencesIssues.length > 0) console.log(`代码块警告: ${fencesIssues.map(r => r.num).join(', ')}`);
        return;
    }

    if (args[0] === '--urls') {
        const listFile = args[1];
        const saveDir = args[2] || '.';

        if (!listFile) {
            console.log('错误: --urls 需要 <urls.json> [保存目录]');
            return;
        }

        const urls = JSON.parse(fs.readFileSync(listFile, 'utf-8'));
        fs.mkdirSync(saveDir, { recursive: true });

        console.log(`批量提取 ${urls.length} 篇\n`);

        const results = [];
        for (const item of urls) {
            try {
                const r = await processArticle(item.url, item.num || results.length + 1, saveDir);
                results.push(r);
            } catch (e) {
                console.log(`[${item.url}] ✗ 失败: ${e.message}`);
            }
        }

        console.log(`\n=== 完成: ${results.length}/${urls.length} 篇 ===`);
        return;
    }

    const url = args[0];
    const saveDir = args[1] || '.';

    const urlPath = new URL(url).pathname.replace(/\/$/, '');
    const num = parseInt(urlPath.split('/').pop()) || 1;

    fs.mkdirSync(saveDir, { recursive: true });

    await processArticle(url, num, saveDir);
    console.log('\n完成!');
}

main().catch(e => {
    console.error('错误:', e.message);
    process.exit(1);
});