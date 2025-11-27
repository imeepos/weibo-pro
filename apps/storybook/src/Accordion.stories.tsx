import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@sker/ui/components/ui/accordion'

const meta = {
  title: '@sker/ui/ui/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<ReactRenderer>

export const Single: Story = {
  args: {},
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>什么是依赖注入？</AccordionTrigger>
        <AccordionContent>
          依赖注入是一种设计模式，通过外部提供对象所需的依赖项，而不是在对象内部创建它们。
          这种模式提高了代码的可测试性和可维护性。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>什么是工作流引擎？</AccordionTrigger>
        <AccordionContent>
          工作流引擎是一个用于编排和执行工作流的系统。
          它通过定义节点和边来构建有向无环图（DAG），并按照依赖关系执行任务。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>如何优化性能？</AccordionTrigger>
        <AccordionContent>
          性能优化需要从多个方面入手：算法优化、缓存策略、数据库查询优化、
          并发处理等。关键是找到系统的瓶颈，针对性地进行优化。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  args: {},
  render: () => (
    <Accordion type="multiple" className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>前端技术栈</AccordionTrigger>
        <AccordionContent>
          本项目使用 React + TypeScript + Vite 作为前端技术栈，
          采用 Tailwind CSS 进行样式管理，使用 Shadcn/ui 组件库。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>后端技术栈</AccordionTrigger>
        <AccordionContent>
          后端使用 NestJS 框架，配合 TypeORM 进行数据库操作，
          使用 PostgreSQL 作为主数据库，Redis 作为缓存层，RabbitMQ 处理消息队列。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>基础设施</AccordionTrigger>
        <AccordionContent>
          项目使用 Turborepo 进行 Monorepo 管理，Docker Compose 编排服务，
          GitHub Actions 实现 CI/CD 流程。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const DefaultOpen: Story = {
  args: {},
  render: () => (
    <Accordion type="single" defaultValue="item-2" collapsible className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>项目简介</AccordionTrigger>
        <AccordionContent>
          Weibo-Pro 是一个微博舆情分析平台，提供数据采集、处理和可视化功能。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>核心功能（默认展开）</AccordionTrigger>
        <AccordionContent>
          平台核心功能包括：微博数据采集、NLP 情感分析、舆情事件生成、
          可视化工作流编辑器、大屏数据展示等。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>技术架构</AccordionTrigger>
        <AccordionContent>
          采用数据采集-处理-展示三层架构，基于 Turborepo 的 Monorepo 项目结构。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const WithRichContent: Story = {
  args: {},
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>安装依赖</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <p>使用 pnpm 安装项目依赖：</p>
            <pre className="rounded bg-gray-100 p-2 text-xs">
              <code>pnpm install</code>
            </pre>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>启动开发服务器</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <p>推荐使用 dev:robust 命令确保依赖已构建：</p>
            <pre className="rounded bg-gray-100 p-2 text-xs">
              <code>pnpm dev:robust</code>
            </pre>
            <p className="text-xs text-gray-600">
              该命令会自动检查并构建所有依赖包后启动应用
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>构建生产版本</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <p>构建所有应用和包：</p>
            <pre className="rounded bg-gray-100 p-2 text-xs">
              <code>pnpm build</code>
            </pre>
            <p>强制重新构建（不使用缓存）：</p>
            <pre className="rounded bg-gray-100 p-2 text-xs">
              <code>pnpm build:force</code>
            </pre>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const FAQ: Story = {
  args: {},
  render: () => (
    <Accordion type="single" collapsible className="w-[600px]">
      <AccordionItem value="q1">
        <AccordionTrigger>如何添加新的工作流节点？</AccordionTrigger>
        <AccordionContent>
          添加新节点需要三个步骤：
          <ol className="mt-2 ml-4 list-decimal space-y-1">
            <li>在 packages/workflow-ast/src/ 定义 AST 类（继承 Ast）</li>
            <li>在 packages/workflow-run/src/ 实现 Visitor（用 @Handler 装饰）</li>
            <li>在 packages/workflow-ui/src/ 实现 Renderer（用 @Render 装饰）</li>
          </ol>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="q2">
        <AccordionTrigger>双容器模式是什么？</AccordionTrigger>
        <AccordionContent>
          项目采用 @sker/core 全局单例容器 + NestJS 容器的双容器架构。
          NestJS 容器作为 HTTP 层 facade，实际业务服务由 @sker/core 根注入器管理，
          实现了依赖注入的统一化和服务的全局可访问性。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="q3">
        <AccordionTrigger>如何调试工作流执行？</AccordionTrigger>
        <AccordionContent>
          工作流执行器提供了完整的日志输出，可以在控制台看到：
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>节点执行顺序和批次信息</li>
            <li>数据流传递过程</li>
            <li>错误堆栈和重试状态</li>
          </ul>
          同时支持在 WorkflowRunEntity 中查看执行历史和结果。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="q4">
        <AccordionTrigger>Agent 只能使用数据库数据吗？</AccordionTrigger>
        <AccordionContent>
          是的，Agent 系统被设计为只使用数据库中已有的数据进行分析。
          这是为了确保分析结果的可追溯性和一致性。
          所有的微博数据都需要先通过工作流采集并存储到数据库，
          然后 Agent 才能基于这些数据生成舆情报告。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Nested: Story = {
  args: {},
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>一级分类</AccordionTrigger>
        <AccordionContent>
          <Accordion type="single" collapsible className="border-l-2 pl-4">
            <AccordionItem value="sub-1">
              <AccordionTrigger>二级分类 A</AccordionTrigger>
              <AccordionContent>这是二级分类 A 的内容</AccordionContent>
            </AccordionItem>
            <AccordionItem value="sub-2">
              <AccordionTrigger>二级分类 B</AccordionTrigger>
              <AccordionContent>这是二级分类 B 的内容</AccordionContent>
            </AccordionItem>
          </Accordion>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>另一个一级分类</AccordionTrigger>
        <AccordionContent>普通内容，没有嵌套</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Minimal: Story = {
  args: {},
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>简单问题</AccordionTrigger>
        <AccordionContent>简单答案</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
