const puppeteer = require('puppeteer');
const path = require('path');
(async ()=>{
  try{
    const svgPath = path.resolve(__dirname,'diagram-give-victory-player1.svg');
    const outPath = path.resolve(__dirname,'diagram-give-victory-player1.png');
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setViewport({width:1100,height:700});
    await page.goto('file:///' + svgPath);
    await page.screenshot({path: outPath});
    await browser.close();
    console.log('DONE', outPath);
  }catch(e){
    console.error('ERROR', e);
    process.exit(2);
  }
})();