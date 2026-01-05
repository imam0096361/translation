
import { GoogleGenAI } from "@google/genai";
import { TranslationFormat, ModelTier, GlossaryEntry, ContentType, Language } from "../types";

// Always initialize with process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Client-side language detection logic focused on Bangla vs English.
 * Uses Unicode script range analysis for high speed and reliability.
 */
export const detectLanguage = (text: string): Language => {
  if (!text || text.trim().length < 2) return 'UNKNOWN';

  // Bangla Unicode range: 0980–09FF
  const banglaRegex = /[\u0980-\u09FF]/g;
  const englishRegex = /[a-zA-Z]/g;

  const banglaMatches = text.match(banglaRegex) || [];
  const englishMatches = text.match(englishRegex) || [];

  if (banglaMatches.length > englishMatches.length) {
    return 'BANGLA';
  } else if (englishMatches.length > 0) {
    return 'ENGLISH';
  }

  return 'UNKNOWN';
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
