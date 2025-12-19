-- 邮件表
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,           -- 收件地址
  from_address TEXT NOT NULL,      -- 发件地址
  subject TEXT,                    -- 邮件主题
  content TEXT NOT NULL,           -- 邮件内容（纯文本）
  raw TEXT NOT NULL,               -- 邮件原始内容（RFC 822）
  message_id TEXT,                 -- 邮件唯一标识
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 接收时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引：快速查询指定地址的邮件
CREATE INDEX IF NOT EXISTS idx_emails_address ON emails(address);

-- 索引：快速查询最新邮件
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);

-- 复合索引：查询指定地址的最新邮件
CREATE INDEX IF NOT EXISTS idx_emails_address_received ON emails(address, received_at DESC);
