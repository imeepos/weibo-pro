import { useEntityManager } from '../utils';
import { WeiboUserEntity } from '../weibo-user.entity';

/** 获取影响力最大的用户 */
export const findTopInfluencers = (limit: number = 10) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboUserEntity, 'user')
      .orderBy('user.followers_count', 'DESC')
      .addOrderBy('user.statuses_count', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 根据 UID 查找用户 */
export const findUserByUid = (uid: string | number) =>
  useEntityManager(async m => {
    return await m.findOne(WeiboUserEntity, {
      where: { id: typeof uid === 'string' ? parseInt(uid) : uid }
    });
  });

/** 批量查找用户 */
export const findUsersByUids = (uids: string[]) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboUserEntity, 'user')
      .where('user.id IN (:...uids)', { uids })
      .getMany();
  });

/** 统计用户总数 */
export const countTotalUsers = () =>
  useEntityManager(async m => {
    return await m.count(WeiboUserEntity);
  });

/** 搜索用户 */
export const searchUsersByNickname = (nickname: string, limit: number = 20) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboUserEntity, 'user')
      .where('user.screen_name ILIKE :nickname', { nickname: `%${nickname}%` })
      .limit(limit)
      .getMany();
  });

/** 批量插入或更新用户 */
export const upsertUsers = (users: Partial<WeiboUserEntity>[]) =>
  useEntityManager(async m => {
    const entities = users.map(user => m.create(WeiboUserEntity, user as any));
    if (entities.length > 0) {
      await m.upsert(WeiboUserEntity, entities as any[], ['id']);
    }
    return entities.length;
  });
