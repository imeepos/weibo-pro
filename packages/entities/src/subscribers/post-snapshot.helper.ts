import { EntityManager } from 'typeorm';
import { WeiboPostEntity } from '../weibo-post.entity';
import { WeiboPostSnapshotEntity } from '../weibo-post-snapshot.entity';

/**
 * 帖子快照帮助函数
 * 用于在帖子插入或更新时创建快照
 */
export class PostSnapshotHelper {
  /**
   * 创建帖子快照
   * @param manager EntityManager
   * @param post 帖子实体
   */
  static async createSnapshot(
    manager: EntityManager,
    post: WeiboPostEntity
  ): Promise<void> {
    if (!post || !post.id) return;

    const now = new Date();

    // 检查是否已存在相同时间戳的快照（避免重复）
    const existingSnapshot = await manager.findOne(WeiboPostSnapshotEntity, {
      where: {
        post_id: post.id,
        snapshot_at: now
      },
    });

    if (existingSnapshot) {
      return;
    }

    // 创建新快照
    const snapshot = manager.create(WeiboPostSnapshotEntity, {
      post_id: post.id,
      comments_count: post.comments_count,
      reposts_count: post.reposts_count,
      attitudes_count: post.attitudes_count,
      snapshot_at: now,
    });

    await manager.save(WeiboPostSnapshotEntity, snapshot);
  }

  /**
   * 批量创建帖子快照
   * @param manager EntityManager
   * @param posts 帖子实体数组
   */
  static async createSnapshots(
    manager: EntityManager,
    posts: WeiboPostEntity[]
  ): Promise<void> {
    if (!posts || posts.length === 0) return;

    for (const post of posts) {
      await PostSnapshotHelper.createSnapshot(manager, post);
    }
  }
}
