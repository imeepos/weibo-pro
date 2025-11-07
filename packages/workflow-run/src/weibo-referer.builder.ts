/**
 * 微博 Referer 构造器
 *
 * 存在即合理：
 * - 统一生成各种场景下的 referer URL
 * - 修复硬编码 referer 的 bug
 * - 消除 7 处不同的 referer 生成逻辑
 *
 * 优雅即简约：
 * - 每个方法对应一个明确的业务场景
 * - 命名直观，见名知意
 * - 无状态，纯函数
 */

export class WeiboRefererBuilder {
    private static readonly BASE_URL = 'https://weibo.com';

    /**
     * 帖子详情页 - 用于评论、转发、点赞等操作
     *
     * @example
     * forPost('2744950651', '5227379397493201')
     * // => 'https://weibo.com/2744950651/5227379397493201'
     */
    static forPost(uid: string, mid: string): string {
        return `${this.BASE_URL}/${uid}/${mid}`;
    }

    /**
     * 帖子详情页（备选方案） - 当 uid 不可用时
     *
     * @example
     * forDetail('5227379397493201')
     * // => 'https://weibo.com/detail/5227379397493201'
     */
    static forDetail(mid: string): string {
        return `${this.BASE_URL}/detail/${mid}`;
    }

    /**
     * 用户主页 - 用于获取用户微博列表
     *
     * @example
     * forUser('2744950651')
     * // => 'https://weibo.com/u/2744950651'
     */
    static forUser(uid: string): string {
        return `${this.BASE_URL}/u/${uid}`;
    }

    /**
     * 首页时间线 - 用于热门微博流
     *
     * @example
     * forTimeline()
     * // => 'https://weibo.com'
     */
    static forTimeline(): string {
        return this.BASE_URL;
    }

    /**
     * 搜索结果页 - 用于关键词搜索
     *
     * @example
     * forSearch('AI')
     * // => 'https://weibo.com/search?q=AI'
     */
    static forSearch(keyword: string): string {
        const encoded = encodeURIComponent(keyword);
        return `${this.BASE_URL}/search?q=${encoded}`;
    }

    /**
     * 智能选择 referer - 根据可用参数自动选择最佳方案
     *
     * @param options uid 和 mid 的可选组合
     * @returns 最合适的 referer URL
     */
    static auto(options: { uid?: string; mid?: string }): string {
        const { uid, mid } = options;

        if (uid && mid) {
            return this.forPost(uid, mid);
        }

        if (mid) {
            return this.forDetail(mid);
        }

        if (uid) {
            return this.forUser(uid);
        }

        return this.forTimeline();
    }
}
