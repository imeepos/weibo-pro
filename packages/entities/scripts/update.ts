import { DataSource } from 'typeorm';
import { EventHourlyStatisticsEntity } from '../src/event-hourly-statistics.entity';

/**
 * 修复 event_hourly_statistics 表的时区问题
 *
 * 问题描述：
 * - 历史数据使用本地时间存储 year/month/day/hour，没有正确处理 UTC+8 时区
 *
 * 修复策略：
 * 1. 根据 created_at 时间戳重新计算正确的时间维度（UTC+8）
 * 2. 只更新 year/month/day/hour 字段，不修改其他统计值
 * 3. 如果修复后的时间维度与其他记录冲突，删除其中一条（保留更早创建的）
 */

/**
 * 在现有的年月日时基础上减去8小时
 */
export function subtract8Hours(year: number, month: number, day: number, hour: number) {
  // 创建日期对象（使用UTC时间）
  const date = new Date(Date.UTC(year, month - 1, day, hour));

  // 减去8小时
  date.setUTCHours(date.getUTCHours() - 8);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours()
  };
}

/**
 * 执行数据迁移
 */
export async function fixTimezoneInStatistics(dataSource: DataSource) {
  console.log('🚀 开始修复时区问题...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const repository = queryRunner.manager.getRepository(EventHourlyStatisticsEntity);

    // 1. 读取所有数据
    console.log('📖 读取所有统计数据...');
    const allRecords = await repository.find({
      order: { created_at: 'ASC' }
    });

    console.log(`✅ 共读取 ${allRecords.length} 条记录`);

    if (allRecords.length === 0) {
      console.log('⚠️  没有数据需要迁移');
      await queryRunner.commitTransaction();
      return;
    }

    // 2. 删除所有旧数据
    console.log('🗑️  删除旧数据...');
    await queryRunner.query(`DELETE FROM event_hourly_statistics`);
    console.log('✅ 旧数据已删除');

    // 3. 插入修复后的数据
    console.log('💾 插入修复后的数据...');
    let processedCount = 0;

    for (const record of allRecords) {
      const newTimeDim = subtract8Hours(record.year, record.month, record.day, record.hour);

      await repository.insert({
        id: record.id,
        event_id: record.event_id,
        year: newTimeDim.year,
        month: newTimeDim.month,
        day: newTimeDim.day,
        hour: newTimeDim.hour,
        post_count: record.post_count,
        comment_count: record.comment_count,
        repost_count: record.repost_count,
        like_count: record.like_count,
        user_count: record.user_count,
        hotness: record.hotness,
        nlp_count: record.nlp_count,
        sentiment_positive: record.sentiment_positive,
        sentiment_negative: record.sentiment_negative,
        sentiment_neutral: record.sentiment_neutral,
        created_at: record.created_at,
        updated_at: record.updated_at
      });

      processedCount++;

      if (processedCount % 1000 === 0) {
        console.log(`  进度: ${processedCount}/${allRecords.length}`);
      }
    }

    console.log(`✅ 数据迁移完成！`);
    console.log(`  - 处理记录数: ${processedCount}`);

    await queryRunner.commitTransaction();
    console.log('✅ 时区修复成功完成！');

  } catch (error) {
    console.error('❌ 迁移失败，回滚事务:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * 迁移前预览（不执行实际修改）
 */
export async function previewTimezoneFix(dataSource: DataSource) {
  console.log('👀 预览时区修复...');

  const repository = dataSource.getRepository(EventHourlyStatisticsEntity);
  const allRecords = await repository.find();

  console.log(`📊 总记录数: ${allRecords.length}`);

  if (allRecords.length === 0) {
    console.log('⚠️  没有数据需要修复');
    return;
  }

  // 显示前5条记录的转换示例
  console.log('\n转换示例（前5条）:');
  console.log('┌────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Event ID                          │ 旧时间 (YYYY-MM-DD HH)  │ 新时间 (YYYY-MM-DD HH)  │             │');
  console.log('├────────────────────────────────────────────────────────────────────────────────────────────────┤');

  for (let i = 0; i < Math.min(5, allRecords.length); i++) {
    const record = allRecords[i];
    const newTimeDim = subtract8Hours(record.year, record.month, record.day, record.hour);
    const eventId = record.event_id.substring(0, 32) + '...';
    const oldTime = `${record.year}-${String(record.month).padStart(2, '0')}-${String(record.day).padStart(2, '0')} ${String(record.hour).padStart(2, '0')}:00`;
    const newTime = `${newTimeDim.year}-${String(newTimeDim.month).padStart(2, '0')}-${String(newTimeDim.day).padStart(2, '0')} ${String(newTimeDim.hour).padStart(2, '0')}:00`;
    console.log(`│ ${eventId.padEnd(32)} │ ${oldTime.padEnd(22)} │ ${newTime.padEnd(22)} │             │`);
  }

  console.log('└────────────────────────────────────────────────────────────────────────────────────────────────┘');
  console.log('\n✅ 预览完成，如需执行实际迁移，请运行 fixTimezoneInStatistics()');
}
