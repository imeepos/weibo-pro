/**
 * Post NLP Agent 使用示例
 *
 * 存在即合理：
 * - 展示如何启动消费者
 * - 展示如何推送任务
 * - 提供完整的集成示例
 */

import { startPostNLPConsumer } from './post-nlp-agent.consumer';
import type { PostNLPTask } from './post-nlp-agent.consumer';

declare function useQueue<T>(name: string): any;

async function main() {
  console.log('=== Post NLP Agent 示例 ===\n');

  const consumer = startPostNLPConsumer();

  console.log('\n消费者已启动，等待任务...\n');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const queue = useQueue<PostNLPTask>('post_nlp_queue');

  console.log('推送测试任务...\n');

  queue.producer.next({
    postId: '5095814444178803',
  });

  console.log('任务已推送，等待处理...\n');

  await new Promise((resolve) => setTimeout(resolve, 30000));

  console.log('\n停止消费者...');
  consumer.stop();

  process.exit(0);
}

main().catch((err) => {
  console.error('示例执行失败:', err);
  process.exit(1);
});
