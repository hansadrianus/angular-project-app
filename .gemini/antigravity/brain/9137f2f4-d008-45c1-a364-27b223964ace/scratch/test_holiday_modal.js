const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('.superpowers/brainstorm/1220-1793908881/content/prototype-v1.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });

// 1. Add Holiday test
const dayEl = dom.window.document.querySelector('.gh-day[data-date="2026-10-07"]');
dayEl.click();
const inp = dom.window.document.getElementById('popHolName');
inp.value = 'Company Day Off';
const addBtn = dom.window.document.querySelector('[data-popact="add-holiday"]');
addBtn.click();

const updatedDay = dom.window.document.querySelector('.gh-day[data-date="2026-10-07"]');
console.log('Day 2026-10-07 class after add holiday:', updatedDay.className);
console.log('Day 2026-10-07 title:', updatedDay.getAttribute('title'));

const dayCol = dom.window.document.querySelector('.day-col[data-date="2026-10-07"]');
console.log('Day 2026-10-07 body column class:', dayCol.className);
console.log('Day 2026-10-07 badge:', dayCol.innerHTML);

// 2. Open Holidays & Weekends manager test
const hBtn = dom.window.document.querySelector('[data-act="holidays"]');
hBtn.click();
const ovl = dom.window.document.getElementById('ovl');
console.log('Holidays modal opened:', !!ovl);
console.log('Modal contains "Holidays & Weekends Manager":', ovl.textContent.includes('Holidays & Weekends Manager'));
