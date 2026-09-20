export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? Math.max(1, syllables.length) : 1;
}

export function computeFleschKincaidGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g) || [];

  if (sentences.length === 0 || words.length === 0) return 0;

  const totalWords = words.length;
  const totalSentences = sentences.length;
  let totalSyllables = 0;

  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  // Standard Flesch-Kincaid Grade Level formula
  const grade = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
  return Math.max(0, parseFloat(grade.toFixed(2)));
}
