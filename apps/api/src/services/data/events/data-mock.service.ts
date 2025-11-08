import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class DataMockService {
  estimatePostCount(userCount: number): number {
    return Math.round(userCount * this.randomBetween(2, 5));
  }

  generateSentiment(): number {
    return this.normalDistribution(0.6, 0.1, 0.3, 0.8);
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private normalDistribution(
    mean: number,
    stddev: number,
    min: number,
    max: number
  ): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const sample = mean + stddev * z;
    return Math.max(min, Math.min(max, Math.round(sample * 100) / 100));
  }
}
