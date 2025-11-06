import { EntityManager } from 'typeorm';
import { WeiboPostEntity } from '@sker/entities';
import { BaseRepository } from './base.repository';
import { TimeRange } from '../types';

export class WeiboPostRepository extends BaseRepository<WeiboPostEntity> {
    constructor(entityManager: EntityManager) {
        super(entityManager, WeiboPostEntity);
    }

    /**
     * 获取热门微博
     */
    async findHotPosts(timeRange: TimeRange, limit: number = 50): Promise<WeiboPostEntity[]> {
        const dateRange = this.getDateRangeByTimeRange(timeRange);

        return await this.createQueryBuilder('post')
            .where('post.created_at >= :startDate', { startDate: dateRange.start })
            .andWhere('post.created_at <= :endDate', { endDate: dateRange.end })
            .orderBy('post.attitudes_count', 'DESC')
            .addOrderBy('post.comments_count', 'DESC')
            .addOrderBy('post.reposts_count', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * 统计时间范围内的微博数量
     */
    async countByTimeRange(timeRange: TimeRange): Promise<number> {
        const dateRange = this.getDateRangeByTimeRange(timeRange);

        return await this.createQueryBuilder('post')
            .where('post.created_at >= :startDate', { startDate: dateRange.start })
            .andWhere('post.created_at <= :endDate', { endDate: dateRange.end })
            .getCount();
    }

    /**
     * 获取时间序列数据
     */
    async getTimeSeriesData(
        timeRange: TimeRange,
        interval: 'hour' | 'day' | 'week' | 'month' = 'day'
    ): Promise<Array<{ date: string; count: number }>> {
        const dateRange = this.getDateRangeByTimeRange(timeRange);

        const result = await this.createQueryBuilder('post')
            .select(`DATE_TRUNC('${interval}', post.created_at)`, 'date')
            .addSelect('COUNT(*)', 'count')
            .where('post.created_at >= :startDate', { startDate: dateRange.start })
            .andWhere('post.created_at <= :endDate', { endDate: dateRange.end })
            .groupBy(`DATE_TRUNC('${interval}', post.created_at)`)
            .orderBy(`DATE_TRUNC('${interval}', post.created_at)`, 'ASC')
            .getRawMany();

        return result.map(item => ({
            date: item.date,
            count: parseInt(item.count, 10)
        }));
    }

    /**
     * 根据关键词搜索微博
     */
    async searchByKeyword(keyword: string, limit: number = 100): Promise<WeiboPostEntity[]> {
        return await this.createQueryBuilder('post')
            .where('post.text_raw ILIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('post.text ILIKE :keyword', { keyword: `%${keyword}%` })
            .orderBy('post.created_at', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * 根据时间范围计算日期范围
     */
    private getDateRangeByTimeRange(timeRange: TimeRange): { start: Date; end: Date } {
        const now = new Date();
        const end = new Date(now);
        let start = new Date(now);

        switch (timeRange) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisWeek':
                start.setDate(start.getDate() - start.getDay());
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastWeek':
                start.setDate(start.getDate() - start.getDay() - 7);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - end.getDay() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastMonth':
                start.setMonth(start.getMonth() - 1, 1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(end.getMonth(), 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'halfYear':
                start.setMonth(start.getMonth() - 6);
                break;
            case 'thisYear':
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'all':
            default:
                start = new Date(0);
                break;
        }

        return { start, end };
    }
}
