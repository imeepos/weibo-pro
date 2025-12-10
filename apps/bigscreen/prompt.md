

## 需求

看一下下面的警告，有没有能处理的，能处理的处理掉

 Issues with peer dependencies found
apps/api
├─┬ @nestjs/core 10.4.20
│ └── ✕ unmet peer @nestjs/websockets@^10.0.0: found 11.1.8
├─┬ @nestjs/platform-socket.io 11.1.8
│ └── ✕ unmet peer @nestjs/common@^11.0.0: found 10.4.20
└─┬ @nestjs/websockets 11.1.8
  ├── ✕ unmet peer @nestjs/common@^11.0.0: found 10.4.20
  └── ✕ unmet peer @nestjs/core@^11.0.0: found 10.4.20

apps/bigscreen
└─┬ eslint-plugin-react-hooks 4.6.2
  └── ✕ unmet peer eslint@"^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0": found 9.39.1

packages/ui
├─┬ @better-auth/passkey 1.4.3
│ ├── ✕ unmet peer @better-auth/core@1.4.3: found 1.4.2 in better-auth
│ └── ✕ unmet peer better-auth@1.4.3: found 1.4.2
├─┬ @better-auth/sso 1.4.3
│ └── ✕ unmet peer better-auth@1.4.3: found 1.4.2
├─┬ @platejs/excalidraw 52.0.1
│ └─┬ @excalidraw/excalidraw 0.18.0
│   └─┬ @radix-ui/react-tabs 1.0.2
│     ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     ├─┬ @radix-ui/react-context 1.0.0
│     │ └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     ├─┬ @radix-ui/react-direction 1.0.0
│     │ └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     ├─┬ @radix-ui/react-id 1.0.0
│     │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     │ └─┬ @radix-ui/react-use-layout-effect 1.0.0
│     │   └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     ├─┬ @radix-ui/react-presence 1.0.0
│     │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     │ ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     │ └─┬ @radix-ui/react-compose-refs 1.0.0
│     │   └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     ├─┬ @radix-ui/react-primitive 1.0.1
│     │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     │ ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     │ └─┬ @radix-ui/react-slot 1.0.1
│     │   └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│     └─┬ @radix-ui/react-roving-focus 1.0.2
│       ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│       ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│       ├─┬ @radix-ui/react-collection 1.0.1
│       │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│       │ └── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│       ├─┬ @radix-ui/react-use-callback-ref 1.0.0
│       │ └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
│       └─┬ @radix-ui/react-use-controllable-state 1.0.0
│         └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.2.0
└─┬ echarts-wordcloud 2.1.0
  └── ✕ unmet peer echarts@^5.0.1: found 6.0.0

Done in 31.5s


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