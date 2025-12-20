import { TOKEN_MILLION, TOKEN_THOUSAND } from './constants';

export const formatTokens = (tokens: number): string => {
  if (tokens >= TOKEN_MILLION) {
    return `${(tokens / TOKEN_MILLION).toFixed(2)}M`;
  }
  if (tokens >= TOKEN_THOUSAND) {
    return `${(tokens / TOKEN_THOUSAND).toFixed(2)}K`;
  }
  return tokens.toString();
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const calculateSuccessRate = (successCount: number, totalCount: number): number =>
  totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
