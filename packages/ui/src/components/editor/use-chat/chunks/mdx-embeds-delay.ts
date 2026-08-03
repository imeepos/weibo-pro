'use client';

import { faker } from '@faker-js/faker';

/**
 * 所有 embeds 分块共享的流式延迟值
 *
 * 在原始实现中 delay 在模块顶层计算一次，拆分后通过本模块共享同一随机值，
 * 以保持流式时序行为完全一致。
 */
export const mdxEmbedsDelay = faker.number.int({ max: 20, min: 5 });
