import { describe, expect, it } from 'vitest';
import {
  UserProfileSourcePostEntity,
  UserProfilePostExtractionEntity,
  UserProfileDistillationTaskEntity,
} from '@sker/entities';

describe('增量蒸馏实体合同', () => {
  it('为原始帖子快照保留文本指纹与原始快照', () => {
    const entity = new UserProfileSourcePostEntity();

    expect(entity).toHaveProperty('post_id');
    expect(entity).toHaveProperty('content_fingerprint');
    expect(entity).toHaveProperty('source_snapshot');
    expect(entity).toHaveProperty('latest_task_id');
  });

  it('为逐帖抽取结果保留版本号、状态与抽取 JSON', () => {
    const entity = new UserProfilePostExtractionEntity();

    expect(entity).toHaveProperty('source_post_id');
    expect(entity).toHaveProperty('extractor_version');
    expect(entity).toHaveProperty('status');
    expect(entity).toHaveProperty('extracted_json');
  });

  it('为任务保留多阶段进度和 warning 列表', () => {
    const entity = new UserProfileDistillationTaskEntity();

    expect(entity).toHaveProperty('progress_json');
    expect(entity).toHaveProperty('warnings_json');
  });
});
