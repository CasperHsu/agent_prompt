import { FAQ, REDLINE_PATTERNS } from './knowledgeBase.js';

/** 正規化：移除空白、轉小寫，方便比對中英關鍵字 */
function normalize(text) {
  return (text || '').toLowerCase().replace(/\s+/g, '');
}

/**
 * 比對 FAQ。回傳最佳命中（依命中關鍵字數排序），或 null。
 */
export function matchFaq(text) {
  const norm = normalize(text);
  let best = null;
  let bestScore = 0;

  for (const item of FAQ) {
    let score = 0;
    for (const kw of item.keywords) {
      if (norm.includes(normalize(kw))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

/**
 * 偵測 FAQ 之外的紅線（兜底）。回傳 { type } 或 null。
 */
export function detectRedline(text) {
  const norm = normalize(text);
  for (const pattern of REDLINE_PATTERNS) {
    for (const kw of pattern.keywords) {
      if (norm.includes(normalize(kw))) return { type: pattern.type };
    }
  }
  return null;
}

/**
 * 綜合分類：先 FAQ，再紅線兜底。回傳分類碼與旗標。
 * category: A|B|C|D|E|F
 */
export function classify(text) {
  const faq = matchFaq(text);
  const redline = detectRedline(text);

  if (faq) {
    return {
      category: faq.category,
      faq,
      faqHit: true,
      crisis: Boolean(faq.crisis),
      redline: Boolean(faq.redline),
      redlineType: faq.redline ? 'invest' : null,
    };
  }

  if (redline) {
    return {
      category: 'F',
      faq: null,
      faqHit: false,
      crisis: false,
      redline: true,
      redlineType: redline.type,
    };
  }

  return {
    category: 'F',
    faq: null,
    faqHit: false,
    crisis: false,
    redline: false,
    redlineType: null,
  };
}
