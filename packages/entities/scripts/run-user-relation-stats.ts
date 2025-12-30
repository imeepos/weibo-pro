#!/usr/bin/env tsx
/**
 * 手动执行用户关系增量统计
 * 用途: 在需要时手动触发统计，或用于调试
 * 使用: tsx scripts/run-user-relation-stats.ts [maxRecords]
 */

import 'dotenv/config';
import 'reflect-metadata';
import { useEntityManager, UserRelationStatisticsQueries } from '../src/index';

async function main() {
  const maxRecords = parseInt(process.argv[2] || '50000', 10);

  console.log('🔄 开始执行用户关系增量统计...');
  console.log(`   批次大小: ${maxRecords} 条`);
  console.log('');

  const startTime = Date.now();

  try {
    const result = await useEntityManager(manager =>
      UserRelationStatisticsQueries.runIncrementalStats(manager, {
        maxRecords
      })
    );

    const duration = Date.now() - startTime;

    console.log('✅ 统计完成！');
    console.log('');
    console.log('统计结果:');
    console.log(`  转发关系: ${result.repost.toString().padStart(6)} 条`);
    console.log(`  评论关系: ${result.comment.toString().padStart(6)} 条`);
    console.log(`  点赞关系: ${result.like.toString().padStart(6)} 条`);
    console.log(`  ────────────────────`);
    console.log(`  合计:     ${(result.repost + result.comment + result.like).toString().padStart(6)} 条`);
    console.log('');
    console.log(`耗时: ${duration}ms`);

    // 显示进度信息
    console.log('');
    console.log('📊 当前统计进度:');
    const progress = await useEntityManager(manager =>
      UserRelationStatisticsQueries.getStatisticsProgress(manager)
    );

    if (progress.length > 0) {
      progress.forEach((p: any) => {
        console.log(`  ${p.relation_type.padEnd(8)}: ${p.total_relations.toString().padStart(8)} 个关系, ${p.total_interactions.toString().padStart(10)} 次互动`);
      });
    } else {
      console.log('  暂无统计数据');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('❌ 统计失败:', error.message);
    if (error.stack) {
      console.error('');
      console.error('堆栈信息:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
