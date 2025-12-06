export enum TranslationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface TranslationResult {
  original: string;
  translated: string;
}

export type TranslationMode = 'BANGLA_TO_ENGLISH' | 'ENGLISH_TO_BANGLA';