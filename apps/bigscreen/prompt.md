

## 需求

apps\bigscreen\src\pages\LlmManagement.tsx

1. 提供商管理，添加重置健康分功能按钮，点击后重置到 1000 健康分
2. 现在这个页面比较空旷，可以讲三个tab 展示到一个页面中，左侧 提供商、中间模型、右侧绑定关系
3. 检查分页功能是否正常


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