import { Inject, Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import {
  EventCategoryEntity,
  useEntityManager,
} from '@sker/entities';
import { NLPAnalyzer } from '@sker/nlp';
import type { PostContext } from '@sker/nlp';

@Injectable()
export class PostNLPAnalyzerVisitor {

  constructor(@Inject(NLPAnalyzer) private analyzer: NLPAnalyzer) { }

  @Handler(PostNLPAnalyzerAst)
  async visit(ast: PostNLPAnalyzerAst, _ctx: any) {
    ast.state = 'running';

    try {
      const { availableCategories, availableTags, recentEvents } = await useEntityManager(async (m) => {
        const categories = await m.find(EventCategoryEntity, {
          where: { status: 'active' },
          order: { sort: 'ASC' },
        });

        const tags = await m.query(`
          SELECT name FROM event_tags
          WHERE deleted_at IS NULL
          ORDER BY usage_count DESC
          LIMIT 200
        `);

        // 查询最近30天内的活跃事件，按热度和时间排序
        const events = await m.query(`
          SELECT
            e.title,
            e.description,
            e.hotness,
            e.occurred_at
          FROM events e
          WHERE e.status = 'active'
            AND e.occurred_at >= NOW() - INTERVAL '30 days'
          ORDER BY e.hotness DESC, e.occurred_at DESC
          LIMIT 100
        `);

        return {
          availableCategories: categories.map((c) => c.name),
          availableTags: tags.map((t: any) => t.name),
          recentEvents: events.map((e: any) => ({
            title: e.title,
            description: e.description,
          })),
        };
      });

      const subComments = ast.comments
        .flatMap((c) => c.comments || [])
        .map((sc: any) => sc.text_raw || sc.text)
        .filter(Boolean);

      const context: PostContext = {
        postId: ast.post.id,
        content: ast.post.text_raw,
        comments: ast.comments.map((c) => c.text_raw),
        subComments,
        reposts: ast.reposts.map((r) => r.text),
      };

      console.log(`[PostNLPAnalyzer] postId=${ast.post.id}, 内容统计:`, {
        postLength: context.content?.length || 0,
        commentsCount: context.comments.length,
        commentsChars: context.comments.join('').length,
        subCommentsCount: context.subComments.length,
        subCommentsChars: context.subComments.join('').length,
        repostsCount: context.reposts.length,
        repostsChars: context.reposts.join('').length,
      });

      ast.nlpResult = await this.analyzer.analyze(
        context,
        availableCategories,
        availableTags,
        recentEvents
      );
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.error = error as Error;
      console.error(`[PostNLPAnalyzerVisitor] postId: ${ast.post.id}`, error);
    }

    return ast;
  }
}
