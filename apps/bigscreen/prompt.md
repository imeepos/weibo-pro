## 需求

参考：packages\workflow-ast\src\PersonaAst.ts

创建一个 packages\entities\src\prompt-role.entity.ts 的节点

功能要求：

1. 提供： skill tools 工具，查询当前角色可用的skill，附加到上下文 {id: string;
  title: string;
  type: PromptSkillType;
  description: string | null;
}[]
2. 大模型 根据具体场景 选择合适的skill 并获取相关的skill，批量操作
3. 多轮调用 function call

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