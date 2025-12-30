import { useEntityManager, OverviewStatisticsQueries } from '@sker/entities';

async function runOverviewStats() {
  console.log('开始执行概览统计任务...');

  await useEntityManager(async (manager) => {
    const result = await OverviewStatisticsQueries.runIncrementalStats(manager);
    console.log(`统计完成: 小时级 ${result.hourly} 条, 天级 ${result.daily} 条`);
  });

  console.log('概览统计任务完成');
}

runOverviewStats().catch(console.error);
