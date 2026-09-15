/**
 * Avatar-gender -> voice mapping, shared by SettingsPanel (live translation)
 * and AIToolsModal (Quick Demos) so switching to a male/female avatar
 * automatically switches the matching TTS voice for whatever language is
 * selected, instead of requiring a separate manual voice pick every time.
 *
 * Avatar genders are best-effort based on the standard eSign/CWASA avatar
 * naming convention (Marc, Siggi = male signers; Anna, Luna, Francoise =
 * female signers in the original character set) — not verified against any
 * project-internal source, since none exists. Easy to fix here if wrong.
 */
export type Gender = 'male' | 'female';

export const AVATAR_GENDER: Record<string, Gender> = {
  luna: 'female',
  anna: 'female',
  francoise: 'female',
  prachi: 'female',
  soumya: 'female',
  marc: 'male',
  siggi: 'male',
};

export function getAvatarGender(avatarName: string): Gender {
  return AVATAR_GENDER[avatarName] || 'female';
}

interface LanguageVoices {
  male: string;
  female: string;
  /** False when no male model exists yet for this language. */
  maleAvailable: boolean;
}

// All edge-tts neural voice IDs (Microsoft) — not Piper/ONNX. Piper's local
// .onnx model files are gitignored (~496MB) and never downloaded in
// production, so every non-English voice silently produced no audio at all
// on Railway. edge-tts has real voices for each of these languages, so
// there's no quality tradeoff switching to it uniformly.
export const VOICE_BY_LANGUAGE: Record<string, LanguageVoices> = {
  English: { male: 'en-US-GuyNeural', female: 'en-US-AriaNeural', maleAvailable: true },
  Hindi: { male: 'hi-IN-MadhurNeural', female: 'hi-IN-SwaraNeural', maleAvailable: true },
  Marathi: { male: 'mr-IN-ManoharNeural', female: 'mr-IN-AarohiNeural', maleAvailable: true },
  Malayalam: { male: 'ml-IN-MidhunNeural', female: 'ml-IN-SobhanaNeural', maleAvailable: true },
  Telugu: { male: 'te-IN-MohanNeural', female: 'te-IN-ShrutiNeural', maleAvailable: true },
  Kannada: { male: 'kn-IN-GaganNeural', female: 'kn-IN-SapnaNeural', maleAvailable: true },
};

/** The voice ID matching `gender` for `language`, or "" if the language is unknown. */
export function getVoiceForLanguage(language: string, gender: Gender): string {
  const entry = VOICE_BY_LANGUAGE[language];
  if (!entry) return "";
  return gender === 'male' ? entry.male : entry.female;
}
