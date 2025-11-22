import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { WeiboPostEntity } from './weibo-post.entity';
import { WeiboPostSnapshotEntity } from './weibo-post-snapshot.entity';

/**
 * 微博帖子订阅器
 *
 * 存在即合理：
 * - 自动在帖子插入/更新时创建快照
 * - 无需修改所有 Visitor 代码
 * - 确保每次抓取都有快照记录
 */
@EventSubscriber()
export class WeiboPostSubscriber implements EntitySubscriberInterface<WeiboPostEntity> {
  listenTo() {
    return WeiboPostEntity;
  }

  /**
   * 帖子插入后：创建初始快照
   */
  async afterInsert(event: InsertEvent<WeiboPostEntity>) {
    await this.createSnapshot(event.entity, event.manager);
  }

  /**
   * 帖子更新后：创建新快照
   */
  async afterUpdate(event: UpdateEvent<WeiboPostEntity>) {
    if (!event.entity) return;
    await this.createSnapshot(event.entity as WeiboPostEntity, event.manager);
  }

  /**
   * 创建快照
   */
  private async createSnapshot(post: WeiboPostEntity, manager: EntityManager) {
    if (!post) return;

    // 检查是否已存在相同时间戳的快照（避免重复）
    const now = new Date();
    const existingSnapshot = await manager.findOne(WeiboPostSnapshotEntity, {
      where: {
        post_id: post.id,
        snapshot_at: now
      },
    });

    // 如果已存在相同时间戳的快照，则跳过
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
}
