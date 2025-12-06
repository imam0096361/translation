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

export type TranslationMode = 'BANGLA_TO_ENGLISH' | 'ENGLISH_TO_BANGLA';

export type TranslationFormat = 'PARAGRAPH_BY_PARAGRAPH' | 'FULL_TRANSLATION';

export type ModelTier = 'FAST' | 'DEEP_EDITORIAL';