-- Weibo-Pro 数据库初始化脚本
-- 创建必要的扩展、表和索引

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于全文搜索

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建会话表
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建微博数据表
CREATE TABLE IF NOT EXISTS weibo_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mid BIGINT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(50),
    author_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    reposts_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    sentiment_score DECIMAL(3,2),  -- -1.0 到 1.0
    keywords JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    INDEX idx_weibo_mid (mid),
    INDEX idx_weibo_published (published_at DESC),
    INDEX idx_weibo_sentiment (sentiment_score),
    INDEX idx_weibo_content_gin (to_tsvector('chinese', content))
);

-- 创建关键词表
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word VARCHAR(100) UNIQUE NOT NULL,
    frequency INTEGER DEFAULT 1,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_keyword_word (word),
    INDEX idx_keyword_frequency (frequency DESC)
);

-- 创建工作流表
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_workflow_status (status)
);

-- 创建工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'running',
    input JSONB,
    output JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_execution_workflow (workflow_id),
    INDEX idx_execution_status (status),
    INDEX idx_execution_started (started_at DESC)
);

-- 创建配置表
CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO app_config (key, value, description) VALUES
    ('system', '{"name": "Weibo-Pro", "version": "1.0.0"}', '系统基础配置'),
    ('crawler', '{"interval": 300, "batchSize": 100}', '爬虫配置'),
    ('monitoring', '{"alertThreshold": 0.8, "checkInterval": 60}', '监控配置')
ON CONFLICT (key) DO NOTHING;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建全文搜索索引
CREATE INDEX idx_weibo_content_fts ON weibo_posts USING gin(to_tsvector('chinese', content));

-- 创建复合索引
CREATE INDEX idx_weibo_post_stats ON weibo_posts(published_at DESC, likes_count DESC);
CREATE INDEX idx_weibo_author_posts ON weibo_posts(author_id, published_at DESC);

-- 授予权限（根据实际情况调整）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO weibo_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO weibo_user;
