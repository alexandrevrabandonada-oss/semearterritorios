const sensitivePattern = /(\d{3}\.\d{3}\.\d{3}-\d{2})|(\b\d{11}\b)|([\w.%+-]+@[\w.-]+\.[A-Za-z]{2,})|(\b\d{4,5}[-.\s]?\d{4}\b)|(\b\d{5}-?\d{3}\b)|(rua\s|avenida\s|travessa\s|alameda\s)/i;

export function isSafePublicWord(word: string) {
  const trimmed = word.trim();
  if (!trimmed) return false;
  if (sensitivePattern.test(trimmed)) return false;
  return true;
}
