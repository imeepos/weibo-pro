import { EntityManager } from 'typeorm';
import { WeiboCommentEntity } from '@sker/entities';
import { BaseRepository } from './base.repository';
import { TimeRange } from '../types';

export class WeiboCommentRepository extends BaseRepository<WeiboCommentEntity> {
    constructor(entityManager: EntityManager) {
        super(entityManager, WeiboCommentEntity);
    }

    /**
     * 根据微博 ID 获取评论
     */
    async findByPostId(postId: string, limit: number = 100): Promise<WeiboCommentEntity[]> {
        return await this.createQueryBuilder('comment')
            .where('comment.mid = :postId', { postId })
            .orderBy('comment.like_counts', 'DESC')
            .addOrderBy('comment.created_at', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * 统计时间范围内的评论数量
     */
    async countByTimeRange(timeRange: TimeRange): Promise<number> {
        const dateRange = this.getDateRangeByTimeRange(timeRange);

        return await this.createQueryBuilder('comment')
            .where('comment.created_at >= :startDate', { startDate: dateRange.start })
            .andWhere('comment.created_at <= :endDate', { endDate: dateRange.end })
            .getCount();
    }

    /**
     * 获取热门评论
     */
    async findHotComments(limit: number = 50): Promise<WeiboCommentEntity[]> {
        return await this.createQueryBuilder('comment')
            .orderBy('comment.like_counts', 'DESC')
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
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
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
