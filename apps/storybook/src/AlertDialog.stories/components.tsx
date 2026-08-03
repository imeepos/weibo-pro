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
import { Trash2, AlertTriangle, FileX, Database } from 'lucide-react'

export const DefaultRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline">打开对话框</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认操作</AlertDialogTitle>
        <AlertDialogDescription>
          此操作无法撤销，请谨慎操作。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction>继续</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const DeleteConfirmationRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">
        <Trash2 className="mr-2 size-4" />
        删除
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          此操作将永久删除该项目，数据无法恢复。您确定要继续吗？
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
)

export const DeleteWorkflowRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="sm">
        <Trash2 className="mr-2 size-4" />
        删除工作流
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          删除工作流
        </AlertDialogTitle>
        <AlertDialogDescription>
          删除工作流"微博舆情采集"后，所有相关的执行记录和配置将被永久删除。
          <br />
          <br />
          已有 23 条执行记录关联此工作流，删除后将无法查看历史数据。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          确认删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const ClearDataRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline">
        <Database className="mr-2 size-4" />
        清空数据
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>清空所有数据</AlertDialogTitle>
        <AlertDialogDescription>
          此操作将清空以下数据：
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>微博帖子数据（1,234 条）</li>
            <li>舆情事件数据（56 条）</li>
            <li>NLP 分析结果（1,180 条）</li>
            <li>工作流执行记录（89 条）</li>
          </ul>
          <br />
          此操作无法撤销，请确认后再继续。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          确认清空
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const StopWorkflowRunRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" size="sm">
        停止执行
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>停止工作流执行</AlertDialogTitle>
        <AlertDialogDescription>
          工作流正在执行中（已完成 3/8 个节点），停止后当前进度将丢失。
          <br />
          <br />
          您确定要停止执行吗？
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>继续执行</AlertDialogCancel>
        <AlertDialogAction>停止</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const DeleteEventRender = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm">
        <FileX className="mr-2 size-4" />
        删除事件
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>删除舆情事件</AlertDialogTitle>
        <AlertDialogDescription>
          确认删除舆情事件"某明星代言争议"？
          <br />
          <br />
          该事件包含 45 条相关微博，删除后将无法恢复。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          删除事件
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
