import { EntityManager } from 'typeorm';
import { WeiboUserEntity } from '@sker/entities';
import { BaseRepository } from './base.repository';

export class WeiboUserRepository extends BaseRepository<WeiboUserEntity> {
    constructor(entityManager: EntityManager) {
        super(entityManager, WeiboUserEntity);
    }

    /**
     * 获取影响力最大的用户
     */
    async findTopInfluencers(limit: number = 10): Promise<WeiboUserEntity[]> {
        return await this.createQueryBuilder('user')
            .orderBy('user.followers_count', 'DESC')
            .addOrderBy('user.statuses_count', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * 根据 UID 查找用户
     */
    async findByUid(uid: string): Promise<WeiboUserEntity | null> {
        return await this.findOne({
            where: { id: uid }
        });
    }

    /**
     * 批量查找用户
     */
    async findByUids(uids: string[]): Promise<WeiboUserEntity[]> {
        return await this.createQueryBuilder('user')
            .where('user.id IN (:...uids)', { uids })
            .getMany();
    }

    /**
     * 统计用户总数
     */
    async countTotalUsers(): Promise<number> {
        return await this.count();
    }

    /**
     * 搜索用户
     */
    async searchByNickname(nickname: string, limit: number = 20): Promise<WeiboUserEntity[]> {
        return await this.createQueryBuilder('user')
            .where('user.screen_name ILIKE :nickname', { nickname: `%${nickname}%` })
            .limit(limit)
            .getMany();
    }
}
