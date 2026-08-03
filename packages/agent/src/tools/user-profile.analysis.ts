import type { UserPost } from './user-profile.queries';

/** 计算一组数值的标准差 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

/** 计算一组文本的平均字符级相似度 */
export function calculateTextSimilarity(texts: string[]): number {
  if (texts.length < 2) return 0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < Math.min(texts.length, 20); i++) {
    for (let j = i + 1; j < Math.min(texts.length, 20); j++) {
      const sim = simpleSimilarity(texts[i]!, texts[j]!);
      totalSimilarity += sim;
      comparisons++;
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/** 字符级 Jaccard 相似度 */
function simpleSimilarity(str1: string, str2: string): number {
  const tokens1 = new Set(str1.split(''));
  const tokens2 = new Set(str2.split(''));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/** 从设备来源 HTML 中提取名称 */
export function extractSource(sourceHtml: string): string {
  const match = sourceHtml.match(/>([^<]+)</);
  return match ? match[1]! : 'unknown';
}

/** 时间规律性评分（0-1，越高越规律，越可能是机器人） */
export function calculateTimeRegularity(
  hourDist: number[],
  stdDev: number,
  avgInterval: number
): number {
  const maxCount = Math.max(...hourDist);
  const variance = hourDist.reduce(
    (sum, count) => sum + Math.pow(count - maxCount / 24, 2),
    0
  );
  const evenness = 1 - Math.sqrt(variance) / (maxCount || 1);

  const intervalRegularity =
    avgInterval > 0 ? 1 - Math.min(stdDev / avgInterval, 1) : 0;

  return evenness * 0.4 + intervalRegularity * 0.6;
}

/** 内容机械性评分（0-1，越高越机械） */
export function calculateContentMechanical(
  similarity: number,
  avgLength: number
): number {
  const similarityScore = similarity;
  const lengthVariance = avgLength < 50 || avgLength > 200 ? 0.3 : 0;

  return Math.min(similarityScore + lengthVariance, 1);
}

/** 时间行为分析：发帖时间分布、间隔规律性、活跃时段 */
export function analyzeTimeBehavior(posts: UserPost[]): {
  hourDistribution: number[];
  mostActiveHours: number[];
  avgPostInterval: number;
  intervalStdDev: number;
  regularityScore: number;
} {
  const postTimes = posts.map((p) => new Date(p.created_at));
  const hourDistribution = new Array(24).fill(0);
  const intervals: number[] = [];

  postTimes.forEach((time) => {
    hourDistribution[time.getHours()]++;
  });

  for (let i = 1; i < postTimes.length; i++) {
    const interval =
      (postTimes[i - 1]!.getTime() - postTimes[i]!.getTime()) / 1000 / 60;
    intervals.push(interval);
  }

  const avgInterval =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;
  const intervalStdDev = calculateStdDev(intervals);

  const regularityScore = calculateTimeRegularity(
    hourDistribution,
    intervalStdDev,
    avgInterval
  );

  return {
    hourDistribution,
    mostActiveHours: hourDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => h.hour),
    avgPostInterval: Math.round(avgInterval),
    intervalStdDev: Math.round(intervalStdDev),
    regularityScore,
  };
}

/** 内容特征分析：平均文本长度、相似度、机械性 */
export function analyzeContentFeatures(posts: UserPost[]): {
  avgTextLength: number;
  textSimilarity: number;
  mechanicalScore: number;
} {
  const texts = posts.map((p) => p.text);
  const avgTextLength =
    texts.reduce((sum, t) => sum + t.length, 0) / texts.length;

  const textSimilarity = calculateTextSimilarity(texts);
  const mechanicalScore = calculateContentMechanical(
    textSimilarity,
    avgTextLength
  );

  return {
    avgTextLength: Math.round(avgTextLength),
    textSimilarity,
    mechanicalScore,
  };
}

/** 互动特征分析：平均转评赞数据 */
export function analyzeInteractionFeatures(posts: UserPost[]): {
  avgReposts: number;
  avgComments: number;
  avgLikes: number;
  totalInteractions: number;
} {
  const totalReposts = posts.reduce((sum, p) => sum + p.reposts_count, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0);
  const totalLikes = posts.reduce((sum, p) => sum + p.attitudes_count, 0);

  return {
    avgReposts: Math.round(totalReposts / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    avgLikes: Math.round(totalLikes / posts.length),
    totalInteractions: totalReposts + totalComments + totalLikes,
  };
}

/** 设备来源分析：发帖设备分布（Top5） */
export function analyzeDeviceSources(posts: UserPost[]): Array<{
  source: string;
  count: number;
  percentage: string;
}> {
  const sourceCounts = new Map<string, number>();
  posts.forEach((p) => {
    const source = extractSource(p.source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  return Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({
      source,
      count,
      percentage: ((count / posts.length) * 100).toFixed(1),
    }));
}

