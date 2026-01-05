import "@sker/sdk";
import { createSkerClientPlugin } from '@sker/sdk';
import { createAuthClient } from 'better-auth/client'

// 全局设置
beforeAll(() => {
  createAuthClient({
    baseURL: `http://localhost:9088/api/auth`,
    plugins: [createSkerClientPlugin()]
  })
})
