import { Injectable } from '@sker/core';
import { AuthPlugin } from '../../decorators/plugin';
import { Entity } from '../../decorators/entity';
import { Field } from '../../decorators/field';
import { Post, Get } from '../../decorators/endpoint';
import { Body, Context } from '../../decorators/parameter';
import { AfterSignUp } from '../../decorators/hook';
import { z } from 'zod';

/**
 * UserBirthday Entity
 * 用户生日数据表
 */
@Entity({ tableName: 'userBirthday' })
class UserBirthday {
  @Field({
    type: 'string',
    required: true,
    references: { model: 'user', field: 'id' }
  })
  userId!: string;

  @Field({ type: 'date', required: true })
  birthday!: Date;

  @Field({ type: 'string', required: false })
  zodiacSign?: string;
}

/**
 * Zod Schema for birthday update
 */
const updateBirthdaySchema = z.object({
  birthday: z.string()
});

/**
 * Birthday Plugin
 * 用户生日管理插件
 */
@AuthPlugin({
  id: 'birthday',
  description: '用户生日管理插件'
})
@Injectable()
export class BirthdayPlugin {
  constructor() {}

  /**
   * 更新生日
   */
  @Post('/birthday/update', { requireAuth: true })
  async updateBirthday(
    @Body(updateBirthdaySchema) body: { birthday: string },
    @Context() ctx: any
  ) {
    const zodiacSign = this.calculateZodiacSign(new Date(body.birthday));

    await ctx.context.adapter.update({
      model: 'userBirthday',
      where: [{ field: 'userId', value: ctx.context.session.user.id }],
      update: {
        birthday: new Date(body.birthday),
        zodiacSign
      }
    });

    return { success: true, zodiacSign };
  }

  /**
   * 获取我的生日
   */
  @Get('/birthday/me', { requireAuth: true })
  async getMyBirthday(@Context() ctx: any) {
    const birthday = await ctx.context.adapter.findOne({
      model: 'userBirthday',
      where: [{ field: 'userId', value: ctx.context.session.user.id }]
    });

    return { birthday };
  }

  /**
   * 用户注册后钩子 - 自动创建生日记录
   */
  @AfterSignUp()
  async onUserSignUp(@Context() ctx: any) {
    await ctx.context.adapter.create({
      model: 'userBirthday',
      data: {
        userId: ctx.context.session.user.id,
        birthday: new Date(),
        zodiacSign: null
      }
    });
  }

  /**
   * 计算星座
   */
  private calculateZodiacSign(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '白羊座';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '双子座';
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '狮子座';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '处女座';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蝎座';
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '双鱼座';

    return '未知';
  }
}
