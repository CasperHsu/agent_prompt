import { classify } from './classifier.js';
import { aiReply } from './aiReply.js';
import { DECLINE_SCRIPTS, SCRIPTS } from './knowledgeBase.js';
import { config, isWithinServiceHours } from './config.js';

/**
 * 核心決策：給一段使用者文字，決定回覆內容與後續動作。
 * 流程對應 v-playbook-notes/customer-service/sop.md §1。
 *
 * @returns {Promise<{
 *   reply: string,
 *   category: string,
 *   action: 'auto_reply'|'transfer_human'|'escalate',
 *   faqHit: boolean,
 *   faqId: string|null,
 *   crisis: boolean,
 *   needsHuman: boolean,
 *   status: string,
 *   note: string,
 * }>}
 */
export async function decideReply(userText) {
  const c = classify(userText);

  // [2] E 類危機：逐字標準回覆 + 升級 + 存證通報
  if (c.crisis && c.faq) {
    return finalize({
      reply: c.faq.answer,
      category: 'E',
      action: 'escalate',
      faqHit: true,
      faqId: c.faq.id,
      crisis: true,
      needsHuman: true,
      status: '升級',
      note: '危機敏感題，需存證 + 通報主管，對照 crisis-playbook §8 升級閾值',
    });
  }

  // [3] FAQ 命中
  if (c.faqHit && c.faq) {
    // 投資等固定紅線題：FAQ 已是標準閃避，直接回，不需真人
    const needsHuman = Boolean(c.faq.needsHuman);
    return finalize({
      reply: c.faq.answer,
      category: c.faq.category,
      action: needsHuman ? 'transfer_human' : 'auto_reply',
      faqHit: true,
      faqId: c.faq.id,
      crisis: false,
      needsHuman,
      status: needsHuman ? '待真人' : '已解決',
      note: c.faq.redline ? '紅線題，標準閃避' : '',
    });
  }

  // [4] FAQ 未命中但踩兜底紅線 → 標準婉拒，不自由發揮
  if (c.redline && c.redlineType) {
    return finalize({
      reply: DECLINE_SCRIPTS[c.redlineType] || SCRIPTS.transferHuman,
      category: 'F',
      action: 'auto_reply',
      faqHit: false,
      faqId: null,
      crisis: false,
      needsHuman: false,
      status: '已解決',
      note: `兜底紅線(${c.redlineType})，標準婉拒`,
    });
  }

  // [5] FAQ 未命中、非紅線 → 嘗試 AI 回覆（若啟用），否則轉真人
  if (config.ai.enabled) {
    const ai = await aiReply(userText);
    if (ai.reply && !ai.needsHuman) {
      return finalize({
        reply: ai.reply,
        category: 'F',
        action: 'auto_reply',
        faqHit: false,
        faqId: null,
        crisis: false,
        needsHuman: false,
        status: '已解決',
        note: 'AI 回覆（FAQ 未命中）',
      });
    }
  }

  // 兜底：轉真人
  return finalize({
    reply: SCRIPTS.fallback,
    category: 'F',
    action: 'transfer_human',
    faqHit: false,
    faqId: null,
    crisis: false,
    needsHuman: true,
    status: '待真人',
    note: 'FAQ 未命中，建議評估是否補入 faq.md',
  });
}

/** 非服務時間的自動回覆（附在轉真人類回覆後）。 */
export function offHoursNotice() {
  if (isWithinServiceHours()) return null;
  return SCRIPTS.offHours(config.service.hoursStart, config.service.hoursEnd);
}

function finalize(result) {
  return result;
}
