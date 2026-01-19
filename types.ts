
export interface Caption {
  id: string;
  start: number;
  end: number;
  text: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  EXTRACTING_AUDIO = 'EXTRACTING_AUDIO',
  TRANSCRIBING = 'TRANSCRIBING',
  TRANSLATING = 'TRANSLATING',
  GENERATING_SPEECH = 'GENERATING_SPEECH',
  RENDERING = 'RENDERING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export const SUPPORTED_LANGUAGES = [
  { code: 'ur-PK', name: 'Urdu' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'pt-BR', name: 'Portuguese' },
  { code: 'ru-RU', name: 'Russian' }
];
