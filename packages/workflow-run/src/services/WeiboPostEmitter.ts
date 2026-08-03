/**
 * 微博搜索帖子发射器
 *
 * 从 WeiboKeywordSearchAstVisitor.ts 抽取的帖子处理逻辑：
 * - 遍历帖子列表，处理中止信号
 * - 通过 12 小时快照检查去重（帖子已存在则跳过）
 * - 发射 node_emit 帖子数据并控制发射间隔
 */
import { createLogger } from "@sker/core";
import { NodeEvent } from "@sker/workflow";
import { useEntityManager, WeiboPostEntity, EntityManager } from "@sker/entities";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { Subscriber } from "rxjs";
import { DelayService } from "./delay.service";

const logger = createLogger('WeiboKeywordSearchAstVisitor');

/** 帖子载荷：与 WeiboHtmlParser.ParsedSearchResult.posts 保持一致 */
export interface WeiboSearchPost {
  mid: string;
  uid: string;
  postAt: Date | null;
}

export class WeiboPostEmitter {
    constructor(
        private delayService: DelayService
    ) { }

    /**
     * 发射帖子列表（含去重与间隔控制）
     */
    async emitPosts(
        ast: WeiboKeywordSearchAst,
        ctx: { abortSignal?: AbortSignal },
        obs: Subscriber<NodeEvent>,
        posts: WeiboSearchPost[]
    ): Promise<void> {
        for (const post of posts) {
            if (ctx.abortSignal?.aborted) {
                throw new Error('工作流已取消');
            }

            logger.debug('[WeiboKeywordSearch] 检查帖子:', { mid: post.mid, uid: post.uid });

            // 检查帖子是否在12小时内已有快照
            const shouldSkip = await this.shouldSkipPost(post.mid);

            // 如果需要跳过，则跳过
            if (shouldSkip) {
                logger.info('[WeiboKeywordSearch] 跳过帖子（已存在），不发射数据:', post.mid);
                await this.delayService.randomDelay(ast.pageDelayMin || 3, ast.pageDelayMax || 5);
                continue;
            }

            // 正常发射帖子事件
            logger.debug('[WeiboKeywordSearch] 发射帖子数据:', { mblogid: post.mid, uid: post.uid });
            ast.mblogid = post.mid;
            ast.uid = post.uid;
            obs.next({
                type: 'node_emit',
                id: ast.id,
                data: { mblogid: ast.mblogid, uid: ast.uid }
            });
            await this.delayService.randomDelay(ast.emitDelayMin || 1, ast.emitDelayMax || 3);
        }
    }

    /**
     * 检查帖子是否已存在（12 小时内已有快照）
     */
    private async shouldSkipPost(mid: string): Promise<boolean> {
        return useEntityManager(async (m: EntityManager) => {
            // 根据帖子ID查找帖子记录
            const isLongId = /^\d{16,}$/.test(mid);
            logger.debug('[WeiboKeywordSearch] 12小时快照检查:', {
                mid,
                isLongId,
                queryField: isLongId ? 'id' : 'mblogid'
            });

            const postEntity = await m.findOne(WeiboPostEntity, {
                where: isLongId ? { id: mid } : { mblogid: mid }
            });

            if (!postEntity) {
                logger.debug('[WeiboKeywordSearch] 帖子不存在，正常发射');
                return false;
            }
            return true;
        });
    }
}
