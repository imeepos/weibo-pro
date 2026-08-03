# @sker/utils

基于 Web Crypto（`crypto.subtle`）的加密与编码工具库，为 Sker 应用提供统一、类型安全的哈希、HMAC、签名、OTP、随机数与编解码能力。

## 核心职责

- **哈希**：`createHash` 支持 SHA-1 / SHA-256 / SHA-384 / SHA-512 等摘要算法
- **HMAC**：`createHMAC` 基于密钥的哈希消息认证码
- **非对称加密**：RSA（签名/验签/密钥对）与 ECDSA（曲线签名/验签）
- **一次性密码**：`createOTP` 支持 HOTP（基于计数）与 TOTP（基于时间）
- **随机数**：`generateRandomString` 与 `createRandomStringGenerator` 生成密码学安全的随机字符串
- **编码**：base32 / base32hex、base64 / base64Url、hex、二进制与 TypedArray 互转

## 目录结构

```
src/
├── index.ts               # 统一导出
├── type.ts                # 公共类型（TypedArray、SHAFamily、EncodingFormat、ECDSACurve 等）
├── getWebcryptoSubtle.ts  # 获取 Web Crypto subtle 实例（含 Node/浏览器环境适配）
├── hash.ts                # createHash - 哈希摘要
├── hmac.ts                # createHMAC - 密钥哈希消息认证码
├── rsa.ts                 # RSA 密钥生成/签名/验签/加解密
├── ecdsa.ts               # ECDSA 密钥生成/签名/验签
├── otp.ts                 # createOTP - HOTP / TOTP
├── random.ts              # 密码学安全随机字符串
├── base32.ts              # base32 / base32hex 编解码
├── base64.ts              # base64 / base64Url 编解码
├── hex.ts                 # hex 编解码
├── binary.ts              # 二进制互转
└── buffer.ts              # Buffer 辅助
```

## 边界

- **✅ 负责**：加密原语（哈希/HMAC/RSA/ECDSA）、OTP、随机数与常见编码；统一的 Web Crypto 环境适配；类型安全的 API 设计
- **❌ 不负责**：不负责 JSON 解析（见 `@sker/json-harmony`）；不包含业务逻辑、协议层或网络请求；不提供浏览器 Cookie/存储等前端能力
- **对外依赖**：无运行时第三方依赖（纯 Node/Web 原生 `crypto` 实现）
- **被谁依赖**：`apps/api`、`packages/cli`（以及依赖它们的应用）
