export interface TestResult {
  name: string
  success: boolean
  message: string
  data?: any
}

export const results: TestResult[] = []

export function logResult(result: TestResult) {
  const icon = result.success ? '' : ''
  const color = result.success ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}${icon} ${result.name}\x1b[0m`)
  console.log(`   ${result.message}`)
  if (result.data !== undefined) {
    console.log(`   数据: ${JSON.stringify(result.data, null, 2).split('\n').join('\n   ')}`)
  }
  console.log('')
}
