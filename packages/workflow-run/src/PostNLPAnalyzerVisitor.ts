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
      const { availableCategories, availableTags } = await useEntityManager(async (m) => {
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

        return {
          availableCategories: categories.map((c) => c.name),
          availableTags: tags.map((t: any) => t.name),
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

      ast.nlpResult = await this.analyzer.analyze(
        context,
        availableCategories,
        availableTags
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
