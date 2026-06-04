import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('flow page does not render the old supplement knowledge module', () => {
  const flowHtml = readFileSync('flow.html', 'utf8');
  const flowScript = readFileSync('flowPage.js', 'utf8');
  const indexHtml = readFileSync('index.html', 'utf8');

  assert.equal(flowHtml.includes('id="supplementPanel"'), false);
  assert.equal(flowHtml.includes('Supplement'), false);
  assert.equal(flowHtml.includes('<h2>补充知识</h2>'), false);
  assert.equal(flowScript.includes('supplementFile'), false);
  assert.equal(flowScript.includes('supplementButton'), false);
  assert.equal(flowScript.includes('addSupplement'), false);
  assert.equal(indexHtml.includes('id="supplementUploadZone"'), true);
});
