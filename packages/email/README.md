# @sker/email

临时邮箱服务，用于注册/验证场景中自动创建邮箱地址并轮询提取验证码。

## 核心职责

- 提供统一的临时邮箱抽象（`EmailProvider` 接口），屏蔽各家临时邮箱服务差异
- 自动创建一次性邮箱地址，并支持获取当前地址
- 轮询等待新邮件（默认间隔 3 秒，超时 60 秒），用于提取验证码
- 内置两个免费临时邮箱提供商：Mail.tm（`MailTmProvider`）、EmailD1（`EmailD1Provider`）
- 提供 `EmailService` 门面，统一管理"建号 → 收信"流程

## 目录结构

```
packages/email/
├── src/
│   ├── index.ts                       # 导出入口
│   ├── core/
│   │   ├── types.ts                   # EmailAddress / Message / EmailProvider / EmailServiceConfig 类型
│   │   ├── EmailService.ts            # 邮箱服务门面：createAddress / waitForMessage / getLatestMessage
│   │   └── utils.ts                   # sleep 与随机字符串生成工具
│   └── providers/
│       ├── base.ts                    # BaseProvider 抽象基类
│       ├── mailtm.ts                  # Mail.tm 提供商（API: api.mail.tm）
│       └── emaild1.ts                 # EmailD1 提供商（API: email.bowong.cc）
├── package.json                       # 包配置（无第三方运行时依赖，纯 fetch 实现）
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：临时邮箱地址的创建、收件轮询与验证码等待；Mail.tm / EmailD1 两种免费提供商接入
- **❌ 不负责**：发送邮件、SMTP 协议、邮件模板、持久化存储；验证码的 OCR 或正则提取（仅返回消息内容，提取逻辑由调用方负责）
- **对外依赖**：不依赖任何 `@sker/*` 运行时包；无第三方运行时依赖（使用原生 `fetch`）
- **被谁依赖**：当前未被其他 `@sker/*` 包或应用直接引用（`apps/email-d1` 是独立的 Cloudflare D1 收信应用，与本包无关，仅名称相近）
