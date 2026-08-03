import { KeywordData } from "@/types";

// 模拟数据生成器
export const generateComponentData = (timeRange?: string) => {
  // 根据时间范围生成不同的统计数据
  const baseStats = {
    today: { events: 1234, posts: 15680, users: 8945, interactions: 45230 },
    yesterday: { events: 1156, posts: 14520, users: 8654, interactions: 42150 },
    thisWeek: { events: 8642, posts: 109760, users: 62615, interactions: 317610 },
    lastWeek: { events: 7980, posts: 101440, users: 57765, interactions: 293025 },
    thisMonth: { events: 36540, posts: 463680, users: 264465, interactions: 1342230 },
    lastMonth: { events: 33210, posts: 421680, users: 240435, interactions: 1220415 },
    thisQuarter: { events: 125430, posts: 1592640, users: 908115, interactions: 4609845 },
    thisYear: { events: 456780, posts: 5801280, users: 3307965, interactions: 16784310 },
    all: { events: 823406, posts: 10460876, users: 5966646, interactions: 30271758 },
  };

  const data = baseStats[timeRange as keyof typeof baseStats] || baseStats.today;

  // 统计数据
  const statsData = {
    events: { value: data.events, change: (Math.random() - 0.5) * 40 },
    posts: { value: data.posts, change: (Math.random() - 0.5) * 30 },
    users: { value: data.users, change: (Math.random() - 0.5) * 20 },
    interactions: { value: data.interactions, change: (Math.random() - 0.5) * 50 },
  };

  // 生成时间相关的词云数据倍数
  const multipliers = {
    today: 1,
    yesterday: 0.95,
    thisWeek: 7.2,
    lastWeek: 6.8,
    thisMonth: 31,
    lastMonth: 29,
    thisQuarter: 92,
    lastQuarter: 87,
    halfYear: 183,
    lastHalfYear: 178,
    thisYear: 370,
    lastYear: 355,
    all: 730,
  };

  const multiplier = multipliers[timeRange as keyof typeof multipliers] || 1;

  // 词云数据
  const baseWords: KeywordData[] = [
    { name: "新能源", value: 856, sentiment: "positive" },
    { name: "科技创新", value: 734, sentiment: "positive" },
    { name: "环保政策", value: 678, sentiment: "neutral" },
    { name: "经济发展", value: 623, sentiment: "positive" },
    { name: "教育改革", value: 567, sentiment: "neutral" },
    { name: "医疗保障", value: 534, sentiment: "positive" },
    { name: "就业机会", value: 498, sentiment: "positive" },
    { name: "房价上涨", value: 465, sentiment: "negative" },
    { name: "交通拥堵", value: 432, sentiment: "negative" },
    { name: "食品安全", value: 398, sentiment: "neutral" },
    { name: "网络安全", value: 365, sentiment: "neutral" },
    { name: "数字化转型", value: 334, sentiment: "positive" },
    { name: "绿色出行", value: 298, sentiment: "positive" },
    { name: "智能制造", value: 276, sentiment: "positive" },
    { name: "乡村振兴", value: 245, sentiment: "positive" },
  ];

  const wordCloudData: KeywordData[] = baseWords.map(word => ({
    ...word,
    value: Math.floor(word.value * multiplier * (0.85 + Math.random() * 0.3))
  }));

  // 地理位置数据
  const baseLocations = [
    {
      name: "北京",
      coordinates: [116.4074, 39.9042] as [number, number],
      value: 1234,
      sentiment: "positive" as const,
    },
    {
      name: "上海",
      coordinates: [121.4737, 31.2304] as [number, number],
      value: 987,
      sentiment: "positive" as const,
    },
    {
      name: "广州",
      coordinates: [113.2644, 23.1291] as [number, number],
      value: 856,
      sentiment: "neutral" as const,
    },
    {
      name: "深圳",
      coordinates: [114.0579, 22.5431] as [number, number],
      value: 743,
      sentiment: "positive" as const,
    },
  ];

  const locationData = baseLocations.map(location => ({
    ...location,
    value: Math.floor(location.value * multiplier * (0.85 + Math.random() * 0.3))
  }));

  return {
    statsData,
    wordCloudData,
    locationData,
  };
};
