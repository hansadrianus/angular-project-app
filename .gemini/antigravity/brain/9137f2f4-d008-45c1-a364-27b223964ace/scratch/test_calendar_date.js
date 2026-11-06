const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('.superpowers/brainstorm/1220-1793908881/content/prototype-v1.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });

// Check month groups
const months = Array.from(dom.window.document.querySelectorAll('.mo-group')).map(el => el.textContent);
console.log('Month Groups:', months);

// Check day column headers (first 7 days)
const dayHeaders = Array.from(dom.window.document.querySelectorAll('.gh-day')).slice(0, 7).map(el => {
  return {
    date: el.dataset.date,
    calDate: el.querySelector('.d-cal-date')?.textContent,
    dow: el.querySelector('.d-dow')?.textContent,
    class: el.className
  };
});
console.log('First 7 Day Headers:', dayHeaders);

// Check body day columns (first 7 days)
const bodyCols = Array.from(dom.window.document.querySelectorAll('.day-col')).slice(0, 7).map(el => {
  return {
    date: el.dataset.date,
    text: el.textContent.trim(),
    class: el.className
  };
});
console.log('First 7 Body Columns:', bodyCols);

// Check Zoom buttons
const zoomInBtn = dom.window.document.querySelector('[data-act="zoom-in"]');
const zoomOutBtn = dom.window.document.querySelector('[data-act="zoom-out"]');
console.log('Zoom In Btn exists:', !!zoomInBtn, 'Zoom Out Btn exists:', !!zoomOutBtn);

if (zoomInBtn) {
  zoomInBtn.click();
  const dayW = dom.window.document.querySelector('.gh-day')?.style.width;
  console.log('Day width after zoom in:', dayW);
}
