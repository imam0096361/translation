
export enum TranslationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  STREAMING = 'STREAMING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface TranslationResult {
  original: string;
  translated: string;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
}

export interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  format: TranslationFormat;
  timestamp: number;
}

export type Language = 'BANGLA' | 'ENGLISH' | 'UNKNOWN';

export type TranslationMode = 'BANGLA_TO_ENGLISH' | 'ENGLISH_TO_BANGLA';

export type TranslationFormat = 'PARAGRAPH_BY_PARAGRAPH' | 'FULL_TRANSLATION';

export type ModelTier = 'FAST' | 'DEEP_EDITORIAL';

export type ContentType = 'HARD_NEWS' | 'OP_ED';
