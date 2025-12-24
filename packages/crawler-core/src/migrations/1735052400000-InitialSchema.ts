import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1735052400000 implements MigrationInterface {
  name = 'InitialSchema1735052400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS xhs_note (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        note_id TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT,
        video_url TEXT,
        time BIGINT NOT NULL,
        last_update_time BIGINT NOT NULL,
        liked_count TEXT DEFAULT '0',
        collected_count TEXT DEFAULT '0',
        comment_count TEXT DEFAULT '0',
        share_count TEXT DEFAULT '0',
        image_list TEXT,
        tag_list TEXT,
        note_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS xhs_note_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        note_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        pictures TEXT,
        sub_comments TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS xhs_creator (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT NOT NULL UNIQUE,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        desc TEXT,
        gender TEXT,
        follows TEXT DEFAULT '0',
        fans TEXT DEFAULT '0'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS douyin_aweme (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        aweme_id TEXT NOT NULL UNIQUE,
        aweme_type TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT,
        create_time BIGINT NOT NULL,
        liked_count TEXT DEFAULT '0',
        comment_count TEXT DEFAULT '0',
        share_count TEXT DEFAULT '0',
        collected_count TEXT DEFAULT '0',
        aweme_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS douyin_aweme_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        aweme_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        sub_comments TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS douyin_creator (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT NOT NULL UNIQUE,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        desc TEXT,
        gender TEXT,
        follows TEXT DEFAULT '0',
        fans TEXT DEFAULT '0'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bilibili_video (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        video_id TEXT NOT NULL UNIQUE,
        video_type TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT,
        create_time BIGINT NOT NULL,
        liked_count TEXT DEFAULT '0',
        video_play_count TEXT DEFAULT '0',
        video_danmaku TEXT DEFAULT '0',
        video_comment TEXT DEFAULT '0',
        video_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bilibili_video_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        video_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        sub_comments TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weibo_note (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        note_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        create_date_time TEXT NOT NULL,
        liked_count TEXT DEFAULT '0',
        comments_count TEXT DEFAULT '0',
        shared_count TEXT DEFAULT '0',
        note_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weibo_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        note_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        create_date_time TEXT NOT NULL,
        comment_url TEXT,
        sub_comments TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kuaishou_video (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        video_id TEXT NOT NULL UNIQUE,
        video_type TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT,
        create_time BIGINT NOT NULL,
        liked_count TEXT DEFAULT '0',
        viewd_count TEXT DEFAULT '0',
        video_url TEXT,
        video_cover_url TEXT,
        video_play_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kuaishou_video_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        video_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        sub_comments TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tieba_note (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        note_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        desc TEXT,
        note_url TEXT,
        publish_time TEXT NOT NULL,
        liked_count TEXT DEFAULT '0',
        comments_count TEXT DEFAULT '0',
        shared_count TEXT DEFAULT '0'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tieba_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        note_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        sub_comments TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zhihu_question (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        question_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        desc TEXT,
        question_url TEXT,
        created_time BIGINT NOT NULL,
        updated_time BIGINT NOT NULL,
        answer_count TEXT DEFAULT '0',
        comment_count TEXT DEFAULT '0',
        follower_count TEXT DEFAULT '0',
        visit_count TEXT DEFAULT '0'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zhihu_answer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        answer_id TEXT NOT NULL UNIQUE,
        question_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_time BIGINT NOT NULL,
        updated_time BIGINT NOT NULL,
        voteup_count TEXT DEFAULT '0',
        comment_count TEXT DEFAULT '0',
        thanks_count TEXT DEFAULT '0',
        answer_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zhihu_comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        add_ts BIGINT NOT NULL,
        last_modify_ts BIGINT NOT NULL,
        user_id TEXT,
        nickname TEXT,
        avatar TEXT,
        ip_location TEXT DEFAULT '',
        content TEXT NOT NULL,
        like_count TEXT DEFAULT '0',
        sub_comment_count TEXT DEFAULT '0',
        parent_comment_id TEXT,
        comment_id TEXT NOT NULL UNIQUE,
        answer_id TEXT NOT NULL,
        create_time BIGINT NOT NULL,
        sub_comments TEXT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS zhihu_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS zhihu_answer`);
    await queryRunner.query(`DROP TABLE IF EXISTS zhihu_question`);
    await queryRunner.query(`DROP TABLE IF EXISTS tieba_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS tieba_note`);
    await queryRunner.query(`DROP TABLE IF EXISTS kuaishou_video_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS kuaishou_video`);
    await queryRunner.query(`DROP TABLE IF EXISTS weibo_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS weibo_note`);
    await queryRunner.query(`DROP TABLE IF EXISTS bilibili_video_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS bilibili_video`);
    await queryRunner.query(`DROP TABLE IF EXISTS douyin_creator`);
    await queryRunner.query(`DROP TABLE IF EXISTS douyin_aweme_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS douyin_aweme`);
    await queryRunner.query(`DROP TABLE IF EXISTS xhs_creator`);
    await queryRunner.query(`DROP TABLE IF EXISTS xhs_note_comment`);
    await queryRunner.query(`DROP TABLE IF EXISTS xhs_note`);
  }
}
