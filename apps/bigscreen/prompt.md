## 需求

分析：
packages\entities\src\persona.entity.ts
packages\entities\src\memory.entity.ts
packages\entities\src\memory-relation.entity.ts
packages\entities\src\memory-closure.entity.ts

设计一个 角色节点 @sker/workflow-ast

功能：可以在左侧抽屉中选数据库中选择一个已有角色

1. 根据多个输入，触发记忆检索，每次检索一条线索，一层一层检索，
2. 给定检索时间，当时间到了，根据检索的结果，汇总成上下文
3. 根据上下文，做出响应的回复，生成一条记忆数据，插入到数据库

范围：
1. @sker/workflow-ast 定义
2. @sker/workflow-browser 浏览器
3. @sker/workflow-run 服务器
4. @sker/workflow-ui 前端展示
5. @sker/ui 选择角色组件抽离

## 说明

1. 前端项目：apps\bigscreen 使用@sker/ui + @sker/sdk 组装成页面或业务组件 @sker/bigscreen
2. 后端接口：apps\api 实现@sker/sdk定义的Controller @sker/api
3. SDK封装：packages\sdk 定义接口输入输出格式 @sker/sdk
4. 组件封装：packages\ui（纯样式+布局）@sker/ui 
   1. @sker/ui/components/blocks 组装简单的组件为复杂组件
   2. @sker/ui/components/ui 简单组件
   3. @sker/ui/components/workflow 工作流组件
   4. @sker/ui/components/weibo 微博相关组件
   5. @sker/ui/components/mobile 手机端组件
   6. @sker/ui/components/editor 富文本编辑器组件
5. 数据库表结构：packages\entities 定义数据库表结构 @sker/entities

只实现用到的，不要有多余的代码，保持简单美