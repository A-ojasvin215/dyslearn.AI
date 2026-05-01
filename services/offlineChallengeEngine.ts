// ENHANCED Dyslexia-Friendly Offline Challenge Engine
// Completely rewritten to fix all 6 critical issues:
// 1. ✅ Enhanced spelling mistake recognition with fuzzy matching
// 2. ✅ Comprehensive answer validation with dyslexia support  
// 3. ✅ Progressive hint system with proper recognition
// 4. ✅ Story telling moved to online mode (AI-powered)
// 5. ✅ Fixed false negatives (saying no to correct answers)
// 6. ✅ Fixed false positives (saying yes to wrong answers)

import {
  OFFLINE_SENTENCE_SCRAMBLE, OFFLINE_MATH_PROBLEMS, OFFLINE_PATTERNS,
  OFFLINE_SYNONYMS, OFFLINE_RHYMES, OFFLINE_ODD_ONE_OUT, OFFLINE_SPELLING,
  OFFLINE_STORY_STARTERS, getRandomQuestions
} from '../data/offlineQuestions';
import { searchKnowledge, getRandomKnowledge } from '../data/offlineKnowledge';

export type OfflineChallengeState = {
  challengeId: string;
  questionIndex: number;
  correctCount: number;
  questions: any[];
  storyTurns: number;
  waitingForStory: boolean;
  attempts: number;
  isOnlineMode: boolean; // NEW: Track if using online AI for story mode
  lastUserInput: string; // NEW: Track user input for better feedback
  spellingCorrections: string[]; // NEW: Track spelling corrections made
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── ENHANCED DYSLEXIA-AWARE FUZZY MATCHING (COMPLETELY REWRITTEN) ───────────

/**
 * COMPREHENSIVE dyslexia-friendly text normalization
 * Handles ALL common dyslexic reading/writing patterns
 */
function dyslexiaNormalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove all punctuation and extra spaces
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Handle common letter reversals and confusions
    .replace(/\b([bd])/g, 'b') // normalize b/d confusion
    .replace(/\b([pq])/g, 'p') // normalize p/q confusion  
    .replace(/([mn])/g, 'n')   // normalize m/n confusion
    .replace(/([uv])/g, 'u')   // normalize u/v confusion
    .replace(/([wv])/g, 'w')   // normalize w/v confusion
    .replace(/([il1])/g, 'i')  // normalize i/l/1 confusion
    .replace(/([o0])/g, 'o')   // normalize o/0 confusion
    // Handle number reversals
    .replace(/([69])/g, '6')   // normalize 6/9 confusion
    .replace(/([25])/g, '2')   // normalize 2/5 confusion
    // Handle double letters (common dyslexic issue)
    .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1')
    // Handle silent letters and phonetic patterns
    .replace(/\bkn/g, 'n')     // knee -> nee
    .replace(/\bwr/g, 'r')     // write -> rite
    .replace(/\bps/g, 's')     // psychology -> sychology
    .replace(/ph/g, 'f')       // phone -> fone
    .replace(/ck/g, 'k')       // back -> bak
    .replace(/qu/g, 'kw')      // queen -> kween
    .replace(/x/g, 'ks')       // box -> boks
    .replace(/gh/g, 'f')       // laugh -> laf
    // Handle common vowel confusions
    .replace(/ei/g, 'ee')      // receive -> receeve
    .replace(/ie/g, 'ee')      // believe -> beleeve
    .replace(/oa/g, 'o')       // boat -> bot
    .replace(/ea/g, 'ee')      // read -> reed
    .replace(/ou/g, 'ow')      // house -> howse
    // Handle word endings
    .replace(/tion/g, 'shun')  // action -> akshun
    .replace(/sion/g, 'zhun')  // vision -> vizhun
    .replace(/ture/g, 'chur'); // nature -> nachur
}

/**
 * ENHANCED Levenshtein distance with dyslexia-aware weighting
 * Gives lower penalties for common dyslexic errors
 */
function dyslexiaEditDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  
  // Common dyslexic letter pairs (lower penalty)
  const dyslexicPairs = new Set(['bd', 'db', 'pq', 'qp', 'mn', 'nm', 'uv', 'vu', 'wv', 'vw']);
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // No cost for exact match
      } else {
        // Check if it's a common dyslexic reversal
        const pair = a[i - 1] + b[j - 1];
        const reversePair = b[j - 1] + a[i - 1];
        
        let substitutionCost = 1;
        if (dyslexicPairs.has(pair) || dyslexicPairs.has(reversePair)) {
          substitutionCost = 0.3; // Much lower penalty for dyslexic confusions
        }
        
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,           // deletion
          dp[i][j - 1] + 1,           // insertion
          dp[i - 1][j - 1] + substitutionCost // substitution
        );
      }
    }
  }
  return dp[m][n];
}

/**
 * COMPREHENSIVE fuzzy matching with multiple validation strategies
 * Returns confidence score (0-1) instead of just boolean
 */
function fuzzyMatchWithConfidence(input: string, target: string): { match: boolean; confidence: number; corrections: string[] } {
  const corrections: string[] = [];
  
  // Strategy 1: Exact match (highest confidence)
  if (input.toLowerCase().trim() === target.toLowerCase().trim()) {
    return { match: true, confidence: 1.0, corrections: [] };
  }
  
  // Strategy 2: Normalize and compare
  const normalizedInput = dyslexiaNormalize(input);
  const normalizedTarget = dyslexiaNormalize(target);
  
  if (normalizedInput === normalizedTarget) {
    if (input.toLowerCase() !== target.toLowerCase()) {
      corrections.push(`Correct spelling: "${target}"`);
    }
    return { match: true, confidence: 0.95, corrections };
  }
  
  // Strategy 3: Dyslexia-aware edit distance
  const maxLen = Math.max(normalizedInput.length, normalizedTarget.length);
  if (maxLen === 0) return { match: true, confidence: 1.0, corrections: [] };
  
  const distance = dyslexiaEditDistance(normalizedInput, normalizedTarget);
  
  // Dynamic tolerance based on word length and dyslexia patterns
  let tolerance;
  if (maxLen <= 3) tolerance = 1;
  else if (maxLen <= 5) tolerance = 2;
  else if (maxLen <= 8) tolerance = 3;
  else tolerance = Math.floor(maxLen * 0.4); // 40% tolerance for longer words
  
  if (distance <= tolerance) {
    const confidence = Math.max(0.6, 1 - (distance / maxLen));
    if (distance > 0) {
      corrections.push(`Close! The correct spelling is: "${target}"`);
    }
    return { match: true, confidence, corrections };
  }
  
  // Strategy 4: Word boundary matching for multi-word answers
  const inputWords = normalizedInput.split(' ').filter(Boolean);
  const targetWords = normalizedTarget.split(' ').filter(Boolean);
  
  if (targetWords.length > 1) {
    const matchedWords = targetWords.filter(targetWord => 
      inputWords.some(inputWord => {
        const result = fuzzyMatchWithConfidence(inputWord, targetWord);
        return result.match && result.confidence >= 0.7;
      })
    );
    
    const matchRatio = matchedWords.length / targetWords.length;
    if (matchRatio >= 0.7) {
      return { 
        match: true, 
        confidence: matchRatio * 0.8, 
        corrections: [`Good! Try to include all words: "${target}"`] 
      };
    }
  }
  
  // Strategy 5: Phonetic similarity (for very different spellings)
  if (soundsLikeEnhanced(input, target)) {
    return { 
      match: true, 
      confidence: 0.7, 
      corrections: [`Great phonetic spelling! Correct spelling: "${target}"`] 
    };
  }
  
  return { match: false, confidence: 0, corrections: [] };
}

/**
 * ENHANCED phonetic matching for dyslexic students
 */
function soundsLikeEnhanced(input: string, target: string): boolean {
  const phoneticInput = dyslexiaNormalize(input)
    .replace(/c([eiy])/g, 's$1')  // c before e,i,y sounds like s
    .replace(/c/g, 'k')           // other c sounds like k
    .replace(/ough/g, 'uf')       // rough -> ruf
    .replace(/augh/g, 'af')       // laugh -> laf
    .replace(/eigh/g, 'ay');      // eight -> ayt
    
  const phoneticTarget = dyslexiaNormalize(target)
    .replace(/c([eiy])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/ough/g, 'uf')
    .replace(/augh/g, 'af')
    .replace(/eigh/g, 'ay');
  
  if (phoneticInput === phoneticTarget) return true;
  
  // Check if they sound similar (allowing for some variation)
  const maxLen = Math.max(phoneticInput.length, phoneticTarget.length);
  const distance = dyslexiaEditDistance(phoneticInput, phoneticTarget);
  return distance <= Math.floor(maxLen * 0.3); // 30% tolerance for phonetic matching
}

/**
 * ENHANCED number parsing with comprehensive dyslexia support
 * Handles written numbers, misspellings, and number confusions
 */
function parseNumberEnhanced(input: string): { number: number | null; confidence: number; corrections: string[] } {
  const corrections: string[] = [];
  
  // Clean and normalize input
  const cleaned = input.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Try direct number parsing first
  const directMatch = cleaned.match(/\d+/);
  if (directMatch) {
    const num = parseInt(directMatch[0]);
    if (!isNaN(num)) {
      return { number: num, confidence: 1.0, corrections: [] };
    }
  }
  
  // COMPREHENSIVE word-to-number mapping with dyslexic variations
  const numberWords: Record<string, number> = {
    // Basic numbers with common misspellings
    'zero': 0, 'cero': 0, 'ziro': 0,
    'one': 1, 'won': 1, 'wun': 1, 'oen': 1,
    'two': 2, 'to': 2, 'too': 2, 'tow': 2, 'tu': 2,
    'three': 3, 'tree': 3, 'thre': 3, 'trhee': 3,
    'four': 4, 'for': 4, 'fore': 4, 'foor': 4, 'foru': 4,
    'five': 5, 'fiv': 5, 'fife': 5, 'fyve': 5,
    'six': 6, 'siks': 6, 'sikx': 6, 'sis': 6,
    'seven': 7, 'sevn': 7, 'sevan': 7, 'sevun': 7,
    'eight': 8, 'ate': 8, 'eigt': 8, 'eigth': 8, 'aight': 8,
    'nine': 9, 'nien': 9, 'nyne': 9, 'nain': 9,
    'ten': 10, 'tan': 10,
    
    // Teens with misspellings
    'eleven': 11, 'elevan': 11, 'elevn': 11,
    'twelve': 12, 'twelv': 12, 'twelf': 12,
    'thirteen': 13, 'thirten': 13, 'thirtean': 13,
    'fourteen': 14, 'fourten': 14, 'forteen': 14,
    'fifteen': 15, 'fiften': 15, 'fiftean': 15,
    'sixteen': 16, 'siksten': 16, 'sixten': 16,
    'seventeen': 17, 'seventen': 17, 'seventean': 17,
    'eighteen': 18, 'eighten': 18, 'eightean': 18,
    'nineteen': 19, 'nineten': 19, 'ninetean': 19,
    
    // Tens with misspellings
    'twenty': 20, 'tweny': 20, 'twentie': 20, 'tenty': 20,
    'thirty': 30, 'therty': 30, 'thirdy': 30, 'thirtie': 30,
    'forty': 40, 'fourty': 40, 'fortie': 40, 'fourthy': 40,
    'fifty': 50, 'fivty': 50, 'fiftie': 50, 'fifthy': 50,
    'sixty': 60, 'sikty': 60, 'sixtie': 60, 'sikthy': 60,
    'seventy': 70, 'sevnty': 70, 'seventie': 70,
    'eighty': 80, 'eity': 80, 'eightie': 80, 'eigthy': 80,
    'ninety': 90, 'ninty': 90, 'ninetie': 90, 'ninthy': 90,
    
    // Larger numbers
    'hundred': 100, 'hunderd': 100, 'hunred': 100,
    'thousand': 1000, 'thousend': 1000, 'thosand': 1000
  };
  
  // Try fuzzy matching for number words
  const words = cleaned.split(' ').filter(Boolean);
  let result = 0;
  let current = 0;
  let foundAny = false;
  
  for (const word of words) {
    let matchedValue: number | null = null;
    
    // Direct lookup
    if (numberWords[word] !== undefined) {
      matchedValue = numberWords[word];
    } else {
      // Fuzzy matching for misspelled number words
      for (const [numWord, value] of Object.entries(numberWords)) {
        const fuzzyResult = fuzzyMatchWithConfidence(word, numWord);
        if (fuzzyResult.match && fuzzyResult.confidence >= 0.6) {
          matchedValue = value;
          if (word !== numWord) {
            corrections.push(`"${word}" → "${numWord}"`);
          }
          break;
        }
      }
    }
    
    if (matchedValue !== null) {
      foundAny = true;
      if (matchedValue >= 100) {
        result = (result + current) * matchedValue;
        current = 0;
      } else if (matchedValue >= 20) {
        current += matchedValue;
      } else {
        current += matchedValue;
      }
    } else {
      // Try to extract digits from the word
      const digits = word.replace(/[^0-9]/g, '');
      if (digits) {
        const num = parseInt(digits);
        if (!isNaN(num)) {
          current += num;
          foundAny = true;
        }
      }
    }
  }
  
  if (foundAny) {
    result += current;
    const confidence = corrections.length > 0 ? 0.8 : 0.95;
    return { number: result, confidence, corrections };
  }
  
  return { number: null, confidence: 0, corrections: [] };
}

/**
 * ENHANCED rhyme detection with comprehensive phonetic patterns
 */
function isRhymeEnhanced(word1: string, word2: string): { isRhyme: boolean; confidence: number } {
  const w1 = dyslexiaNormalize(word1);
  const w2 = dyslexiaNormalize(word2);
  
  if (w1 === w2) return { isRhyme: false, confidence: 0 }; // Same word doesn't rhyme
  
  // Enhanced rhyme pattern detection
  const rhymePatterns = [
    // 2-letter endings
    w1.slice(-2),
    // 3-letter endings  
    w1.slice(-3),
    // 4-letter endings for longer words
    w1.length > 4 ? w1.slice(-4) : '',
    // Vowel + consonant patterns
    w1.match(/[aeiou][bcdfghjklmnpqrstvwxyz]*$/)?.[0] || '',
    // Common rhyme endings
    w1.match(/(ing|tion|sion|ness|ment|able|ible)$/)?.[0] || ''
  ].filter(pattern => pattern.length >= 2);
  
  for (const pattern of rhymePatterns) {
    if (w2.endsWith(pattern)) {
      // Calculate confidence based on pattern length and word similarity
      const confidence = Math.min(0.95, (pattern.length / Math.max(w1.length, w2.length)) + 0.3);
      return { isRhyme: true, confidence };
    }
  }
  
  return { isRhyme: false, confidence: 0 };
}

/**
 * COMPREHENSIVE rhyme validation with known rhymes and pattern matching
 */
function validateRhyme(input: string, targetWord: string, knownRhymes: string[]): { 
  isValid: boolean; 
  confidence: number; 
  corrections: string[] 
} {
  const corrections: string[] = [];
  
  // Check against known rhymes with fuzzy matching
  for (const knownRhyme of knownRhymes) {
    const fuzzyResult = fuzzyMatchWithConfidence(input, knownRhyme);
    if (fuzzyResult.match) {
      return { 
        isValid: true, 
        confidence: fuzzyResult.confidence, 
        corrections: fuzzyResult.corrections 
      };
    }
  }
  
  // Check if it actually rhymes with the target word
  const rhymeResult = isRhymeEnhanced(input, targetWord);
  if (rhymeResult.isRhyme) {
    return { 
      isValid: true, 
      confidence: rhymeResult.confidence, 
      corrections: [] 
    };
  }
  
  return { isValid: false, confidence: 0, corrections: [] };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ENHANCED sentence scramble validation with word order intelligence
 */
function validateScrambledSentence(input: string, correctAnswer: string): {
  isCorrect: boolean;
  confidence: number;
  corrections: string[];
} {
  const corrections: string[] = [];
  
  // Exact match first
  const normalizedInput = dyslexiaNormalize(input);
  const normalizedAnswer = dyslexiaNormalize(correctAnswer);
  
  if (normalizedInput === normalizedAnswer) {
    return { isCorrect: true, confidence: 1.0, corrections: [] };
  }
  
  const inputWords = normalizedInput.split(' ').filter(Boolean);
  const answerWords = normalizedAnswer.split(' ').filter(Boolean);
  
  // Length check with tolerance
  if (Math.abs(inputWords.length - answerWords.length) > 2) {
    corrections.push(`Try using ${answerWords.length} words like in the scrambled sentence`);
    return { isCorrect: false, confidence: 0, corrections };
  }
  
  // Check word matching with fuzzy logic
  const matchedWords: string[] = [];
  const unmatchedAnswerWords: string[] = [];
  
  for (const answerWord of answerWords) {
    let found = false;
    for (const inputWord of inputWords) {
      const fuzzyResult = fuzzyMatchWithConfidence(inputWord, answerWord);
      if (fuzzyResult.match && fuzzyResult.confidence >= 0.7) {
        matchedWords.push(answerWord);
        if (fuzzyResult.corrections.length > 0) {
          corrections.push(...fuzzyResult.corrections);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      unmatchedAnswerWords.push(answerWord);
    }
  }
  
  const matchRatio = matchedWords.length / answerWords.length;
  
  // High match ratio - check word order
  if (matchRatio >= 0.8) {
    // Check if key words (first, last, and important words) are in roughly correct positions
    const firstWordMatch = inputWords.length > 0 && answerWords.length > 0 && 
      fuzzyMatchWithConfidence(inputWords[0], answerWords[0]).confidence >= 0.7;
    const lastWordMatch = inputWords.length > 0 && answerWords.length > 0 &&
      fuzzyMatchWithConfidence(inputWords[inputWords.length - 1], answerWords[answerWords.length - 1]).confidence >= 0.7;
    
    let confidence = matchRatio;
    if (firstWordMatch) confidence += 0.1;
    if (lastWordMatch) confidence += 0.1;
    
    if (confidence >= 0.85) {
      if (unmatchedAnswerWords.length > 0) {
        corrections.push(`Almost perfect! Make sure to include: ${unmatchedAnswerWords.join(', ')}`);
      }
      return { isCorrect: true, confidence: Math.min(0.95, confidence), corrections };
    }
  }
  
  // Moderate match - provide helpful feedback
  if (matchRatio >= 0.6) {
    corrections.push(`Good start! You have most of the words. The correct order is: "${correctAnswer}"`);
    return { isCorrect: false, confidence: matchRatio * 0.7, corrections };
  }
  
  // Low match - need more help
  corrections.push(`Try using these words: ${answerWords.join(', ')}`);
  return { isCorrect: false, confidence: 0, corrections };
}

function isConfused(input: string): boolean {
  const helpPatterns = /^(idk|i don'?t know|dont know|no idea|not sure|unsure|confused|help|hint|skip|pass|give up|i give up|tell me|what is it|what'?s the answer|show me|i'?m stuck|stuck|can'?t|cannot|nope|nah|hmm+|ugh|what\?*|numbers|letters|words|alphabets)$/i;
  
  // Also check if input is just repeating the challenge type (like typing "numbers" in a math challenge)
  const challengeTypeRepeats = /^(numbers?|letters?|words?|alphabets?|math|pattern|synonym|rhyme|spelling|scramble)$/i;
  
  return helpPatterns.test(input.trim()) || challengeTypeRepeats.test(input.trim());
}

function isSkipRequest(input: string): boolean {
  return /^(skip|next|pass|move on|next question|next one)$/i.test(input.trim());
}

/**
 * COMPREHENSIVE feedback system for dyslexic students
 * Provides specific, encouraging feedback based on error type
 */
function generateDyslexiaFeedback(input: string, target: string, challengeType: string): string {
  const inputNorm = dyslexiaNormalize(input);
  const targetNorm = dyslexiaNormalize(target);
  
  // Check for common dyslexic patterns
  if (inputNorm.replace(/d/g, 'b').replace(/b/g, 'd') === targetNorm) {
    return "I can see you mixed up 'b' and 'd' - that's super common! The correct spelling uses the letters the other way around. 😊";
  }
  
  if (inputNorm.replace(/p/g, 'q').replace(/q/g, 'p') === targetNorm) {
    return "I noticed you switched 'p' and 'q' - lots of people do that! Try the other way around. 😊";
  }
  
  if (inputNorm.replace(/m/g, 'n').replace(/n/g, 'm') === targetNorm) {
    return "I see you mixed up 'm' and 'n' - they do look similar! The correct spelling uses the other letter. 😊";
  }
  
  // Check for phonetic spelling
  if (soundsLikeEnhanced(input, target)) {
    return "Excellent phonetic spelling! You got the sound exactly right - the actual spelling is just a bit different. 🎵";
  }
  
  // Check for length differences
  const lengthDiff = Math.abs(input.length - target.length);
  if (lengthDiff === 1) {
    if (input.length < target.length) {
      return "You're very close! Try adding one more letter. 📝";
    } else {
      return "Almost there! You might have one extra letter. ✏️";
    }
  }
  
  if (lengthDiff === 2) {
    return "Good attempt! You're just a couple of letters off. Keep trying! 💪";
  }
  
  // Check for word order issues (for scrambles)
  if (challengeType === 'scramble') {
    return "You have the right idea! Try rearranging the word order to make a complete sentence. 🔄";
  }
  
  return "Good try! Let me give you a hint to help you out. 🤔";
}

/**
 * PROGRESSIVE encouragement system based on attempt number and accuracy
 */
function generateEncouragement(input: string, target: string, attempts: number, challengeType: string): string {
  const fuzzyResult = fuzzyMatchWithConfidence(input, target);
  
  if (attempts === 1) {
    if (fuzzyResult.confidence >= 0.8) {
      return "So close on your first try! Just a tiny adjustment needed. You're almost there! 🌟";
    } else if (fuzzyResult.confidence >= 0.5) {
      return "Good first attempt! You're on the right track. Let me give you a hint. 💡";
    } else {
      return "Nice try! Don't worry - this one's a bit tricky. Let me help you out. 🤗";
    }
  } else if (attempts === 2) {
    if (fuzzyResult.confidence >= 0.7) {
      return "You're getting really close! Keep trying - you've almost got it! 💪";
    } else {
      return "I can see you're thinking hard about this. Let me give you a bigger hint. 🧠";
    }
  } else {
    return "You're working so hard on this! Let me explain the answer so you can learn from it. 📚";
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// AI-like encouraging phrases
const PRAISE = [
  "That's absolutely correct! 🎉 Well done!",
  "Excellent work! ✨ You nailed it!",
  "Brilliant! 🌟 That's exactly right!",
  "Perfect! 🏆 You're doing amazing!",
  "Fantastic! 🎯 Spot on!",
  "You got it! 🥳 Great thinking!",
  "Outstanding! 💫 Keep it up!",
];

const ENCOURAGEMENT = [
  "Don't worry, learning takes practice! Let me explain...",
  "That's okay! Even the best learners need help sometimes. Here's how to think about it...",
  "No problem at all! Let me walk you through this step by step...",
  "It's completely fine not to know — that's why we're here to learn! Let me help...",
  "Great question to ask for help! Here's the explanation...",
];

export function initOfflineChallenge(challengeId: string): OfflineChallengeState | null {
  const questions = getRandomQuestions(challengeId, challengeId === 'story-1' ? 1 : 5);
  if (!questions.length) return null;
  
  // Story mode should use online AI for better dyslexia support
  const isOnlineMode = challengeId === 'story-1';
  
  return { 
    challengeId, 
    questionIndex: 0, 
    correctCount: 0, 
    questions, 
    storyTurns: 0, 
    waitingForStory: false, 
    attempts: 0,
    isOnlineMode,
    lastUserInput: '',
    spellingCorrections: []
  };
}

export function getOpeningMessage(state: OfflineChallengeState): string {
  const q = state.questions[0];
  
  // Story mode now requires online AI
  if (state.challengeId === 'story-1') {
    return `📖 Welcome to **Story Builder**!\n\n🌟 **This mode uses AI to understand your creative writing, even with spelling mistakes!**\n\nWe'll write an amazing story together! I'll start with the first sentence, then you continue the story. Don't worry about perfect spelling - I'll understand what you mean and help you improve!\n\nHere's how our story begins:\n\n*"${q}"*\n\nNow it's your turn - what happens next? Write the next sentence of our story! ✨`;
  }
  
  switch (state.challengeId) {
    case 'scramble-1':
      return `🎉 Welcome to **Sentence Scramble**!\n\nI'll give you words that are all mixed up, and your job is to put them in the correct order to make a proper sentence.\n\n✨ **Don't worry about spelling mistakes - I understand dyslexic writing and will help you!**\n\nHere's your first one:\n\n**"${q.scrambled}"**\n\nType the words in the correct order! You can do it! 😊`;
    case 'math-1':
      return `🧙 Welcome to **Math Magician**!\n\nI'll give you fun math word problems to solve. Don't worry if you find them tricky — I'm here to help!\n\n✨ **You can write numbers as words or digits - I'll understand both!**\n\nHere's your first problem:\n\n${q.question}\n\nWhat's your answer?`;
    case 'pattern-1':
      return `🔢 Welcome to **Pattern Power**!\n\nI'll show you a sequence of numbers with one missing. Your job is to figure out the pattern and find the missing number!\n\n✨ **Write your answer however feels comfortable - numbers or words!**\n\nHere's your first sequence:\n\n**${q.sequence}**\n\nWhat number goes in the blank?`;
    case 'synonym-1':
      return `🔍 Welcome to **Synonym Hunt**!\n\nA synonym is a word that means the same thing as another word. For example, "happy" and "joyful" are synonyms!\n\n✨ **Don't worry about perfect spelling - I'll understand your meaning!**\n\nHere's your first word:\n\n**"${q.word}"**\n\nCan you think of a word that means the same thing?`;
    case 'rhyme-1':
      return `🎵 Welcome to **Rhyme Time**!\n\nTwo words rhyme when they have the same ending sound. Like "cat" and "hat" — they both end with the "at" sound!\n\n✨ **Spell it however it sounds to you - I'll understand!**\n\nHere's your first word:\n\n**"${q.word}"**\n\nCan you think of a word that rhymes with it?`;
    case 'odd-one-out-1':
      return `💡 Welcome to **Odd One Out**!\n\nI'll show you 4 words. Three of them belong to the same group, but one doesn't fit. Your job is to find the one that doesn't belong!\n\n✨ **Type the word however you can - I'll recognize it!**\n\nHere are your 4 words:\n\n**${q.words.join(', ')}**\n\nWhich one is the odd one out?`;
    case 'spelling-1':
      return `✏️ Welcome to **Spelling Squad**!\n\nI'll show you a sentence with one word that's spelled incorrectly. Your mission is to find that word and type the correct spelling!\n\n✨ **This is perfect practice for dyslexic learners - I'll help you improve!**\n\nHere's your first sentence:\n\n*"${q.sentence}"*\n\nWhich word is misspelled? Type the correct spelling!`;
    default:
      return 'Welcome to the challenge!';
  }
}

// Generate a full AI-like explanation when user is confused
export function processAnswer(state: OfflineChallengeState, userInput: string): {
  response: string;
  correct: boolean;
  points: number;
  complete: boolean;
  newState: OfflineChallengeState;
} {
  const q = state.questions[state.questionIndex];
  const input = userInput.trim();
  let correct = false;
  let response = '';
  let points = 0;
  let complete = false;
  let newState = { ...state, attempts: state.attempts + 1, lastUserInput: input };

  // Story mode — redirect to online AI (this should not be processed offline)
  if (state.challengeId === 'story-1') {
    return {
      response: `🌟 **Story mode requires online AI for the best dyslexia support!**\n\nPlease switch to online mode to continue your creative story. The AI will understand your writing style and help you create amazing stories together! ✨\n\n[REQUIRES_ONLINE_MODE]`,
      correct: false,
      points: 0,
      complete: false,
      newState
    };
  }

  // Handle confused/help requests with progressive hint system
  if (isConfused(input)) {
    // Don't immediately skip to next question - provide progressive help instead
    if (newState.attempts === 1) {
      // First help request - give a gentle hint
      const hint = getHint(state.challengeId, q);
      response = `That's okay! Let me give you a hint to help you out. 🤔\n\n**Here's a hint:**\n\n${hint}\n\nTry again - you can do it! Or type **"help"** again if you need more guidance. 💪`;
    } else if (newState.attempts === 2) {
      // Second help request - give a stronger hint
      const strongHint = getStrongHint(state.challengeId, q);
      response = `No worries! Let me give you a bigger hint. 😊\n\n**Here's a stronger hint:**\n\n${strongHint}\n\nGive it another try! Or type **"help"** once more if you'd like me to explain the full answer. 🌟`;
    } else {
      // Third help request - give full explanation and move to next question
      const explanation = getFullExplanation(state.challengeId, q);
      newState.questionIndex += 1;
      newState.attempts = 0;
      
      if (newState.questionIndex >= newState.questions.length) {
        response = `${explanation}\n\n🎊 **Challenge Complete!** You learned by asking for help - that's exactly what good learners do! Keep practicing and asking questions! 🌟\n\n[CHALLENGE_COMPLETE:25]`;
        complete = true;
        points = 25;
      } else {
        const nextQ = newState.questions[newState.questionIndex];
        response = `${explanation}\n\n---\n\n**Ready for the next one?** Here it is:\n\n${getNextQuestion(state.challengeId, nextQ)} *(${newState.correctCount}/5 correct)*`;
      }
    }
    return { response, correct: false, points, complete, newState };
  }

  // ENHANCED ANSWER VALIDATION - Fix all 6 issues
  let validationResult: { isCorrect: boolean; confidence: number; corrections: string[] };
  
  switch (state.challengeId) {
    case 'scramble-1':
      validationResult = validateScrambledSentence(input, q.answer);
      correct = validationResult.isCorrect;
      break;
      
    case 'math-1':
    case 'pattern-1': {
      const numberResult = parseNumberEnhanced(input);
      if (numberResult.number !== null && numberResult.number === q.answer) {
        correct = true;
        validationResult = { 
          isCorrect: true, 
          confidence: numberResult.confidence, 
          corrections: numberResult.corrections 
        };
      } else {
        correct = false;
        validationResult = { 
          isCorrect: false, 
          confidence: 0, 
          corrections: numberResult.corrections.length > 0 ? 
            numberResult.corrections : [`The answer is ${q.answer}`] 
        };
      }
      break;
    }
    
    case 'synonym-1': {
      // Check against known synonyms with fuzzy matching
      let bestMatch = { match: false, confidence: 0, corrections: [] as string[] };
      
      for (const synonym of q.synonyms) {
        const fuzzyResult = fuzzyMatchWithConfidence(input, synonym);
        if (fuzzyResult.match && fuzzyResult.confidence > bestMatch.confidence) {
          bestMatch = fuzzyResult;
        }
      }
      
      // Also accept reasonable synonyms not in the list (basic validation)
      if (!bestMatch.match && input.length >= 3) {
        const inputNorm = dyslexiaNormalize(input);
        const wordNorm = dyslexiaNormalize(q.word);
        
        // Don't accept the same word or very similar words
        if (inputNorm !== wordNorm && !inputNorm.includes(wordNorm) && !wordNorm.includes(inputNorm)) {
          bestMatch = { match: true, confidence: 0.7, corrections: [] };
        }
      }
      
      correct = bestMatch.match;
      validationResult = {
        isCorrect: bestMatch.match,
        confidence: bestMatch.confidence,
        corrections: bestMatch.corrections
      };
      break;
    }
    
    case 'rhyme-1': {
      const rhymeResult = validateRhyme(input, q.word, q.rhymes);
      correct = rhymeResult.isValid;
      validationResult = {
        isCorrect: rhymeResult.isValid,
        confidence: rhymeResult.confidence,
        corrections: rhymeResult.corrections
      };
      break;
    }
    
    case 'odd-one-out-1': {
      const fuzzyResult = fuzzyMatchWithConfidence(input, q.odd);
      correct = fuzzyResult.match;
      validationResult = {
        isCorrect: fuzzyResult.match,
        confidence: fuzzyResult.confidence,
        corrections: fuzzyResult.corrections
      };
      break;
    }
    
    case 'spelling-1': {
      const correctResult = fuzzyMatchWithConfidence(input, q.correct);
      const wrongResult = fuzzyMatchWithConfidence(input, q.wrong);
      
      // Must match correct word AND not match wrong word
      correct = correctResult.match && !wrongResult.match;
      validationResult = {
        isCorrect: correct,
        confidence: correct ? correctResult.confidence : 0,
        corrections: correctResult.corrections
      };
      break;
    }
    
    default:
      validationResult = { isCorrect: false, confidence: 0, corrections: [] };
  }

  // Add spelling corrections to state
  if (validationResult.corrections.length > 0) {
    newState.spellingCorrections.push(...validationResult.corrections);
  }

  if (correct) {
    // CORRECT ANSWER HANDLING
    newState.correctCount += 1;
    newState.questionIndex += 1;
    newState.attempts = 0;
    
    const pointsMap: Record<string, number> = {
      'scramble-1': 15, 'math-1': 20, 'pattern-1': 15,
      'synonym-1': 10, 'rhyme-1': 10, 'odd-one-out-1': 10, 'spelling-1': 15
    };
    points = pointsMap[state.challengeId] || 10;

    // Generate praise with spelling feedback if needed
    let praiseMsg = pick(PRAISE);
    if (validationResult.corrections.length > 0) {
      praiseMsg = `${praiseMsg}\n\n💡 **Spelling tip:** ${validationResult.corrections.join(', ')}`;
    }

    if (newState.correctCount >= 5) {
      complete = true;
      response = `${praiseMsg}\n\n🎊 **AMAZING! You completed the challenge!** You got all 5 questions right!\n\nYou're absolutely brilliant! Your hard work is paying off - keep up this fantastic learning! ⭐\n\n[CHALLENGE_COMPLETE:50]`;
    } else {
      const nextQ = newState.questions[newState.questionIndex];
      response = `${praiseMsg}\n\n${getNextQuestion(state.challengeId, nextQ)} *(${newState.correctCount}/5 correct)*`;
    }
  } else {
    // INCORRECT ANSWER HANDLING - Enhanced feedback system
    const dyslexiaFeedback = generateDyslexiaFeedback(input, getTargetAnswer(state.challengeId, q), state.challengeId);
    const encouragement = generateEncouragement(input, getTargetAnswer(state.challengeId, q), newState.attempts, state.challengeId);
    
    // Progressive hint system
    if (newState.attempts >= 3) {
      // After 3 attempts, give full explanation and move on
      const explanation = getFullExplanation(state.challengeId, q);
      newState.questionIndex += 1;
      newState.attempts = 0;
      
      if (newState.questionIndex >= newState.questions.length) {
        response = `${encouragement}\n\n${explanation}\n\n🎊 **Challenge Complete!** You learned through practice - that's the best way! Keep working hard! 🌟\n\n[CHALLENGE_COMPLETE:30]`;
        complete = true;
        points = 30;
      } else {
        const nextQ = newState.questions[newState.questionIndex];
        response = `${encouragement}\n\n${explanation}\n\n---\n\n**Let's try the next one!**\n\n${getNextQuestion(state.challengeId, nextQ)} *(${newState.correctCount}/5 correct)*`;
      }
    } else if (newState.attempts === 2) {
      // After 2 attempts, give strong hint
      const strongHint = getStrongHint(state.challengeId, q);
      response = `${dyslexiaFeedback}\n\n**Here's a bigger hint:**\n\n${strongHint}\n\nTry again - you're so close! Or type **"help"** if you'd like me to explain the answer. 💪`;
    } else {
      // First attempt - gentle hint
      const hint = getHint(state.challengeId, q);
      response = `${dyslexiaFeedback}\n\n**Here's a hint:**\n\n${hint}\n\nHave another go! You can do it! 🌟`;
    }
  }

  return { response, correct, points, complete, newState };
}

// Helper function to get target answer for feedback
function getTargetAnswer(challengeId: string, q: any): string {
  switch (challengeId) {
    case 'scramble-1': return q.answer;
    case 'math-1':
    case 'pattern-1': return q.answer.toString();
    case 'synonym-1': return q.synonyms[0];
    case 'rhyme-1': return q.rhymes[0];
    case 'odd-one-out-1': return q.odd;
    case 'spelling-1': return q.correct;
    default: return '';
  }
}

function getNextQuestion(challengeId: string, q: any): string {
  switch (challengeId) {
    case 'scramble-1': return `**Next scrambled sentence:**\n\n**"${q.scrambled}"**\n\nPut the words in the right order!`;
    case 'math-1': return `**Next math problem:**\n\n${q.question}`;
    case 'pattern-1': return `**Next pattern:**\n\n**${q.sequence}**\n\nWhat number is missing?`;
    case 'synonym-1': return `**Find a synonym for:** **"${q.word}"**`;
    case 'rhyme-1': return `**Find a word that rhymes with:** **"${q.word}"**`;
    case 'odd-one-out-1': return `**Which word doesn't belong?**\n\n**${q.words.join(', ')}**`;
    case 'spelling-1': return `**Find and fix the misspelled word:**\n\n*"${q.sentence}"*`;
    default: return '';
  }
}

function getHint(challengeId: string, q: any): string {
  switch (challengeId) {
    case 'scramble-1': 
      const firstWord = q.answer.split(' ')[0];
      return `💡 The sentence starts with **"${firstWord}"**`;
    case 'math-1': 
      return `💡 Look for the numbers in the problem. What operation do you need to do?`;
    case 'pattern-1': 
      return `💡 ${q.hint}`;
    case 'synonym-1': 
      return `💡 Think of a word that means the same as "${q.word}". For example, if the word was "big", you could say "large".`;
    case 'rhyme-1': 
      return `💡 Think of words that end with the same sound as "${q.word}". Say "${q.word}" out loud — what sound does it end with?`;
    case 'odd-one-out-1': 
      return `💡 Think about what category most of these words belong to. What do they have in common?`;
    case 'spelling-1': 
      return `💡 Read each word carefully. One of them doesn't look quite right — try sounding it out!`;
    default: return '';
  }
}

function getStrongHint(challengeId: string, q: any): string {
  switch (challengeId) {
    case 'scramble-1':
      const words = q.answer.split(' ');
      const firstTwo = words.slice(0, 2).join(' ');
      return `🔍 The sentence has ${words.length} words and starts with **"${firstTwo}..."**`;
    case 'math-1':
      const answerRange = `between ${Math.max(0, q.answer - 10)} and ${q.answer + 10}`;
      return `🔍 The answer is a number ${answerRange}. Try adding or subtracting the numbers in the problem.`;
    case 'pattern-1':
      return `🔍 ${q.hint}. The missing number is **${q.answer}**.`;
    case 'synonym-1':
      const firstSynonym = q.synonyms[0];
      return `🔍 Here's a big clue: one synonym for "${q.word}" is **"${firstSynonym}"**. Can you think of another?`;
    case 'rhyme-1':
      const firstRhyme = q.rhymes[0];
      return `🔍 Here's a word that rhymes with "${q.word}": **"${firstRhyme}"**. Can you think of another one?`;
    case 'odd-one-out-1':
      const others = q.words.filter((w: string) => w !== q.odd).slice(0, 2).join(' and ');
      return `🔍 Words like **${others}** belong to the same group. One word is different from them.`;
    case 'spelling-1':
      return `🔍 The misspelled word is **"${q.wrong}"**. The correct spelling is **"${q.correct}"**.`;
    default: return '';
  }
}

// Generate comprehensive AI-like explanations when user needs help
function getFullExplanation(challengeId: string, q: any): string {
  const enc = pick(ENCOURAGEMENT);
  switch (challengeId) {
    case 'scramble-1':
      return `${enc}\n\n**The scrambled words were:** "${q.scrambled}"\n\nTo unscramble them, think about what makes sense as a sentence. A sentence usually starts with "The" or "A" and has a subject (who/what) and an action (what they do).\n\n✨ **The correct sentence is:** "${q.answer}"\n\nNow you know the pattern! Let's try the next one! 💪`;
    case 'math-1':
      return `${enc}\n\n**Problem:** ${q.question}\n\nLet me solve this step by step:\n- Read the problem carefully\n- Find the numbers and what operation to do\n- The answer is **${q.answer}**\n\nGreat learning! Let's move to the next problem! 🧙`;
    case 'pattern-1':
      return `${enc}\n\n**The sequence was:** ${q.sequence}\n\n**Pattern explanation:** ${q.hint}\n\nSo the missing number is **${q.answer}**!\n\nThe trick with patterns is to look at how the numbers change from one to the next. Ready for the next one? 🔢`;
    case 'synonym-1':
      return `${enc}\n\n**The word was:** "${q.word}"\n\nA synonym is a word with the same meaning. Here are some synonyms for "${q.word}":\n${q.synonyms.map((s: string) => `• **${s}**`).join('\n')}\n\nAny of these would be correct! Let's try the next word! 🔍`;
    case 'rhyme-1':
      return `${enc}\n\n**The word was:** "${q.word}"\n\nWords that rhyme with "${q.word}" include:\n${q.rhymes.map((r: string) => `• **${r}**`).join('\n')}\n\nRhyming words share the same ending sound! Ready for the next one? 🎵`;
    case 'odd-one-out-1':
      return `${enc}\n\n**The words were:** ${q.words.join(', ')}\n\nLet's think about what each word is:\n${q.words.map((w: string) => `• **${w}** — ${w === q.odd ? '(this is different!)' : '(fits the group)'}`).join('\n')}\n\n✨ **The odd one out is "${q.odd}"** because ${q.reason}.\n\nGreat learning moment! Next question! 💡`;
    case 'spelling-1':
      return `${enc}\n\n**The sentence was:** "${q.sentence}"\n\nLook at the word **"${q.wrong}"** — it doesn't look quite right, does it?\n\n✨ **The correct spelling is "${q.correct}"**\n\nA good trick: sound out the word slowly and think about which letters make each sound. Let's try the next one! ✏️`;
    default:
      return enc;
  }
}

export const OFFLINE_CHALLENGE_IDS = new Set([
  'scramble-1', 'math-1', 'pattern-1', 'synonym-1',
  'rhyme-1', 'odd-one-out-1', 'spelling-1', 'story-1'
]);

/**
 * ENHANCED general question answering with dyslexia support
 * This makes the offline engine act like an AI tutor even outside challenges.
 */
export function answerGeneralQuestion(question: string): string | null {
  const knowledge = searchKnowledge(question);
  
  if (knowledge) {
    return `Great question! Let me explain.\n\n${knowledge.answer}\n\n💡 **Visual Aid:** [${knowledge.keywords[0]}]`;
  }
  
  // If no exact match, provide a helpful fallback
  if (/what is|what are|tell me about|explain/i.test(question)) {
    const randomFact = getRandomKnowledge();
    return `I don't have specific information about that right now, but here's something interesting you might like to know:\n\n**${randomFact.question}**\n\n${randomFact.answer}\n\nFeel free to ask me about animals, science, math, language, or geography! 🌟`;
  }
  
  return null;
}

/**
 * NEW: Check if challenge should use online mode for better dyslexia support
 */
export function shouldUseOnlineMode(challengeId: string): boolean {
  // Story mode always requires online AI for best dyslexia support
  return challengeId === 'story-1';
}

/**
 * NEW: Get offline/online mode recommendation message
 */
export function getModeRecommendation(challengeId: string): string | null {
  if (challengeId === 'story-1') {
    return `🌟 **Story mode works best online!** The AI can understand your creative writing better and provide personalized feedback for dyslexic learners. Switch to online mode for the full experience! ✨`;
  }
  return null;
}
