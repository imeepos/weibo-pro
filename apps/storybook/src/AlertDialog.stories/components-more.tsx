import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@sker/ui/components/ui/alert-dialog'
import { Button } from '@sker/ui/components/ui/button'

export const LongContentRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline">查看详情</Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
      <AlertDialogHeader>
        <AlertDialogTitle>批量删除确认</AlertDialogTitle>
        <AlertDialogDescription>
          您即将删除以下 10 个工作流：
          <ul className="mt-3 ml-4 list-decimal space-y-1 text-sm">
            <li>微博关键词采集工作流</li>
            <li>用户时间线分析工作流</li>
            <li>热搜话题追踪工作流</li>
            <li>舆情事件生成工作流</li>
            <li>情感分析批处理工作流</li>
            <li>关键词提取工作流</li>
            <li>数据清洗工作流</li>
            <li>定时采集任务工作流</li>
            <li>数据导出工作流</li>
            <li>报告生成工作流</li>
          </ul>
          <br />
          这些工作流共有 156 条执行记录，删除后将无法恢复。请确认是否继续。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          批量删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const CustomFooterRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button>保存更改</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>保存更改</AlertDialogTitle>
        <AlertDialogDescription>
          检测到工作流配置已修改，是否保存更改？
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="sm:justify-between">
        <AlertDialogCancel>放弃更改</AlertDialogCancel>
        <div className="flex gap-2">
          <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            保存草稿
          </AlertDialogAction>
          <AlertDialogAction>保存并发布</AlertDialogAction>
        </div>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const NoDescriptionRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline">退出编辑</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认退出编辑器？</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction>确认退出</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const MultipleButtonsRender = () => (
  <div className="flex flex-wrap gap-4">
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          删除工作流
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除确认</AlertDialogTitle>
          <AlertDialogDescription>
            此操作无法撤销，确定要删除吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          清空数据
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空数据</AlertDialogTitle>
          <AlertDialogDescription>
            确定要清空所有历史数据吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">执行工作流</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>开始执行</AlertDialogTitle>
          <AlertDialogDescription>
            即将开始执行工作流，预计耗时 3-5 分钟。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction>开始执行</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)
