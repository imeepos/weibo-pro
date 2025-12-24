import { Injectable } from '@sker/core';
import type { TokenizerConfig, WordFrequency } from './types';

const DEFAULT_STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
  '会', '着', '没有', '看', '好', '自己', '这', '那', '里', '为', '以', '个', '用', '来', '时', '大', '地', '可', '这个', '中',
  '么', '出', '而', '能', '她', '多', '如果', '他', '但', '与', '得', '于', '后', '之', '因为', '所以', '这样', '还', '并',
  '啊', '呢', '吗', '哦', '嗯', '吧', '呀', '哈', '哎', '唉', '嘿', '喂', '哇', '噢',
]);

@Injectable()
export class Tokenizer {
  private stopWords: Set<string>;
  private minLength: number;
  private maxLength: number;

  constructor(config: TokenizerConfig = {}) {
    this.stopWords = new Set([...DEFAULT_STOP_WORDS, ...(config.stopWords || [])]);
    this.minLength = config.minLength || 2;
    this.maxLength = config.maxLength || 10;
  }

  tokenize(text: string): string[] {
    const chineseRegex = /[\u4e00-\u9fa5]+/g;
    const matches = text.match(chineseRegex) || [];

    return matches
      .flatMap(match => this.segmentChinese(match))
      .filter(word => this.isValidWord(word));
  }

  extractKeywords(text: string, topN = 50): WordFrequency[] {
    const words = this.tokenize(text);
    const frequency = new Map<string, number>();

    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }

  private segmentChinese(text: string): string[] {
    const words: string[] = [];
    let i = 0;

    while (i < text.length) {
      let maxLen = Math.min(this.maxLength, text.length - i);
      let found = false;

      for (let len = maxLen; len >= this.minLength; len--) {
        const word = text.slice(i, i + len);
        if (this.isValidWord(word)) {
          words.push(word);
          i += len;
          found = true;
          break;
        }
      }

      if (!found) {
        i++;
      }
    }

    return words;
  }

  private isValidWord(word: string): boolean {
    return (
      word.length >= this.minLength &&
      word.length <= this.maxLength &&
      !this.stopWords.has(word) &&
      !/^\d+$/.test(word)
    );
  }
}
