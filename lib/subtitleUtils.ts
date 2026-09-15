"use client";

/**
 * Clean up voice captions/subtitles for display:
 * - Strips XML/HTML tags (e.g. <sigml>, <hns_sign...>)
 * - Strips bracketed sign/gloss or stage directions (e.g. [CROW], [THIRSTY], [points to board])
 * - Strips parenthetical sign/movement directives (e.g. (points with right hand), (sign for water))
 * - Preserves natural spoken text and educational parentheticals (e.g. (CO2), (V = I × R), (CP))
 * - Normalizes whitespace and trims
 */
export function cleanVoiceSubtitles(text: string | null | undefined): string {
  if (!text) return "";
  return text
    // 1. Strip XML / HTML tags like <sigml>, <hns_sign gloss="...">
    .replace(/<[^>]*>/g, "")
    // 2. Strip bracketed tokens e.g. [BOY], [WATER], [pointing to pitcher], [sign: crow]
    .replace(/\[[^\]]*\]/g, "")
    // 3. Strip parenthetical sign/movement directives e.g. (sign: crow), (points with right hand to pitcher), (gesture for big)
    // while preserving educational parentheticals like (CO2), (V = I × R), (CP), (photosynthesis)
    .replace(/\(\s*(?:movement|gesture|sign\s+language|sign|hands?|points?|pointing|action|body|motion|facial|pose)\b[^)]*\)/gi, "")
    // 4. Strip leftover SiGML/HamNoSys tokens if any leaked into text
    .replace(/\b(?:sigml|hns_sign|hamnosys|ham[a-z0-9]+|gloss=["'][^"']*["'])\b/gi, "")
    // 5. Strip "Sign: ..." or "Action: ..." or "Movement: ..." prefixes
    .replace(/^(?:sign|action|movement|gesture):\s*/gi, "")
    // 6. Clean up orphaned double spaces or leading/trailing whitespace
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Proper Noun & Academic Dictionary for high-accuracy capitalization
 */
const PROPER_NOUN_MAP: Record<string, string> = {
  // Scientists & Pioneers
  newton: "Newton",
  "newton's": "Newton's",
  einstein: "Einstein",
  "einstein's": "Einstein's",
  galileo: "Galileo",
  faraday: "Faraday",
  ohm: "Ohm",
  joule: "Joule",
  pascal: "Pascal",
  bohr: "Bohr",
  rutherford: "Rutherford",
  darwin: "Darwin",
  mendel: "Mendel",
  pythagoras: "Pythagoras",
  archimedes: "Archimedes",
  tesla: "Tesla",
  raman: "Raman",
  cv: "C.V.",

  // Subjects & Topics
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  mathematics: "Mathematics",
  maths: "Maths",
  algebra: "Algebra",
  geometry: "Geometry",
  calculus: "Calculus",
  science: "Science",
  history: "History",
  geography: "Geography",
  english: "English",
  hindi: "Hindi",

  // Acronyms & Tech
  ai: "AI",
  dna: "DNA",
  rna: "RNA",
  cpu: "CPU",
  ram: "RAM",
  tv: "TV",
  pdf: "PDF",
  nasa: "NASA",
  isro: "ISRO",
  led: "LED",
  lcd: "LCD",
  usb: "USB",
  url: "URL",
  http: "HTTP",
  https: "HTTPS",
  api: "API",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  python: "Python",
  webgl: "WebGL",
  cbse: "CBSE",
  ncert: "NCERT",
  iit: "IIT",
  neet: "NEET",

  // Platform & Brand
  signova: "Signova",
  google: "Google",
  youtube: "YouTube",
};

/**
 * Question Starter Words for smart punctuation
 */
const QUESTION_STARTERS = new Set([
  "who", "whom", "whose", "what", "where", "when", "why", "how",
  "is", "are", "am", "was", "were", "can", "could", "would", "should",
  "will", "shall", "do", "does", "did", "have", "has", "had", "which"
]);

/**
 * Formats raw voice speech-to-text into grammatically written, crystal-clear subtitles:
 * - Cleans noise, tags, and stage directions
 * - Capitalizes sentence beginnings
 * - Capitalizes standalone "I" and contractions ("I'm", "I've", "I'll", "I'd")
 * - Capitalizes proper names, educational topics, scientists, and acronyms
 * - Formats scientific/mathematical symbols (H₂O, CO₂, E = mc², F = ma, sin(θ), etc.)
 * - Intelligently applies final sentence punctuation (. or ?) on completed utterances
 */
export function formatProperSubtitles(text: string | null | undefined, isFinal: boolean = false): string {
  if (!text) return "";
  let s = cleanVoiceSubtitles(text);
  if (!s) return "";

  // 1. Scientific & Chemical Formula Replacements
  s = s
    .replace(/\b(h\s*2\s*o|h\s+two\s+o)\b/gi, "H₂O")
    .replace(/\b(c\s*o\s*2|c\s+o\s+two)\b/gi, "CO₂")
    .replace(/\b(o\s*2|o\s+two)\b/gi, "O₂")
    .replace(/\b(n\s*2|n\s+two)\b/gi, "N₂")
    .replace(/\b(e\s*=\s*m\s*c\s*2|e\s*=\s*mc\s*square)\b/gi, "E = mc²")
    .replace(/\b(f\s*=\s*m\s*a)\b/gi, "F = ma")
    .replace(/\b(v\s*=\s*i\s*r)\b/gi, "V = IR")
    .replace(/\b(sin|cos|tan)\s+(theta|θ)\b/gi, "$1(θ)")
    .replace(/\bpi\s+r\s+(square|squared)\b/gi, "πr²")
    .replace(/\b(degree|degrees)\s+celsius\b/gi, "°C")
    .replace(/\b(degree|degrees)\s+fahrenheit\b/gi, "°F");

  // 2. Personal Pronoun Capitalization: "i", "i'm", "i've", "i'll", "i'd"
  s = s.replace(/\b(i)('m|'ve|'ll|'d)?\b/g, (match, p1, p2) => {
    return "I" + (p2 || "");
  });

  // 3. Proper Noun, Scientist, and Acronym Capitalization
  s = s.replace(/\b[a-zA-Z0-9']+\b/g, (word) => {
    const lower = word.toLowerCase();
    if (PROPER_NOUN_MAP[lower]) {
      return PROPER_NOUN_MAP[lower];
    }
    return word;
  });

  // 4. Sentence Capitalization:
  // Capitalize the first character of the string and any character following sentence delimiters (. ! ? ।)
  s = s.replace(/(^\s*|[.!?।]\s+)([a-z\u00E0-\u00FF])/g, (_match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  // 5. Smart Sentence Punctuation on Final Utterances
  if (isFinal && s.length > 0) {
    const trimmed = s.trim();
    const lastChar = trimmed[trimmed.length - 1];

    // If the sentence does not end in punctuation
    if (!/[.!?।,:;]/.test(lastChar)) {
      // Check first word of the last sentence fragment
      const sentences = trimmed.split(/[.!?।]\s+/);
      const lastSentence = sentences[sentences.length - 1].trim();
      const firstWord = lastSentence.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");

      if (firstWord && QUESTION_STARTERS.has(firstWord)) {
        s = trimmed + "?";
      } else {
        s = trimmed + ".";
      }
    }
  }

  return s;
}
