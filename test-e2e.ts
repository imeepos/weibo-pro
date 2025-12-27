#!/usr/bin/env tsx
/**
 * 端到端集成测试
 *
 * 测试完整的三层架构消息流：
 * 手机端 → API 服务器 → RabbitMQ → CLI 执行端 → RabbitMQ → API 服务器 → 手机端
 */

import { io, Socket } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';

// 配置
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_COMMAND = 'echo "Hello from E2E test"';
const TIMEOUT = 30000; // 30 秒超时

console.log('🚀 启动端到端集成测试...\n');
console.log(`📍 API 服务器: ${API_URL}`);
console.log(`🧪 测试命令: ${TEST_COMMAND}\n`);

// 测试结果跟踪
const testResults = {
  connected: false,
  taskCreated: false,
  sessionCreated: false,
  responseReceived: false,
  completed: false,
  error: null as string | null,
};

// 创建 Socket.IO 客户端
const socket: Socket = io(`${API_URL}/claude`, {
  transports: ['websocket'],
  reconnection: false,
});

// 测试超时控制
const timeoutHandle = setTimeout(() => {
  console.error('\n❌ 测试超时 (30秒)\n');
  printTestResults();
  process.exit(1);
}, TIMEOUT);

// 连接成功
socket.on('connect', () => {
  console.log('✅ [1/6] Socket.IO 连接成功');
  console.log(`   Socket ID: ${socket.id}\n`);
  testResults.connected = true;

  // 发送测试命令
  console.log('📤 [2/6] 发送命令到服务器...');
  console.log(`   命令: ${TEST_COMMAND}\n`);

  socket.emit('claude:command', {
    command: TEST_COMMAND,
    cwd: process.cwd(),
  });
});

// 任务已创建（服务器收到命令）
socket.on('claude:task-created', (data: { taskId: string }) => {
  console.log('✅ [3/6] 任务已创建');
  console.log(`   Task ID: ${data.taskId}\n`);
  testResults.taskCreated = true;
});

// 会话已创建（CLI 开始执行）
socket.on('claude:response', (data: any) => {
  if (data.type === 'session-created') {
    console.log('✅ [4/6] Claude 会话已创建');
    console.log(`   Session ID: ${data.sessionId}\n`);
    testResults.sessionCreated = true;
  } else if (data.type === 'message') {
    if (!testResults.responseReceived) {
      console.log('✅ [5/6] 收到 Claude 响应');
      console.log('   消息内容:');
      console.log(`   ${JSON.stringify(data.data, null, 2)}\n`);
      testResults.responseReceived = true;
    }
  } else if (data.type === 'complete') {
    console.log('✅ [6/6] 任务执行完成');
    console.log(`   Exit Code: ${data.data.exitCode}\n`);
    testResults.completed = true;

    // 测试成功
    clearTimeout(timeoutHandle);
    console.log('═'.repeat(60));
    console.log('🎉 端到端测试全部通过！\n');
    printTestResults();
    socket.disconnect();
    process.exit(0);
  } else if (data.type === 'error') {
    console.error('❌ 收到错误响应');
    console.error(`   错误信息: ${data.data.message}\n`);
    testResults.error = data.data.message;

    clearTimeout(timeoutHandle);
    printTestResults();
    socket.disconnect();
    process.exit(1);
  }
});

// 连接错误
socket.on('connect_error', (error: Error) => {
  console.error('\n❌ Socket.IO 连接失败');
  console.error(`   错误: ${error.message}\n`);
  console.error('💡 请确保：');
  console.error('   1. API 服务器正在运行 (turbo dev --filter=@sker/api)');
  console.error('   2. RabbitMQ 服务正在运行');
  console.error('   3. CLI daemon 正在运行 (cd packages/cli && pnpm dev)\n');

  testResults.error = error.message;
  clearTimeout(timeoutHandle);
  printTestResults();
  process.exit(1);
});

// 断开连接
socket.on('disconnect', (reason: string) => {
  if (!testResults.completed && !testResults.error) {
    console.error(`\n⚠️  Socket 断开连接: ${reason}\n`);
  }
});

// 打印测试结果
function printTestResults() {
  console.log('\n📊 测试结果摘要:');
  console.log('═'.repeat(60));
  console.log(`✅ Socket.IO 连接:     ${testResults.connected ? 'PASS' : 'FAIL'}`);
  console.log(`✅ 任务创建:          ${testResults.taskCreated ? 'PASS' : 'FAIL'}`);
  console.log(`✅ 会话创建:          ${testResults.sessionCreated ? 'PASS' : 'FAIL'}`);
  console.log(`✅ 响应接收:          ${testResults.responseReceived ? 'PASS' : 'FAIL'}`);
  console.log(`✅ 任务完成:          ${testResults.completed ? 'PASS' : 'FAIL'}`);

  if (testResults.error) {
    console.log(`\n❌ 错误: ${testResults.error}`);
  }

  console.log('═'.repeat(60) + '\n');
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n⚠️  测试被中断\n');
  clearTimeout(timeoutHandle);
  printTestResults();
  socket.disconnect();
  process.exit(130);
});
