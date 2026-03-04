const ENGLISH_WORDS = [
  "ability",
  "about",
  "above",
  "accept",
  "across",
  "action",
  "advice",
  "always",
  "amount",
  "answer",
  "appear",
  "around",
  "balance",
  "better",
  "beyond",
  "bright",
  "camera",
  "circle",
  "create",
  "daily",
  "design",
  "detail",
  "energy",
  "enough",
  "exact",
  "family",
  "future",
  "garden",
  "global",
  "ground",
  "growth",
  "hidden",
  "honest",
  "inside",
  "island",
  "journey",
  "keeper",
  "legend",
  "little",
  "motion",
  "native",
  "object",
  "output",
  "person",
  "planet",
  "policy",
  "public",
  "random",
  "reason",
  "record",
  "result",
  "screen",
  "secret",
  "signal",
  "simple",
  "single",
  "spoken",
  "stable",
  "system",
  "target",
  "timing",
  "unlock",
  "update",
  "useful",
  "visual",
  "wealth",
  "window",
  "wonder",
  "writer",
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "I",
  "it",
  "for",
  "not",
  "on",
  "with",
  "he",
  "as",
  "you",
  "do",
  "at",
];

const HINDI_WORDS = [
  "और",
  "का",
  "एक",
  "में",
  "की",
  "है",
  "यह",
  "से",
  "हैं",
  "को",
  "पर",
  "इस",
  "होता",
  "कर",
  "था",
  "लिए",
  "अपने",
  "ने",
  "बनी",
  "नहीं",
  "तो",
  "ही",
  "या",
  "हो",
  "गया",
  "किया",
  "वह",
  "तक",
  "साथ",
  "कई",
  "संबंध",
  "अधिक",
  "करने",
  "अपनी",
  "उनके",
  "थे",
  "द्वारा",
  "करते",
  "बाद",
  "दिन",
  "समय",
  "प्रमुख",
  "लेकिन",
  "उसके",
  "जाता",
  "इसके",
  "इसे",
  "नई",
  "हुई",
  "लोग",
];

const MARATHI_WORDS = [
  "आणि",
  "हे",
  "एक",
  "आहे",
  "ते",
  "ही",
  "या",
  "त्या",
  "ज्या",
  "होते",
  "त्यांनी",
  "केले",
  "असे",
  "त्याचे",
  "म्हणजे",
  "पण",
  "तो",
  "ती",
  "होता",
  "त्याच",
  "असा",
  "यांनी",
  "करून",
  "त्यांच्या",
  "झाले",
  "केला",
  "असून",
  "यांच्या",
  "येथे",
  "दिले",
  "नाही",
  "होती",
  "यांना",
  "गेले",
  "त्याने",
  "यात",
  "त्यांना",
  "तसेच",
  "त्यात",
  "सुरू",
  "झाला",
  "यांचे",
  "काही",
  "असलेल्या",
  "घेतले",
  "मात्र",
  "दोन",
  "केली",
  "आता",
  "येथील",
];

const QUOTES = [
  "The only way to do great work is to love what you do.",
  "Life is what happens when you're busy making other plans.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "It is during our darkest moments that we must focus to see the light.",
  "Be yourself; everyone else is already taken.",
  "Two things are infinite: the universe and human stupidity.",
  "So many books, so little time.",
  "A room without books is like a body without a soul.",
  "You only live once, but if you do it right, once is enough.",
  "Be the change that you wish to see in the world.",
];

const PUNCTUATION = [".", ",", "!", "?", ";", ":", "'", '"', "-", "(", ")"];
const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export type TestMode = "time" | "words" | "quote";
export type Language = "english" | "hindi" | "marathi";

export interface TestConfig {
  mode: TestMode;
  timeLimit?: number; // in seconds
  wordCount?: number;
  language: Language;
  includePunctuation: boolean;
  includeNumbers: boolean;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function getWordBank(language: Language): string[] {
  switch (language) {
    case "hindi":
      return HINDI_WORDS;
    case "marathi":
      return MARATHI_WORDS;
    case "english":
    default:
      return ENGLISH_WORDS;
  }
}

function addPunctuationToWord(word: string, random: () => number): string {
  if (random() < 0.15) {
    // 15% chance
    const punct = PUNCTUATION[Math.floor(random() * PUNCTUATION.length)];
    return word + punct;
  }
  return word;
}

function addNumbersToWords(words: string[], random: () => number): string[] {
  return words.map((word) => {
    if (random() < 0.1) {
      // 10% chance
      const number = NUMBERS[Math.floor(random() * NUMBERS.length)];
      return random() < 0.5 ? number + word : word + number;
    }
    return word;
  });
}

export function generateText(config: TestConfig, seed?: string): string[] {
  const random = seed ? mulberry32(hashSeed(seed)) : Math.random;

  if (config.mode === "quote") {
    const quoteIndex = Math.floor(random() * QUOTES.length);
    return QUOTES[quoteIndex].split(" ");
  }

  const wordBank = getWordBank(config.language);
  const count = config.mode === "time" ? 200 : config.wordCount || 40;

  let words: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(random() * wordBank.length);
    let word = wordBank[index];

    if (config.includePunctuation) {
      word = addPunctuationToWord(word, random);
    }

    words.push(word);
  }

  if (config.includeNumbers) {
    words = addNumbersToWords(words, random);
  }

  return words;
}

// Legacy function for backward compatibility
export function pickRandomWords(count: number, seed?: string) {
  return generateText(
    {
      mode: "words",
      wordCount: count,
      language: "english",
      includePunctuation: false,
      includeNumbers: false,
    },
    seed,
  );
}
