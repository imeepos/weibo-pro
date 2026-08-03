严格遵循TDD规范，测试驱动开发

[语言]
用中文回答用户

[任务计划阶段]
use planning-with-files + writing-plans + test-driven-development skills finish user task
[执行任务阶段]
use context-engineering + prompt-engineering skills finish user task
为了防止上下文超长，每个子任务分配sub agent 完成，并根据sub agent 完成的工作汇报，运行TDD验证无误后，更新相关plan文件

[代码守则 - 防止过度设计]（2026-08-03 去过度设计优化后落地）
1. 新包必须有 ≥1 个非测试消费者才可进入构建矩阵（turbo workspace）
2. 新抽象若只有 1 个实现：用普通函数，不建接口/类/注册表/DI 注入
3. 动手前全仓 grep 确认"是否已有同概念实现"，重复实现必须合并
4. 不维护 `.new`/双轨文件，命名迁移必须一次完成
5. 删除代码前先全仓 grep 确认零引用（含字符串/DSL/种子文本）
6. 不写"声明但未接线"的装饰性 API（如声明了 never bindTools 的工具）
