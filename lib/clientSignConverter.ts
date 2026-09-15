"use client";

import type { PlayChunk } from '../hooks/useCWASA';

// In-memory caches for sign dictionaries
let signDictCache: Record<string, string> | null = null;
let fingerspellCache: Record<string, string> | null = null;
let dictLoadingPromise: Promise<void> | null = null;

// Mathematical & scientific formula expansions to natural educational spoken text
export const FORMULA_EXPANSIONS: Record<string, string> = {
  "f = ma": "Force equals mass times acceleration",
  "f=ma": "Force equals mass times acceleration",
  "e = mc²": "Energy equals mass times speed of light squared",
  "e=mc²": "Energy equals mass times speed of light squared",
  "e = mc2": "Energy equals mass times speed of light squared",
  "e=mc2": "Energy equals mass times speed of light squared",
  "v = d / t": "Velocity equals distance divided by time",
  "v = d/t": "Velocity equals distance divided by time",
  "v=d/t": "Velocity equals distance divided by time",
  "w = f · d": "Work equals force times distance",
  "w = f * d": "Work equals force times distance",
  "w=f*d": "Work equals force times distance",
  "v = i · r": "Ohm's Law: Voltage equals current times resistance",
  "v = i * r": "Ohm's Law: Voltage equals current times resistance",
  "v = ir": "Ohm's Law: Voltage equals current times resistance",
  "v=ir": "Ohm's Law: Voltage equals current times resistance",
  "π": "Pi constant geometry value 3.14",
  "θ": "Angle theta in trigonometry",
  "σ": "Sigma summation of series",
  "∑": "Summation of all terms",
  "√": "Square root function",
  "∫": "Calculus integration area under curve",
  "δ": "Delta change in quantity",
  "λ": "Lambda wavelength of wave",
  "α": "Alpha angle coefficient",
  "β": "Beta ray coefficient",
  "∞": "Infinity unbounded value",
  "≈": "Approximately equal to"
};

// Shape educational descriptions
export const SHAPE_DESCRIPTIONS: Record<string, { title: string; prompt: string }> = {
  axes: {
    title: "Coordinate Axes",
    prompt: "Cartesian coordinate axes X and Y defining the plane."
  },
  arrow: {
    title: "Vector Arrow",
    prompt: "Vector quantity having magnitude and direction."
  },
  circle: {
    title: "Circle",
    prompt: "Circle geometry with radius and circumference."
  },
  rect: {
    title: "Rectangle Mass Block",
    prompt: "Rectangle mass block on a surface."
  },
  triangle: {
    title: "Triangle",
    prompt: "Triangle geometry and optics refraction prism."
  },
  wave: {
    title: "Wave and Spring",
    prompt: "Sinusoidal oscillating wave and physics spring."
  },
  angle: {
    title: "Angle Theta",
    prompt: "Angle theta measured in degrees and radians."
  }
};

/**
 * Loads sign and fingerspelling dictionaries from public assets.
 */
export async function loadSignDictionaries(): Promise<void> {
  if (signDictCache && fingerspellCache) return;
  if (dictLoadingPromise) return dictLoadingPromise;

  dictLoadingPromise = (async () => {
    try {
      const [signRes, fingerRes] = await Promise.all([
        fetch("/sign_dict.json"),
        fetch("/fingerspell.json")
      ]);

      if (signRes.ok) {
        signDictCache = await signRes.json();
      } else {
        signDictCache = {};
      }

      if (fingerRes.ok) {
        fingerspellCache = await fingerRes.json();
      } else {
        fingerspellCache = {};
      }
    } catch (e) {
      console.warn("[ClientSignConverter] Failed to load dictionaries, initializing empty:", e);
      signDictCache = signDictCache || {};
      fingerspellCache = fingerspellCache || {};
    }
  })();

  return dictLoadingPromise;
}

/**
 * Normalizes input text and expands equations/symbols.
 */
export function expandEquationOrText(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Check formula expansions first
  if (FORMULA_EXPANSIONS[lower]) {
    return FORMULA_EXPANSIONS[lower];
  }

  // Common symbol replacements
  return trimmed
    .replace(/²/g, " squared")
    .replace(/·/g, " times ")
    .replace(/=/g, " equals ")
    .replace(/\+/g, " plus ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts text into an array of SiGML strings using direct dictionary matching
 * and character fingerspelling.
 */
export async function textToSiGML(text: string): Promise<string[]> {
  await loadSignDictionaries();

  const expanded = expandEquationOrText(text);
  if (!expanded) return [];

  const words = expanded
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'।]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0);

  const sigmlSequence: string[] = [];

  for (const word of words) {
    // 1. Direct dictionary match
    if (signDictCache && signDictCache[word]) {
      sigmlSequence.push(signDictCache[word]);
      continue;
    }

    // 2. Fallback to fingerspelling character-by-character
    if (fingerspellCache) {
      for (const char of word) {
        if (fingerspellCache[char]) {
          sigmlSequence.push(fingerspellCache[char]);
        }
      }
    }
  }

  return sigmlSequence;
}

/**
 * Generates a complete PlayChunk ready for CWASA avatar playback with 0ms latency.
 */
export async function generateClientEducationalChunk(
  textOrSymbol: string,
  title?: string
): Promise<PlayChunk> {
  const expandedText = expandEquationOrText(textOrSymbol);
  const sigml = await textToSiGML(expandedText);

  return {
    text: expandedText,
    sigml,
    concept: title || textOrSymbol
  };
}
