const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('.superpowers/brainstorm/1220-1793908881/content/prototype-v1.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });

dom.window.addEventListener('error', e => {
  console.error('Window error event:', e.error);
});

try {
  const dayEl = dom.window.document.querySelector('.gh-day');
  console.log('dayEl:', dayEl.dataset.date);
  dayEl.click();
  const btn = dom.window.document.querySelector('[data-popact="mark-nonwork"]');
  console.log('btn found:', !!btn);
  btn.click();
  const updatedDayEl = dom.window.document.querySelector('.gh-day[data-date="2026-10-02"]');
  console.log('updatedDayEl class:', updatedDayEl.className);
} catch (err) {
  console.error('Caught error in test:', err);
}
