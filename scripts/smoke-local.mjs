import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const password=readFileSync('data/LOCAL-LOGIN.txt','utf8').match(/^Password: (.+)$/m)[1];
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://localhost:3000/login');
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.waitForURL('http://localhost:3000/');
 await page.goto('http://localhost:3000/ai-connections');
 await page.getByRole('heading',{name:'AI connections',exact:true}).waitFor();
 await page.screenshot({path:'outputs/ai-connections.png',fullPage:true});
 console.log('Production login and AI connections page verified.');
} finally {await browser.close();}
