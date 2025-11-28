/**
 * Better Auth 装饰器插件框架使用示例
 *
 * 本文件展示如何使用装饰器创建 Better Auth 插件
 */

import { AuthPlugin, Entity, Field, Post, Get, Body, Context, AfterSignUp } from './index';
import { Injectable } from '@sker/core';
import { z } from 'zod';

// ============================================================
// 示例 1: Birthday Plugin（完整示例见 src/plugins/birthday）
// ============================================================

// ============================================================
// 示例 2: 用户资料插件
// ============================================================

@Entity({ tableName: 'userProfile' })
class UserProfile {
  @Field({
    type: 'string',
    required: true,
    references: { model: 'user', field: 'id' }
  })
  userId!: string;

  @Field({ type: 'string', required: false })
  bio?: string;

  @Field({ type: 'string', required: false })
  avatar?: string;

  @Field({ type: 'string', required: false })
  location?: string;
}

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  location: z.string().optional()
});

@AuthPlugin({ id: 'profile', description: '用户资料管理插件' })
@Injectable()
export class ProfilePlugin {
  @Post('/profile/update', { requireAuth: true })
  async updateProfile(
    @Body(updateProfileSchema) body: { bio?: string; avatar?: string; location?: string },
    @Context() ctx: any
  ) {
    await ctx.context.adapter.update({
      model: 'userProfile',
      where: [{ field: 'userId', value: ctx.context.session.user.id }],
      update: body
    });

    return { success: true, profile: body };
  }

  @Get('/profile/me', { requireAuth: true })
  async getMyProfile(@Context() ctx: any) {
    const profile = await ctx.context.adapter.findOne({
      model: 'userProfile',
      where: [{ field: 'userId', value: ctx.context.session.user.id }]
    });

    return { profile };
  }

  @Get('/profile/:userId')
  async getProfileByUserId(@Context() ctx: any) {
    const userId = ctx.params?.userId;

    const profile = await ctx.context.adapter.findOne({
      model: 'userProfile',
      where: [{ field: 'userId', value: userId }]
    });

    return { profile };
  }

  @AfterSignUp()
  async onUserSignUp(@Context() ctx: any) {
    await ctx.context.adapter.create({
      model: 'userProfile',
      data: {
        userId: ctx.context.session.user.id,
        bio: '',
        avatar: '',
        location: ''
      }
    });
  }
}

// ============================================================
// 使用方式
// ============================================================

/**
 * 服务端集成
 */
/*
import { betterAuth } from 'better-auth';
import { compileAuthPlugins } from 'auth';

const compiledPlugins = compileAuthPlugins();

export const auth = betterAuth({
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL
  },
  plugins: compiledPlugins
});
*/

/**
 * 客户端使用
 */
/*
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({
  baseURL: 'http://localhost:3000'
});

// 类型安全的 API 调用
await authClient.profile.updateProfile({
  bio: 'Hello World!',
  avatar: 'https://example.com/avatar.png'
});

const { profile } = await authClient.profile.getMyProfile();
console.log(profile);
*/
