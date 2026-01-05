
import { GoogleGenAI } from "@google/genai";
import { TranslationFormat, ModelTier, GlossaryEntry, ContentType, Language } from "../types";

// Always initialize with process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robust client-side language detection focusing on Bangla vs English.
 * Uses a combination of stopword analysis, word-level script dominance,
 * and character range heuristics.
 */
export const detectLanguage = (text: string): Language => {
  if (!text || text.trim().length < 2) return 'UNKNOWN';

  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return 'UNKNOWN';

  let banglaScore = 0;
  let englishScore = 0;

  // High-frequency functional words (stopwords)
  const banglaStopwords = new Set(['এবং', 'ও', 'কিন্তু', 'যদি', 'তবে', 'জন্য', 'থেকে', 'করা', 'হয়', 'করে', 'ছিল', 'আছে', 'আমি', 'তুমি', 'সে', 'এই', 'সেই', 'তার', 'কে']);
  const englishStopwords = new Set(['the', 'and', 'is', 'of', 'in', 'to', 'for', 'it', 'on', 'with', 'as', 'at', 'by', 'this', 'that', 'was', 'were', 'from', 'an', 'be']);

  const banglaCharRegex = /[\u0980-\u09FF]/;
  const englishCharRegex = /[a-z]/;

  words.forEach(word => {
    // 1. Stopword check (Very high confidence)
    if (banglaStopwords.has(word)) {
      banglaScore += 10;
    }
    if (englishStopwords.has(word)) {
      englishScore += 10;
    }

    // 2. Word-level script analysis
    const hasBangla = banglaCharRegex.test(word);
    const hasEnglish = englishCharRegex.test(word);

    if (hasBangla && !hasEnglish) {
      banglaScore += 2;
    } else if (hasEnglish && !hasBangla) {
      englishScore += 2;
    } else if (hasBangla && hasEnglish) {
      // Mixed word (e.g. "Tk-এর") - count actual characters
      const bCount = (word.match(/[\u0980-\u09FF]/g) || []).length;
      const eCount = (word.match(/[a-z]/g) || []).length;
      if (bCount > eCount) banglaScore += 1;
      else if (eCount > bCount) englishScore += 1;
    }
  });

  // 3. Fallback to raw character density if scores are tied or zero
  if (banglaScore === englishScore) {
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    
    if (banglaChars > englishChars) return 'BANGLA';
    if (englishChars > banglaChars) return 'ENGLISH';
    return 'UNKNOWN';
  }

  // Use a dominance threshold to avoid false positives on mixed text
  const ratio = banglaScore > englishScore 
    ? banglaScore / (englishScore || 1) 
    : englishScore / (banglaScore || 1);

  if (ratio < 1.2 && words.length > 5) {
    // If it's very close in a long text, fallback to character count as tie-breaker
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    return banglaChars > englishChars ? 'BANGLA' : 'ENGLISH';
  }

  return banglaScore > englishScore ? 'BANGLA' : 'ENGLISH';
};

const getSystemInstruction = (
  format: TranslationFormat, 
  modelTier: ModelTier, 
  glossary: GlossaryEntry[], 
  contentType: ContentType,
  sourceLang: Language
): string => {
  
  const targetLang = sourceLang === 'BANGLA' ? 'ENGLISH' : 'BANGLA';
  
  const glossaryInstruction = glossary.length > 0 
    ? `\n🔹 GLOSSARY:\n${glossary.map(g => `- "${g.term}" -> "${g.definition}"`).join('\n')}\n`
    : '';

  const persona = `You are a Lead Editor at The Daily Star. Your writing is crisp, professional, and follows British English standards.`;

  const expertiseProtocol = `
🔹 CORE RULES:
1. **NO INTRODUCTIONS**: Never say "Here is the translation", "As a reporter...", or any meta-commentary.
2. **NO CHATTING**: Output the result and nothing else.
3. **HOUSE STYLE**: Use British English (organisation, centre). Use "Tk" for Taka.
4. **NATURALIZATION**: Ensure the English (or Bangla) sounds native, not like a direct literal translation.
${modelTier === 'DEEP_EDITORIAL' ? '5. **AP STYLE ADHERENCE**: Follow Associated Press (AP) style guidelines for structural precision, journalistic clarity, and professional formatting, while strictly maintaining British spelling for individual words.' : ''}
  `;

  const modeInstruction = format === 'FULL_TRANSLATION' 
    ? `
🔹 MODE: FULL ARTICLE
- Start the response IMMEDIATELY with the translated title or first paragraph.
- Output ONLY the finished translation.
    `
    : `
🔹 MODE: COMPARATIVE PARAGRAPHS
- For EVERY paragraph in the input, provide:
[Source]: {Text}
[Translation]: {Translated Text}
- Do not add headers like "Comparative Structure" or "As requested".
    `;

  return `
🔹 INSTRUCTION
📌 Task: Translate from ${sourceLang} to ${targetLang}.
Maintain The Daily Star's professional editorial standards.

${persona}
${expertiseProtocol}
${glossaryInstruction}
${modeInstruction}

🔹 TARGET LANGUAGE RULES:
- If Target is English: Use British English (UK standards).
- If Target is Bangla: Use formal, high-quality journalistic Bangla.

START OUTPUT NOW:
`;
};

export const translateContentStream = async (
  inputText: string, 
  format: TranslationFormat, 
  modelTier: ModelTier,
  glossary: GlossaryEntry[],
  contentType: ContentType = 'HARD_NEWS',
  useSearch: boolean = false,
  onChunk: (text: string) => void,
  onSources?: (sources: any[]) => void
): Promise<void> => {
  if (!inputText.trim()) return;

  const sourceLang = detectLanguage(inputText);
  const modelName = modelTier === 'DEEP_EDITORIAL' 
    ? 'gemini-3-pro-preview' 
    : 'gemini-3-flash-preview';

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: inputText,
      config: {
        systemInstruction: getSystemInstruction(format, modelTier, glossary, contentType, sourceLang),
        temperature: 0.1, 
        ...(useSearch && modelTier === 'DEEP_EDITORIAL' && {
          tools: [{ googleSearch: {} }]
        })
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
      
      if (onSources && chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        onSources(chunk.candidates[0].groundingMetadata.groundingChunks);
      }
    }
  } catch (error) {
    console.error("Translation stream error:", error);
    throw new Error("Failed to translate content.");
  }
};
