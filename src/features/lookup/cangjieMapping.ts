// 倉頡字母對應的中文部件（字根）
const CANGJIE_TO_CHINESE: Record<string, string> = {
  A: '日',
  B: '月',
  C: '金',
  D: '木',
  E: '水',
  F: '火',
  G: '土',
  H: '竹',
  I: '戈',
  J: '十',
  K: '大',
  L: '中',
  M: '一',
  N: '弓',
  O: '人',
  P: '心',
  Q: '手',
  R: '口',
  S: '尸',
  T: '廿',
  U: '山',
  V: '女',
  W: '田',
  X: '難',
  Y: '卜',
  Z: '重',
}

/**
 * 將倉頡碼轉換為中文部件（字根）
 * @param code 倉頡碼（如 "QHDW"）
 * @returns 中文部件（如 "手竹水廿"）
 */
export function cangjieToChinese(code: string): string {
  return code
    .split('')
    .map((char) => CANGJIE_TO_CHINESE[char] || char)
    .join('')
}

/**
 * 將倉頡碼轉換為帶空格的英文字母
 * @param code 倉頡碼（如 "QHDW"）
 * @returns 帶空格的字母（如 "Q H D W"）
 */
export function cangjieToEnglishKeys(code: string): string {
  return code.split('').join(' ')
}
