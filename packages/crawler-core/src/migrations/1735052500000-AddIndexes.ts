import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1735052500000 implements MigrationInterface {
  name = 'AddIndexes1735052500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // XHS 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_xhs_note_user_id ON xhs_note(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_xhs_note_time ON xhs_note(time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_xhs_comment_note_id ON xhs_note_comment(note_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_xhs_comment_user_id ON xhs_note_comment(user_id)`);

    // Douyin 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_douyin_aweme_user_id ON douyin_aweme(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_douyin_aweme_time ON douyin_aweme(create_time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_douyin_comment_aweme_id ON douyin_aweme_comment(aweme_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_douyin_comment_user_id ON douyin_aweme_comment(user_id)`);

    // Bilibili 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bilibili_video_user_id ON bilibili_video(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bilibili_video_time ON bilibili_video(create_time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bilibili_comment_video_id ON bilibili_video_comment(video_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bilibili_comment_user_id ON bilibili_video_comment(user_id)`);

    // Weibo 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_weibo_note_user_id ON weibo_note(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_weibo_note_time ON weibo_note(create_time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_weibo_comment_note_id ON weibo_comment(note_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_weibo_comment_user_id ON weibo_comment(user_id)`);

    // Kuaishou 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kuaishou_video_user_id ON kuaishou_video(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kuaishou_video_time ON kuaishou_video(create_time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kuaishou_comment_video_id ON kuaishou_video_comment(video_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kuaishou_comment_user_id ON kuaishou_video_comment(user_id)`);

    // Tieba 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tieba_note_user_id ON tieba_note(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tieba_comment_note_id ON tieba_comment(note_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tieba_comment_user_id ON tieba_comment(user_id)`);

    // Zhihu 索引
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_zhihu_answer_question_id ON zhihu_answer(question_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_zhihu_answer_user_id ON zhihu_answer(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_zhihu_comment_answer_id ON zhihu_comment(answer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_zhihu_comment_user_id ON zhihu_comment(user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // XHS
    await queryRunner.query(`DROP INDEX IF EXISTS idx_xhs_note_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_xhs_note_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_xhs_comment_note_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_xhs_comment_user_id`);

    // Douyin
    await queryRunner.query(`DROP INDEX IF EXISTS idx_douyin_aweme_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_douyin_aweme_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_douyin_comment_aweme_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_douyin_comment_user_id`);

    // Bilibili
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bilibili_video_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bilibili_video_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bilibili_comment_video_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bilibili_comment_user_id`);

    // Weibo
    await queryRunner.query(`DROP INDEX IF EXISTS idx_weibo_note_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_weibo_note_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_weibo_comment_note_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_weibo_comment_user_id`);

    // Kuaishou
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kuaishou_video_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kuaishou_video_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kuaishou_comment_video_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kuaishou_comment_user_id`);

    // Tieba
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tieba_note_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tieba_comment_note_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tieba_comment_user_id`);

    // Zhihu
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zhihu_answer_question_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zhihu_answer_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zhihu_comment_answer_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zhihu_comment_user_id`);
  }
}
