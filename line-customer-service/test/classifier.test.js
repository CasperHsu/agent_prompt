import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, matchFaq, detectRedline } from '../src/classifier.js';

test('FAQ：分期付款命中 B2', () => {
  const c = classify('請問課程可以分期嗎？');
  assert.equal(c.category, 'B');
  assert.equal(c.faq.id, 'B2');
  assert.equal(c.faqHit, true);
});

test('FAQ：投資題命中 A4 並標記紅線', () => {
  const c = classify('你們會教怎麼買股票賺錢嗎？');
  assert.equal(c.faq.id, 'A4');
  assert.equal(c.redline, true);
  assert.equal(c.crisis, false);
});

test('FAQ：前公司糾紛命中 E1 並標記危機', () => {
  const c = classify('我聽說培峯老師跟前公司有糾紛');
  assert.equal(c.category, 'E');
  assert.equal(c.faq.id, 'E1');
  assert.equal(c.crisis, true);
});

test('兜底紅線：保證收益（FAQ 未命中）→ guarantee', () => {
  const c = classify('可以給我一個穩賺的方法嗎');
  assert.equal(c.faqHit, false);
  assert.equal(c.redline, true);
  assert.equal(c.redlineType, 'invest');
});

test('兜底紅線：政治 → religion_politics', () => {
  const r = detectRedline('你們對選舉的政治立場是什麼');
  assert.ok(r);
  assert.equal(r.type, 'religion_politics');
});

test('未命中且非紅線 → F 類、無旗標', () => {
  const c = classify('你們有跟某某企業合作辦活動嗎');
  assert.equal(c.category, 'F');
  assert.equal(c.faqHit, false);
  assert.equal(c.redline, false);
  assert.equal(c.crisis, false);
});

test('matchFaq：空字串不誤判', () => {
  assert.equal(matchFaq(''), null);
});

test('關鍵字比對忽略空白與大小寫', () => {
  const c = classify('  登 入  不進去 ');
  assert.equal(c.category, 'D');
});
