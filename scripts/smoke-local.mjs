// Run with a locally available Playwright installation; never downloads renderer assets.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium} = await import(process.env.ORB_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.ORB_BROWSER_CHANNEL ? {channel: process.env.ORB_BROWSER_CHANNEL} : {})});
await mkdir(new URL('../artifacts/', import.meta.url), {recursive: true});
try {
  for (const port of (process.env.ORB_TEST_PORTS || '5173,4173').split(',').map(Number)) {
    const page = await browser.newPage({viewport: {width: 900, height: 700}, deviceScaleFactor: 2});
    const errors = [], failed = [], remote = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) failed.push([r.status(), r.url()]); });
    page.on('requestfailed', r => failed.push([r.failure(), r.url()]));
    page.on('request', r => {
      if (!r.url().startsWith('http://localhost:') && !r.url().startsWith('data:')) remote.push(r.url());
    });
    await page.addInitScript(() => {
      window.audit = {ready: 0, rendered: 0, draws: 0};
      window.addEventListener('message', e => {
        if (e.data?.type === 'ready') window.audit.ready++;
        if (e.data?.type === 'rendered') window.audit.rendered++;
      });
      const original = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function (...args) {
        window.audit.draws++;
        return original.apply(this, args);
      };
    });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('#orb[data-renderer="ready"]');
    await page.waitForSelector('iframe[data-rendered="true"]');
    const frame = page.frames().find(f => f.url().includes('authorized-renderer/frame.html'));
    assert(frame);
    await page.waitForFunction(() => window.audit.rendered > 15);
    const first = await frame.locator('canvas').screenshot();
    const count = await page.evaluate(() => window.audit.rendered);
    await page.waitForFunction(n => window.audit.rendered > n + 20, count);
    const second = await frame.locator('canvas').screenshot();
    assert(!first.equals(second), 'Animated frames must differ');
    const gpu = await frame.evaluate(() => {
      const c = document.querySelector('canvas'), gl = c.getContext('webgl2');
      return {width: c.width, height: c.height, webgl: !!gl, draws: window.audit.draws, error: gl.getError()};
    });
    assert.equal(gpu.width, 600);
    assert.equal(gpu.height, 600);
    assert(gpu.draws > 0);
    assert.equal(gpu.error, 0);
    await page.screenshot({path: new URL(`../artifacts/orb-${port}.png`, import.meta.url).pathname});
    await page.setViewportSize({width: 280, height: 400});
    await page.waitForFunction(() => document.querySelector('iframe').getBoundingClientRect().width === 224);
    await frame.waitForFunction(() => document.querySelector('canvas').width === 448);
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(remote, []);
    console.log(JSON.stringify({port, gpu, audit: await page.evaluate(() => window.audit),
      responsive: '224 CSS px / 448 backing px', animation: true, errors, failed, remote}));
    await page.close();
  }
} finally {
  await browser.close();
}
