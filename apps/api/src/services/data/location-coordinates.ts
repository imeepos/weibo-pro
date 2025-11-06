/**
 * 中国省市坐标映射表
 * 坐标格式：[经度, 纬度]
 */

interface CityCoordinates {
  [key: string]: [number, number];
}

export const CITY_COORDINATES: CityCoordinates = {
  // 直辖市
  '北京': [116.4074, 39.9042],
  '上海': [121.4737, 31.2304],
  '天津': [117.2008, 39.0842],
  '重庆': [106.5516, 29.5630],

  // 省会城市
  '广州': [113.2644, 23.1291],
  '深圳': [114.0579, 22.5431],
  '杭州': [120.1551, 30.2741],
  '南京': [118.7969, 32.0603],
  '武汉': [114.3054, 30.5931],
  '成都': [104.0665, 30.5723],
  '西安': [108.9398, 34.3416],
  '郑州': [113.6254, 34.7466],
  '沈阳': [123.4328, 41.8045],
  '长沙': [112.9388, 28.2282],
  '济南': [117.1205, 36.6519],
  '哈尔滨': [126.5349, 45.8038],
  '昆明': [102.8329, 24.8801],
  '南昌': [115.8581, 28.6832],
  '福州': [119.2965, 26.0745],
  '太原': [112.5489, 37.8706],
  '石家庄': [114.5149, 38.0428],
  '合肥': [117.2272, 31.8206],
  '南宁': [108.3661, 22.8172],
  '贵阳': [106.7135, 26.5783],
  '兰州': [103.8343, 36.0611],
  '海口': [110.3312, 20.0311],
  '呼和浩特': [111.6708, 40.8183],
  '银川': [106.2586, 38.4680],
  '西宁': [101.7782, 36.6171],
  '乌鲁木齐': [87.6168, 43.8256],
  '拉萨': [91.1145, 29.6446],

  // 其他重要城市
  '苏州': [120.5954, 31.2989],
  '青岛': [120.3826, 36.0671],
  '厦门': [118.0894, 24.4798],
  '宁波': [121.5440, 29.8683],
  '无锡': [120.3019, 31.5747],
  '大连': [121.6147, 38.9140],
  '长春': [125.3235, 43.8171],
  '珠海': [113.5765, 22.2707],
  '佛山': [113.1220, 23.0288],
  '东莞': [113.7518, 23.0209],
  '中山': [113.3927, 22.5171],
};

/**
 * 从城市或省份名称获取坐标
 * @param location 地点名称（可能是城市或省份）
 * @returns 坐标 [经度, 纬度]，如果未找到则返回北京坐标作为默认值
 */
export function getCoordinates(location: string | null | undefined): [number, number] {
  if (!location) {
    return CITY_COORDINATES['北京']!;
  }

  // 直接匹配
  if (CITY_COORDINATES[location]) {
    return CITY_COORDINATES[location]!;
  }

  // 模糊匹配：尝试从字符串中提取城市名
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (location.includes(city)) {
      return coords;
    }
  }

  // 默认返回北京坐标
  return CITY_COORDINATES['北京']!;
}

/**
 * 从省份字段和城市字段获取坐标
 * @param province 省份
 * @param city 城市
 * @returns 坐标 [经度, 纬度]
 */
export function getCoordinatesFromProvinceCity(
  province: string | null | undefined,
  city: string | null | undefined
): [number, number] {
  // 优先使用城市信息
  if (city) {
    const coords = getCoordinates(city);
    if (coords !== CITY_COORDINATES['北京']! || city.includes('北京')) {
      return coords;
    }
  }

  // 其次使用省份信息
  if (province) {
    return getCoordinates(province);
  }

  // 默认返回北京坐标
  return CITY_COORDINATES['北京']!;
}
