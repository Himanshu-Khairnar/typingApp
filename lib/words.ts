// ---------------------------------------------------------------------------
// Word banks
// ---------------------------------------------------------------------------

const ENGLISH_WORDS = [
  // High-frequency short words
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "into", "year", "your", "good", "some", "could", "them", "see",
  "other", "than", "then", "now", "look", "only", "come", "its", "over",
  "think", "also", "back", "after", "use", "two", "how", "our", "work",
  "first", "well", "way", "even", "new", "want", "because", "any", "these",
  "give", "day", "most", "us", "great", "between", "need", "large", "often",
  // Common nouns
  "people", "place", "world", "hand", "part", "life", "child", "eye",
  "woman", "man", "week", "case", "point", "government", "company",
  "number", "group", "problem", "fact", "thing", "water", "room",
  "mother", "father", "home", "book", "word", "city", "story",
  "job", "idea", "body", "information", "school", "family", "system",
  "program", "question", "work", "night", "area", "car", "money",
  "minute", "hour", "food", "door", "line", "face", "light", "side",
  "street", "name", "land", "phone", "word", "power", "town", "road",
  "air", "fire", "music", "river", "mind", "love", "art", "house",
  // Common verbs
  "find", "tell", "ask", "seem", "feel", "try", "leave", "call",
  "keep", "let", "begin", "show", "hear", "play", "run", "move",
  "live", "believe", "hold", "bring", "happen", "write", "provide",
  "sit", "stand", "lose", "pay", "meet", "include", "continue",
  "set", "learn", "change", "lead", "understand", "watch", "follow",
  "stop", "create", "speak", "read", "spend", "grow", "open", "walk",
  "win", "offer", "remember", "love", "consider", "appear", "buy",
  "wait", "serve", "die", "send", "expect", "build", "stay", "fall",
  "cut", "reach", "kill", "remain", "suggest", "raise", "pass",
  "sell", "require", "report", "decide", "pull", "break", "plan",
  // Common adjectives
  "good", "new", "first", "last", "long", "great", "little", "own",
  "right", "big", "high", "small", "large", "next", "early", "young",
  "important", "public", "real", "best", "free", "sure", "different",
  "able", "hard", "clear", "strong", "whole", "old", "true", "far",
  "low", "simple", "possible", "social", "local", "national", "main",
  "dark", "white", "black", "open", "late", "hot", "cold", "full",
  "short", "past", "ready", "deep", "close", "known", "fine", "long",
  "happy", "sad", "quick", "slow", "easy", "heavy", "light", "safe",
  "warm", "bright", "wide", "kind", "quiet", "busy", "calm", "sharp",
  // Common adverbs
  "just", "very", "well", "also", "back", "still", "never", "always",
  "here", "where", "however", "already", "away", "rather", "almost",
  "especially", "once", "again", "together", "today", "perhaps", "soon",
];

const HINDI_WORDS = [
  "और", "का", "एक", "में", "की", "है", "यह", "से", "हैं", "को",
  "पर", "इस", "होता", "कर", "था", "लिए", "अपने", "ने", "बनी", "नहीं",
  "तो", "ही", "या", "हो", "गया", "किया", "वह", "तक", "साथ", "कई",
  "संबंध", "अधिक", "करने", "अपनी", "उनके", "थे", "द्वारा", "करते",
  "बाद", "दिन", "समय", "प्रमुख", "लेकिन", "उसके", "जाता", "इसके",
  "इसे", "नई", "हुई", "लोग", "जब", "सभी", "अब", "कहा", "भी", "वे",
  "उन", "हम", "मैं", "तुम", "आप", "हमारे", "उनका", "इनका", "यहाँ",
  "वहाँ", "कहाँ", "क्यों", "कैसे", "क्या", "कौन", "कितना", "जैसे",
  "तथा", "एवं", "आदि", "अथवा", "परन्तु", "किन्तु", "क्योंकि", "जिस",
];

const MARATHI_WORDS = [
  "आणि", "हे", "एक", "आहे", "ते", "ही", "या", "त्या", "ज्या", "होते",
  "त्यांनी", "केले", "असे", "त्याचे", "म्हणजे", "पण", "तो", "ती",
  "होता", "त्याच", "असा", "यांनी", "करून", "त्यांच्या", "झाले",
  "केला", "असून", "यांच्या", "येथे", "दिले", "नाही", "होती", "यांना",
  "गेले", "त्याने", "यात", "त्यांना", "तसेच", "त्यात", "सुरू",
  "झाला", "यांचे", "काही", "असलेल्या", "घेतले", "मात्र", "दोन",
  "केली", "आता", "येथील", "त्यामुळे", "सांगितले", "आले", "त्यास",
];

const QUOTES = [
  "The only way to do great work is to love what you do.",
  "In the middle of every difficulty lies opportunity.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Life is what happens when you are busy making other plans.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Spread love everywhere you go and let no one ever come to you without leaving happier.",
  "When you reach the end of your rope, tie a knot in it and hang on.",
  "Always remember that you are absolutely unique, just like everyone else.",
  "The greatest glory in living lies not in never falling, but in rising every time we fall.",
  "In the end, it is not the years in your life that count; it is the life in your years.",
  "Never let the fear of striking out keep you from playing the game.",
  "Life is either a daring adventure or nothing at all.",
  "Many of life's failures are people who did not realize how close they were to success when they gave up.",
  "If life were predictable it would cease to be life, and be without flavor.",
  "Your time is limited, so do not waste it living someone else's life.",
  "Imagination is more important than knowledge. For knowledge is limited, but imagination encircles the world.",
  "I have not failed. I have just found 10,000 ways that will not work.",
  "The only impossible journey is the one you never begin.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Believe you can and you are halfway there.",
  "In three words I can sum up everything I have learned about life: it goes on.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "An unexamined life is not worth living.",
  "Life is not measured by the number of breaths we take, but by the moments that take our breath away.",
  "Every strike brings me closer to the next home run.",
  "Definiteness of purpose is the starting point of all achievement.",
  "We must accept finite disappointment, but never lose infinite hope.",
  "Do not go where the path may lead; go instead where there is no path and leave a trail.",
  "You miss 100 percent of the shots you do not take.",
  "Whether you think you can or think you cannot, you are right.",
];

export type CodeLanguage = "javascript" | "python" | "cpp";

const js = String.raw;
const py = String.raw;
const cpp = String.raw;

const CODE_SNIPPETS: Record<CodeLanguage, string[]> = {
  javascript: [
    js`function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    js`function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    result.push(left[i] < right[j] ? left[i++] : right[j++]);
  return result.concat(left.slice(i), right.slice(j));
}`,
    js`class Stack {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
}`,
    js`function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, ms);
  };
}`,
    js`function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}`,
    js`function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const mid = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...mid, ...quickSort(right)];
}`,
    js`async function retry(fn, retries = 3, delay = 500) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}`,
    js`function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  const keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual(a[k], b[k]));
}`,
  ],
  python: [
    py`def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    py`def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]`,
    py`class Stack:
    def __init__(self):
        self.items = []
    def push(self, item):
        self.items.append(item)
    def pop(self):
        return self.items.pop() if self.items else None
    def peek(self):
        return self.items[-1] if self.items else None
    def is_empty(self):
        return len(self.items) == 0`,
    py`def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)`,
    py`def memoize(fn):
    cache = {}
    def wrapper(*args):
        if args not in cache:
            cache[args] = fn(*args)
        return cache[args]
    return wrapper`,
    py`def is_balanced(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in '({[':
            stack.append(char)
        elif not stack or stack[-1] != mapping[char]:
            return False
        else:
            stack.pop()
    return len(stack) == 0`,
    py`def generate_primes(n):
    sieve = [True] * (n + 1)
    sieve[0] = sieve[1] = False
    for i in range(2, int(n**0.5) + 1):
        if sieve[i]:
            for j in range(i * i, n + 1, i):
                sieve[j] = False
    return [i for i in range(n + 1) if sieve[i]]`,
    py`def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
  ],
  cpp: [
    cpp`int binarySearch(vector<int>& arr, int target) {
    int lo = 0, hi = arr.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
    cpp`void mergeSort(vector<int>& arr, int l, int r) {
    if (l >= r) return;
    int mid = l + (r - l) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
    vector<int> tmp;
    int i = l, j = mid + 1;
    while (i <= mid && j <= r)
        tmp.push_back(arr[i] < arr[j] ? arr[i++] : arr[j++]);
    while (i <= mid) tmp.push_back(arr[i++]);
    while (j <= r) tmp.push_back(arr[j++]);
    for (int k = l; k <= r; k++) arr[k] = tmp[k - l];
}`,
    cpp`class Stack {
    vector<int> items;
public:
    void push(int x) { items.push_back(x); }
    int pop() { int t = items.back(); items.pop_back(); return t; }
    int peek() { return items.back(); }
    bool isEmpty() { return items.empty(); }
    int size() { return items.size(); }
};`,
    cpp`vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int comp = target - nums[i];
        if (seen.count(comp)) return {seen[comp], i};
        seen[nums[i]] = i;
    }
    return {};
}`,
    cpp`bool isBalanced(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) return false;
            char top = st.top(); st.pop();
            if ((c==')' && top!='(') || (c=='}' && top!='{') || (c==']' && top!='['))
                return false;
        }
    }
    return st.empty();
}`,
    cpp`int maxSubarraySum(vector<int>& nums) {
    int maxSum = nums[0], curSum = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        curSum = max(nums[i], curSum + nums[i]);
        maxSum = max(maxSum, curSum);
    }
    return maxSum;
}`,
    cpp`int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;
    for (int i = 1; i <= amount; i++)
        for (int c : coins)
            if (c <= i && dp[i - c] != INT_MAX)
                dp[i] = min(dp[i], dp[i - c] + 1);
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}`,
    cpp`int longestCommonSubsequence(string s1, string s2) {
    int m = s1.size(), n = s2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = s1[i-1] == s2[j-1]
                ? dp[i-1][j-1] + 1
                : max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}`,
  ],
};

// ---------------------------------------------------------------------------
// Realistic standalone numbers used when includeNumbers is on
// ---------------------------------------------------------------------------

const STANDALONE_NUMBERS = [
  "2", "3", "5", "8", "10", "12", "15", "20", "24", "30",
  "42", "50", "60", "75", "80", "90", "100", "120", "150", "200",
  "256", "365", "500", "1000", "2024", "2025",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TestMode = "time" | "words" | "quote" | "custom" | "code";
export type Language = "english" | "hindi" | "marathi";

export interface TestConfig {
  mode: TestMode;
  timeLimit?: number;
  wordCount?: number;
  language: Language;
  includePunctuation: boolean;
  includeNumbers: boolean;
  customText?: string;
  codeLanguage?: CodeLanguage;
}

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

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
    case "hindi":   return HINDI_WORDS;
    case "marathi": return MARATHI_WORDS;
    default:        return ENGLISH_WORDS;
  }
}

// ---------------------------------------------------------------------------
// Punctuation — builds proper sentences with capitalisation
// ---------------------------------------------------------------------------

function applyPunctuation(words: string[], random: () => number): string[] {
  const result: string[] = [];
  // Sentence length: 6–14 words
  let remaining = 6 + Math.floor(random() * 9);

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    remaining--;

    const isFirst = result.length === 0 || result[result.length - 1].match(/[.!?]$/);

    // Capitalise first word of each sentence
    if (isFirst) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    // Mid-sentence comma (only when a few words remain before end)
    if (remaining === 2 && random() < 0.35) {
      word = word + ",";
    }

    // End of sentence
    if (remaining <= 0 && i < words.length - 1) {
      const r = random();
      if (r < 0.70)      word = word + ".";
      else if (r < 0.85) word = word + "!";
      else               word = word + "?";
      remaining = 6 + Math.floor(random() * 9);
    }

    result.push(word);
  }

  // Ensure final word ends properly
  const last = result[result.length - 1];
  if (last && !/[.!?,;:]$/.test(last)) {
    result[result.length - 1] = last + ".";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Numbers — insert standalone realistic numbers between words (~1 in 8)
// ---------------------------------------------------------------------------

function applyNumbers(words: string[], random: () => number): string[] {
  const result: string[] = [];
  for (const word of words) {
    result.push(word);
    if (random() < 0.13) {
      const num = STANDALONE_NUMBERS[Math.floor(random() * STANDALONE_NUMBERS.length)];
      result.push(num);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateText(config: TestConfig, seed?: string): string[] {
  const random = seed ? mulberry32(hashSeed(seed)) : Math.random;

  if (config.mode === "custom") {
    return (config.customText ?? "type your custom text here")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  if (config.mode === "code") {
    const lang = config.codeLanguage ?? "javascript";
    const snippets = CODE_SNIPPETS[lang];
    const idx = Math.floor(random() * snippets.length);
    // Return as single element so newlines and indentation are preserved
    return [snippets[idx]];
  }

  if (config.mode === "quote") {
    const idx = Math.floor(random() * QUOTES.length);
    return QUOTES[idx].split(" ");
  }

  const wordBank = getWordBank(config.language);
  const count = config.mode === "time" ? 200 : (config.wordCount ?? 40);

  let words: string[] = Array.from(
    { length: count },
    () => wordBank[Math.floor(random() * wordBank.length)],
  );

  if (config.includeNumbers) {
    words = applyNumbers(words, random);
  }

  if (config.includePunctuation) {
    words = applyPunctuation(words, random);
  }

  return words;
}

// Legacy helper
export function pickRandomWords(count: number, seed?: string) {
  return generateText(
    { mode: "words", wordCount: count, language: "english", includePunctuation: false, includeNumbers: false },
    seed,
  );
}
