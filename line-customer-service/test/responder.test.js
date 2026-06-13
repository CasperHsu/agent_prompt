import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// 決策邏輯不需 LINE 金鑰；先補上避免 config 缺值
process.env.LINE_CHANNEL_ACCESS_TOKEN ||= 'test';
process.env.LINE_CHANNEL_SECRET ||= 'test';

let decideReply;
before(async () => {
  ({ decideReply } = await import('../src/responder.js'));
});

test('FAQ 命中且非真人 → auto_reply、已解決', async () => {
  const r = await decideReply('課程可以分期嗎');
  assert.equal(r.action, 'auto_reply');
  assert.equal(r.needsHuman, false);
  assert.equal(r.faqId, 'B2');
});

test('E 類危機 → escalate、需真人、逐字標準回覆', async () => {
  const r = await decideReply('培峯老師跟前公司有糾紛嗎');
  assert.equal(r.action, 'escalate');
  assert.equal(r.crisis, true);
  assert.equal(r.needsHuman, true);
  assert.match(r.reply, /深思熟慮的選擇/);
});

test('需真人的 FAQ（登入）→ transfer_human、待真人', async () => {
  const r = await decideReply('我忘記密碼登入不進去');
  assert.equal(r.action, 'transfer_human');
  assert.equal(r.needsHuman, true);
});

test('投資紅線 FAQ → 自動標準閃避、不需真人', async () => {
  const r = await decideReply('教我買股票賺錢');
  assert.equal(r.faqId, 'A4');
  assert.equal(r.needsHuman, false);
  assert.match(r.reply, /不開設任何投資/);
});

test('兜底紅線（保證）→ 標準婉拒、auto_reply', async () => {
  const r = await decideReply('保證一定賺嗎');
  assert.equal(r.action, 'auto_reply');
  assert.match(r.reply, /不做任何收益或成果的保證/);
});

test('未命中、非紅線、AI 未啟用 → 轉真人兜底', async () => {
  const r = await decideReply('你們有跟某某企業合作辦活動嗎');
  assert.equal(r.action, 'transfer_human');
  assert.equal(r.needsHuman, true);
  assert.equal(r.faqHit, false);
});
