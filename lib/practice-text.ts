type KeyHeatmap = Record<string, { correct: number; incorrect: number }>;

const COMMON_WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what", "so",
  "up", "out", "if", "about", "who", "get", "which", "go", "me", "when",
  "make", "can", "like", "time", "no", "just", "him", "know", "take", "people",
  "into", "year", "your", "good", "some", "could", "them", "see", "other", "than",
  "then", "now", "look", "only", "come", "its", "over", "think", "also", "back",
  "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
  "new", "want", "because", "any", "these", "give", "day", "most", "us", "great",
  "small", "place", "long", "between", "still", "large", "while", "same", "right", "old",
  "house", "world", "high", "keep", "need", "end", "hand", "part", "play", "turn",
  "start", "might", "show", "number", "point", "home", "water", "room", "mother", "area",
  "father", "story", "far", "sentence", "school", "word", "lot", "head", "family", "music",
  "run", "move", "should", "help", "life", "country", "own", "every", "again", "different",
  "found", "away", "left", "study", "much", "last", "book", "never", "city", "change",
  "each", "children", "group", "under", "light", "close", "night", "real", "open", "seem",
  "together", "next", "white", "began", "grow", "hard", "letter", "late", "read", "food",
  "earth", "eye", "thought", "head", "stand", "own", "page", "paper", "learn", "plant",
  "cover", "food", "sun", "four", "state", "above", "girl", "sometimes", "mountain", "cut",
  "young", "talk", "soon", "list", "song", "being", "leave", "car", "near", "draw",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePracticeText(
  heatmap: KeyHeatmap,
  wordCount: number = 50
): string[] {
  // 1. Sort keys by error rate descending
  const entries = Object.entries(heatmap).filter(
    ([, stats]) => stats.correct + stats.incorrect > 0
  );

  if (entries.length === 0) {
    // Fallback: random common words
    return shuffle(COMMON_WORDS).slice(0, wordCount);
  }

  const sorted = entries
    .map(([key, stats]) => ({
      key: key.toLowerCase(),
      errorRate: stats.incorrect / (stats.correct + stats.incorrect),
    }))
    .sort((a, b) => b.errorRate - a.errorRate);

  // 2. Take top 5-8 weak keys
  const weakKeys = sorted.slice(0, Math.min(8, Math.max(5, sorted.length)));
  const weakKeySet = new Set(weakKeys.map((k) => k.key));

  // 3. Filter words containing at least one weak key
  const matchingWords = COMMON_WORDS.filter((word) =>
    [...word.toLowerCase()].some((ch) => weakKeySet.has(ch))
  );

  if (matchingWords.length === 0) {
    return shuffle(COMMON_WORDS).slice(0, wordCount);
  }

  // 4. Weight toward words with MORE weak keys
  const weighted: { word: string; weight: number }[] = matchingWords.map(
    (word) => {
      const chars = [...word.toLowerCase()];
      const weakCount = chars.filter((ch) => weakKeySet.has(ch)).length;
      return { word, weight: weakCount };
    }
  );

  // 5. Build result using weighted random selection
  const result: string[] = [];
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

  for (let i = 0; i < wordCount; i++) {
    let r = Math.random() * totalWeight;
    let chosen = weighted[0].word;
    for (const entry of weighted) {
      r -= entry.weight;
      if (r <= 0) {
        chosen = entry.word;
        break;
      }
    }
    result.push(chosen);
  }

  // Shuffle to avoid repetitive patterns
  return shuffle(result);
}
