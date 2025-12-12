## 需求

问题：

- packages\workflow-run\src\PersonaAstVisitor.ts 一次运行会入库多条
而且 name/description/type 生成的都很不精确，这是记忆系统，根据name/description 要能知道 content里发生了什么事情
一个故事剧情，要根据需要，生成合理的多条记忆，而不是静态的一条

d44379ef-0f78-4baf-a31e-f39da46b7da2	bff2929c-773a-4b5c-99f9-a75229e4b685	对话-2025/12/12 12:06:46	undefined
7132011e-303b-42f5-97a5-1d3ccefc44c3	bff2929c-773a-4b5c-99f9-a75229e4b685	对话-2025/12/12 12:06:52	undefined
03773322-2d1d-4b05-b896-acff03471296	bff2929c-773a-4b5c-99f9-a75229e4b685	对话-2025/12/12 12:14:35	undefined
86b8d631-79a3-42c4-8b9f-2f2aa4a4c6df	bff2929c-773a-4b5c-99f9-a75229e4b685	对话-2025/12/12 12:14:35	undefined
38ae21c9-5520-4e66-b89f-03dd94ca2bb6	bff2929c-773a-4b5c-99f9-a75229e4b685	对话-2025/12/12 12:14:38	undefined

范围：
1. @sker/workflow-ast 定义
2. @sker/workflow-browser 浏览器
3. @sker/workflow-run 服务器
4. @sker/workflow-ui 前端展示

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