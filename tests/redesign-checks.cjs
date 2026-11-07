const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/app.css', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
const lessons = fs.readFileSync('js/lessons.js', 'utf8');
const checks = [
  ['English document language', () => assert.match(html, /<html lang="en">/)],
  ['Responsive viewport', () => assert.match(html, /width=device-width/)],
  ['Responsive app width', () => assert.match(css, /#app\s*\{[^}]*width:100%/s)],
  ['Rabbit R1 compact breakpoint', () => assert.match(css, /@media\s*\(max-width:300px\),\(max-height:350px\)/)],
  ['English settings label', () => assert.match(app, /Settings/)],
  ['English quiz instructions', () => assert.match(app, /What does this mean\?/)],
  ['English pronunciation controls', () => assert.match(app, /Play slowly/)],
  ['Arabic phrase rendering', () => assert.match(app, /lang=\\"ar\\"/)],
  ['Lessons are loaded', () => assert.match(lessons, /KALLIMNI_LESSONS/)]
];
let failed = 0;
for (const [name, check] of checks) {
  try { check(); console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, error.message); }
}
if (failed) process.exit(1);
console.log('Static checks passed. Browser and R1 device testing are still required.');
