import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1080 });

await page.goto('https://lcnziv86vkx6.feishu.cn/wiki/S9jow8TyXiItiqklkLcc3ESYnph?fromScene=spaceOverview');
await page.waitForLoadState('networkidle');

await page.evaluate(async () => {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 500);
        await delay(300);
    }
});

const textContent = await page.evaluate(() => {
    return document.body.innerText;
});

console.log('=== FULL TEXT CONTENT ===');
console.log(textContent);

await browser.close();