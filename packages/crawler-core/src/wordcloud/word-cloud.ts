import { Injectable } from '@sker/core';
import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import type { WordCloudConfig, WordFrequency } from './types';

const DEFAULT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
];

interface WordPosition {
  word: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  width: number;
  height: number;
}

@Injectable()
export class WordCloud {
  private config: Required<WordCloudConfig>;

  constructor(config: WordCloudConfig = {}) {
    this.config = {
      width: config.width || 800,
      height: config.height || 600,
      backgroundColor: config.backgroundColor || '#ffffff',
      fontFamily: config.fontFamily || 'Arial, sans-serif',
      minFontSize: config.minFontSize || 12,
      maxFontSize: config.maxFontSize || 80,
      colors: config.colors || DEFAULT_COLORS,
      maxWords: config.maxWords || 100,
    };
  }

  generate(words: WordFrequency[]): Buffer {
    const canvas = createCanvas(this.config.width, this.config.height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, this.config.width, this.config.height);

    const positions = this.calculatePositions(words.slice(0, this.config.maxWords), ctx);

    for (const pos of positions) {
      ctx.font = `${pos.fontSize}px ${this.config.fontFamily}`;
      ctx.fillStyle = pos.color;
      ctx.fillText(pos.word, pos.x, pos.y);
    }

    return canvas.toBuffer('image/png');
  }

  private calculatePositions(
    words: WordFrequency[],
    ctx: CanvasRenderingContext2D
  ): WordPosition[] {
    if (words.length === 0) return [];

    const maxCount = words[0]?.count ?? 1;
    const minCount = words[words.length - 1]?.count ?? 1;
    const positions: WordPosition[] = [];
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (const { word, count } of words) {
      const fontSize = this.calculateFontSize(count, minCount, maxCount);
      const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)] ?? '#000000';

      ctx.font = `${fontSize}px ${this.config.fontFamily}`;
      const metrics = ctx.measureText(word);
      const width = metrics.width;
      const height = fontSize;

      const position = this.findPosition(width, height, occupied);
      if (position) {
        positions.push({
          word,
          x: position.x,
          y: position.y + height * 0.8,
          fontSize,
          color,
          width,
          height,
        });
        occupied.push({ x: position.x, y: position.y, width, height });
      }
    }

    return positions;
  }

  private calculateFontSize(count: number, minCount: number, maxCount: number): number {
    if (maxCount === minCount) return this.config.maxFontSize;

    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.floor(
      this.config.minFontSize + ratio * (this.config.maxFontSize - this.config.minFontSize)
    );
  }

  private findPosition(
    width: number,
    height: number,
    occupied: Array<{ x: number; y: number; width: number; height: number }>
  ): { x: number; y: number } | null {
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const maxAttempts = 1000;
    const spiralStep = 5;

    for (let i = 0; i < maxAttempts; i++) {
      const angle = i * 0.1;
      const radius = spiralStep * angle;
      const x = centerX + radius * Math.cos(angle) - width / 2;
      const y = centerY + radius * Math.sin(angle) - height / 2;

      if (this.isValidPosition(x, y, width, height, occupied)) {
        return { x, y };
      }
    }

    return null;
  }

  private isValidPosition(
    x: number,
    y: number,
    width: number,
    height: number,
    occupied: Array<{ x: number; y: number; width: number; height: number }>
  ): boolean {
    if (x < 0 || y < 0 || x + width > this.config.width || y + height > this.config.height) {
      return false;
    }

    const padding = 5;
    for (const rect of occupied) {
      if (
        x < rect.x + rect.width + padding &&
        x + width + padding > rect.x &&
        y < rect.y + rect.height + padding &&
        y + height + padding > rect.y
      ) {
        return false;
      }
    }

    return true;
  }
}
