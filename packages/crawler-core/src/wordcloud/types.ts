export interface WordFrequency {
  word: string;
  count: number;
}

export interface WordCloudConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  fontFamily?: string;
  minFontSize?: number;
  maxFontSize?: number;
  colors?: string[];
  maxWords?: number;
}

export interface TokenizerConfig {
  minLength?: number;
  maxLength?: number;
  stopWords?: string[];
}
