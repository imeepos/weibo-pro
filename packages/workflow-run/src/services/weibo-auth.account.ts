import { Cookie } from "playwright";
import { RedisClient } from "@sker/redis";
import { WeiboAccountEntity, WeiboAccountStatus, useEntityManager } from "@sker/entities";
import { WeiboUserInfo } from "./weibo-login.types";

/**
 * 保存微博账号到数据库，并记录账号健康度
 * @param redis Redis 客户端（用于更新健康度排行）
 * @param userId 用户 ID
 * @param cookies 登录后的 Cookie 列表
 * @param userInfo 提取到的微博用户信息
 */
export async function saveAccount(
  redis: RedisClient,
  userId: string,
  cookies: Cookie[],
  userInfo: WeiboUserInfo,
): Promise<WeiboAccountEntity> {
  const savedAccount = await useEntityManager(async (m) => {
    const repo = m.getRepository(WeiboAccountEntity);

    // 检查是否已存在
    const existing = await repo.findOne({
      where: { weiboUid: userInfo.uid },
    });

    let savedAccount: WeiboAccountEntity;

    if (existing) {
      // 更新现有账号
      existing.weiboNickname = userInfo.nickname;
      existing.weiboAvatar = userInfo.avatar;
      existing.cookies = JSON.stringify(cookies);
      existing.status = WeiboAccountStatus.ACTIVE;
      existing.lastCheckAt = new Date();

      savedAccount = await repo.save(existing);
    } else {
      // 创建新账号
      const account = repo.create({
        weiboUid: userInfo.uid,
        weiboNickname: userInfo.nickname,
        weiboAvatar: userInfo.avatar,
        cookies: JSON.stringify(cookies),
        status: WeiboAccountStatus.ACTIVE,
        lastCheckAt: new Date(),
      });

      savedAccount = await repo.save(account);
    }

    return savedAccount;
  });

  await redis.zadd('weibo:account:health', 10000, savedAccount.id.toString());

  return savedAccount;
}
