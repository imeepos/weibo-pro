/**
 * 验证 DataSource 单例模式
 *
 * 运行方式: npx tsx test-datasource-singleton.ts
 */

import { useDataSource } from './packages/entities/src/utils'

async function testDataSourceSingleton() {
  console.log('🧪 测试 DataSource 单例模式...\n')

  // 获取多个实例
  const instance1 = await useDataSource()
  const instance2 = await useDataSource()
  const instance3 = await useDataSource()

  console.log('实例 1:', instance1.constructor.name)
  console.log('实例 2:', instance2.constructor.name)
  console.log('实例 3:', instance3.constructor.name)

  console.log('\n比较结果:')
  console.log('- instance1 === instance2:', instance1 === instance2)
  console.log('- instance2 === instance3:', instance2 === instance3)
  console.log('- instance1 === instance3:', instance1 === instance3)

  // 检查是否是同一个对象（比较内存地址）
  const isSameInstance = (instance1 === instance2) && (instance2 === instance3)

  console.log('\n✅ 结果:', isSameInstance ? '所有实例都是同一个对象（单例模式正确）' : '❌ 发现不同的实例！')

  // 检查 driver 是否相同
  console.log('\nDriver 比较:')
  console.log('- instance1.driver === instance2.driver:', instance1.driver === instance2.driver)
  console.log('- instance2.driver === instance3.driver:', instance2.driver === instance3.driver)

  return isSameInstance
}

testDataSourceSingleton()
  .then((result) => {
    process.exit(result ? 0 : 1)
  })
  .catch((error) => {
    console.error('测试失败:', error)
    process.exit(1)
  })
