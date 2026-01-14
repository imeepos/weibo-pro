export const toInt = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const toFloat = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
};
