/**
 * 微博搜索 HTML 解析：分页信息提取工具。
 */
import * as cheerio from 'cheerio';

/** 从分页区提取下一页链接，相对路径补全为 https://s.weibo.com 前缀 */
export function extractNextPageLink($: cheerio.CheerioAPI): string | undefined {
  const nextLink = $('div.m-page a.next').attr('href');
  if (nextLink) {
    return nextLink.startsWith('http') ? nextLink : `https://s.weibo.com${nextLink}`;
  }
  return undefined;
}

/** 提取当前页码，默认第 1 页 */
export function extractCurrentPage($: cheerio.CheerioAPI): number {
  // 方法1：从 .pagenum 提取
  const pageText = $('div.m-page .pagenum').first().text();
  const match = pageText.match(/第(\d+)页/);
  if (match && match[1]) {
    return Number.parseInt(match[1], 10);
  }

  // 方法2：从 .s-scroll 中查找 .cur 类
  const curPageText = $('div.m-page .s-scroll li.cur a').text();
  const curMatch = curPageText.match(/第(\d+)页/);
  if (curMatch && curMatch[1]) {
    return Number.parseInt(curMatch[1], 10);
  }

  return 1;
}

/** 提取总页数（分页列表中最大的页码） */
export function extractTotalPage($: cheerio.CheerioAPI): number {
  let maxPage = 0;

  // 从分页列表中提取所有页码
  $('div.m-page .s-scroll li a').each((_i: number, link: any) => {
    const text = $(link).text().trim();
    const match = text.match(/第(\d+)页/);
    if (match && match[1]) {
      const page = Number.parseInt(match[1], 10);
      if (page > maxPage) {
        maxPage = page;
      }
    }
  });

  return maxPage;
}
