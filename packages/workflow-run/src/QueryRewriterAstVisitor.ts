import { Injectable } from '@sker/core';
import { Handler, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { QueryRewriterAst, type RewrittenQuery, type CognitivePersona, type IntentLayer } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { useLlmModel } from './llm-client';

const IntentAnalysisSchema = z.object({
  surface_intent: z.string().describe('表面意图：字面解释'),
  practical_intent: z.string().describe('实际意图：用户真正想要达成的目标'),
  emotional_intent: z.string().optional().describe('情感意图：情感驱动因素'),
  intent_layer: z.enum(['surface', 'practical', 'emotional', 'social', 'identity', 'taboo', 'shadow']).describe('意图层次'),
  reasoning: z.string().describe('意图分析推理过程')
});

const QueryRewriteSchema = z.object({
  queries: z.array(z.object({
    query: z.string().describe('重写后的查询'),
    persona: z.enum([
      'expert-skeptic',
      'detail-analyst',
      'historical',
      'comparative',
      'temporal',
      'globalizer',
      'reality-hater'
    ]).describe('认知角色'),
    reasoning: z.string().describe('为什么从这个角色重写')
  })).describe('重写后的查询列表')
});

@Injectable()
export class QueryRewriterAstVisitor {

  @Handler(QueryRewriterAst)
  handler(ast: QueryRewriterAst, ctx: WorkflowGraphAst) {
    return new Observable((obs) => {
      const abortController = new AbortController();

      const run = async () => {
        if (abortController.signal.aborted) {
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          return;
        }

        if (!ast.query || ast.query.length === 0) {
          ast.state = 'fail';
          setAstError(ast, new Error('请提供原始查询'));
          obs.next({ ...ast });
          obs.complete();
          return;
        }

        ast.state = 'running';
        ast.count += 1;
        obs.next({ ...ast });

        const model = useLlmModel({
          model: ast.model,
          temperature: ast.temperature
        });

        const originalQuery = Array.isArray(ast.query)
          ? ast.query.filter(Boolean).join('\n')
          : ast.query;

        const motivationText = Array.isArray(ast.motivation) && ast.motivation.length > 0
          ? `\n\n用户动机：\n${ast.motivation.filter(Boolean).join('\n')}`
          : '';

        const contextText = Array.isArray(ast.context) && ast.context.length > 0
          ? `\n\n上下文线索：\n${ast.context.filter(Boolean).join('\n')}`
          : '';

        // 第一步：意图分析
        const intentSystemPrompt = `你是一个意图分析专家，擅长识别用户查询背后的真实意图。

意图层次理论：
1. surface（表面意图）：字面解释
2. practical（实际意图）：实际目标
3. emotional（情感意图）：情感驱动
4. social（社交意图）：社交关系
5. identity（身份意图）：身份认同
6. taboo（禁忌意图）：社会禁忌
7. shadow（阴影意图）：无意识动机

分析用户查询，识别其真实意图层次。`;

        const intentUserPrompt = `原始查询：${originalQuery}${motivationText}${contextText}`;

        try {
          const intentModel = model.withStructuredOutput(IntentAnalysisSchema);
          const intentResult = await intentModel.invoke([
            { role: 'system', content: intentSystemPrompt },
            { role: 'human', content: intentUserPrompt }
          ]);

          if (abortController.signal.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            return;
          }

          const intentAnalysis = `【意图层次】${intentResult.intent_layer}

【表面意图】${intentResult.surface_intent}

【实际意图】${intentResult.practical_intent}

${intentResult.emotional_intent ? `【情感意图】${intentResult.emotional_intent}\n\n` : ''}【推理过程】${intentResult.reasoning}`;

          ast.intentAnalysis.next(intentAnalysis);
          obs.next({ ...ast });

          // 第二步：多角色查询重写
          const rewriteSystemPrompt = `你是一个查询重写专家，参考 node-DeepResearch 的评估器设计理念。

认知角色定义：
1. expert-skeptic（专家怀疑者）：关注边缘案例、反例、例外情况
2. detail-analyst（细节分析师）：深入技术细节、实现机制
3. historical（历史研究者）：追溯演变历史、发展脉络
4. comparative（对比思考者）：对比替代方案、竞品分析
5. temporal（时效性关注者）：关注最新信息、时间敏感性
6. globalizer（全球化视角）：识别权威语言/地区、跨文化视角
7. reality-hater（现实怀疑者）：寻找反驳证据、质疑常识

基于意图分析，从不同认知角色重写查询，确保：
- 每个重写查询都有明确的评估维度（definitive/freshness/plurality/completeness）
- 查询应该能够获得高质量、可验证的答案
- 避免模糊、不确定的表述`;

          const rewriteUserPrompt = `【原始查询】
${originalQuery}

【意图分析】
${intentAnalysis}

请从至少 3 个不同认知角色重写查询，每个查询应该：
1. 针对特定评估维度（definitive/freshness/plurality/completeness）
2. 明确、具体、可验证
3. 避免"可能"、"也许"等不确定表述`;

          const rewriteModel = model.withStructuredOutput(QueryRewriteSchema);
          const rewriteResult = await rewriteModel.invoke([
            { role: 'system', content: rewriteSystemPrompt },
            { role: 'human', content: rewriteUserPrompt }
          ]);

          if (abortController.signal.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            return;
          }

          const rewrittenQueries: RewrittenQuery[] = rewriteResult.queries.map(q => ({
            query: q.query,
            persona: q.persona as CognitivePersona,
            reasoning: q.reasoning
          }));

          ast.rewrittenQueries.next(rewrittenQueries);
          obs.next({ ...ast });

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete();

        } catch (error) {
          throw new Error(`查询重写失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      };

      run().catch(e => {
        ast.state = 'fail';
        setAstError(ast, e);
        obs.next({ ...ast });
        obs.complete();
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }
}
