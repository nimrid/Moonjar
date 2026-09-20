export const BANNED_PATTERNS = [
  /\byou lost\b/i,
  /\byou're down\b/i,
  /\byou are down\b/i,
  /\bdon't miss out\b/i,
  /\bdo not miss out\b/i,
  /\bhurry\b/i,
  /\blimited time\b/i,
  /\bact now\b/i,
  /\bbuy now\b/i,
  /\blast chance\b/i,
  /\bstreak\b/i,
  /\bcasino\b/i,
  /\bjackpot\b/i,
  /\bgamble\b/i,
  /\blottery\b/i,
];

export function findBannedWords(text: string): string[] {
  const violations: string[] = [];
  for (const pattern of BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }
  return violations;
}
