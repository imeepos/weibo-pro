import * as cheerio from 'cheerio';
import { Injectable } from '@sker/core';
import { parseTimeText } from './weibo-html-time.util';
import { extractNextPageLink, extractCurrentPage, extractTotalPage } from './weibo-html-pagination.util';

export interface ParsedSearchResult {
  posts: { mid: string, uid: string, postAt: Date | null }[];
  hasNextPage: boolean;
  lastPostTime: Date | null;
  totalCount: number;
  nextPageLink: string | undefined;
  currentPage: number;
  totalPage: number;
  /** 标识搜索结果为空（"抱歉，未找到相关结果"） */
  isEmptyResult: boolean;
}

@Injectable()
export class WeiboHtmlParser {
  constructor() { }

  parseSearchResultHtml(html: string): ParsedSearchResult {
    try {
      console.log('[WeiboHtmlParser] 开始解析搜索结果 HTML，HTML 长度:', html.length);

      // 检测登录失效：多特征检测（兼容新旧版本登录页面）
      const isLoginPage =
        html.includes(`Sina Visitor System`) ||
        html.includes('passport.weibo.com/sso/signin') ||  // 旧版登录页
        html.includes('h5.sinaimg.cn/m/login/') ||          // 新版登录页资源
        html.includes('<title>登录 - 微博</title>') ||      // 登录页标题
        html.includes('扫描二维码登录');                      // 登录页面文本

      if (isLoginPage) {
        console.error('[WeiboHtmlParser] 检测到登录失效页面');
        throw new Error('LOGIN_EXPIRED');
      }

      const $ = cheerio.load(html);

      // 检测"未找到相关结果"（无结果页面）
      // 注意：需要检查是否有 card-no-result 且没有实际搜索结果的卡片
      // 微博会在空结果页面显示"以下是您可能感兴趣的微博"，但这些不是搜索结果
      const hasNoResultCard = $('.card-no-result').length > 0 ||
                             html.includes('未找到相关结果');

      // 检查是否存在搜索时间范围提示（有时空的搜索结果会显示时间范围）
      const hasTimeRangeTip = $('.m-filtertab .ctips').length > 0;

      // 当有空结果卡片且有时间范围提示时，说明是真的没有搜索结果
      // 否则可能只是推荐内容
      const isEmptyResult = hasNoResultCard && hasTimeRangeTip;

      if (isEmptyResult) {
        console.log('[WeiboHtmlParser] 检测到空结果页面（无搜索结果）');
      }

      // 当检测到空结果时，直接返回清空的数据
      if (isEmptyResult) {
        console.log('[WeiboHtmlParser] 空结果页面，返回清空数据');
        return {
          posts: [],
          hasNextPage: false,
          lastPostTime: null,
          totalCount: 0,
          nextPageLink: undefined,
          currentPage: 1,
          totalPage: 0,
          isEmptyResult: true,
        };
      }

      const posts = this.extractPostsInfo($);
      const postIds = posts.map((p) => p.mid);

      // 从 posts 数组中找出最早的时间（即最后一条微博的时间）
      const lastPostTime = posts.reduce<Date | null>((earliest, post) => {
        if (!post.postAt) return earliest;
        if (!earliest) return post.postAt;
        return post.postAt < earliest ? post.postAt : earliest;
      }, null);

      const totalCount = postIds.length;
      const nextPageLink = extractNextPageLink($);
      const currentPage = extractCurrentPage($);
      const totalPage = extractTotalPage($);

      // 修复逻辑：只有在有 posts 且有 nextPageLink 时才认为有下一页
      const hasNextPage = posts.length > 0 && !!nextPageLink && currentPage < totalPage;

      const result = {
        posts,
        hasNextPage,
        lastPostTime,
        totalCount,
        nextPageLink,
        currentPage,
        totalPage,
        isEmptyResult,
      };

      console.log('[WeiboHtmlParser] 解析完成:', {
        postsCount: posts.length,
        hasNextPage,
        currentPage,
        totalPage,
        nextPageLink: nextPageLink ? '存在' : '不存在',
        isEmptyResult,
        samplePosts: posts.slice(0, 3).map(p => ({ mid: p.mid, uid: p.uid }))
      });

      return result;
    } catch (error) {
      // 如果是登录失效错误，向上抛出
      if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
        throw error;
      }

      console.error('[WeiboHtmlParser] 解析失败:', error);

      // 其他解析错误返回空结果
      return {
        posts: [],
        hasNextPage: false,
        lastPostTime: null,
        totalCount: 0,
        nextPageLink: undefined,
        currentPage: 1,
        totalPage: 0,
        isEmptyResult: true,
      };
    }
  }

  private extractPostsInfo($: cheerio.CheerioAPI): Array<{ uid: string; mid: string; postAt: Date | null }> {
    const posts: Array<{ uid: string; mid: string; postAt: Date | null }> = [];
    const seenMids = new Set<string>();

    console.log('[WeiboHtmlParser.extractPostsInfo] 开始提取帖子信息');

    // 策略1（主）：从详情链接提取 mid、uid 和 postAt
    // 格式：//weibo.com/:uid/:mid
    const $cards = $('div.card');
    console.log('[WeiboHtmlParser.extractPostsInfo] 找到 div.card 元素数量:', $cards.length);

    $('div.card').each((_index: number, element: any) => {
      const $card = $(element);

      // 正确的选择器：div.from > a（不是 p.from a）
      const detailLink = $card.find('div.from > a[href]').first();
      const href = detailLink.attr('href');

      if (_index === 0) {
        console.log('[WeiboHtmlParser.extractPostsInfo] 第一个卡片详情链接:', href);
      }

      if (href) {
        // 匹配格式：//weibo.com/:uid/:mid
        // 示例：//weibo.com/7838912856/Qb83goWjj?refer_flag=1001030103_
        const match = href.match(/(?:\/\/weibo\.com)?\/(\d+)\/([A-Za-z0-9]+)/);

        if (match && match[1] && match[2]) {
          const uid = match[1];
          const mid = match[2];

          // 去重检查
          if (!seenMids.has(mid)) {
            seenMids.add(mid);

            // 提取时间信息（从同一个 a 标签的文本）
            const timeText = detailLink.text().trim();
            const postAt = parseTimeText(timeText);

            posts.push({ uid, mid, postAt });
          }
        }
      }
    });

    // 策略2（备用）：从 div[mid] 属性提取（数字型ID）
    if (posts.length === 0) {
      console.log('[WeiboHtmlParser.extractPostsInfo] 策略1未找到帖子，尝试策略2（从 div[mid] 属性提取）');
      $('div[action-type="feed_list_item"]').each((_index: number, element: any) => {
        const $item = $(element);
        const mid = $item.attr('mid');

        if (mid && !seenMids.has(mid)) {
          seenMids.add(mid);

          // 尝试从用户链接提取 uid
          const userLink = $item.find('div.avator a, a.name').first().attr('href');
          const uidMatch = userLink?.match(/\/\/weibo\.com\/(\d+)/);
          const uid = uidMatch?.[1] || '';

          // 提取时间
          const timeElement = $item.find('div.from > a').first();
          const timeText = timeElement.text().trim();
          const postAt = parseTimeText(timeText);

          posts.push({ uid, mid, postAt });
        }
      });
      console.log('[WeiboHtmlParser.extractPostsInfo] 策略2提取到帖子数量:', posts.length);
    }

    console.log('[WeiboHtmlParser.extractPostsInfo] 总共提取到帖子数量:', posts.length);
    return posts;
  }
}
