import type { Meta, StoryObj } from "@storybook/react"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@sker/ui/components/ui/table"

const meta: Meta<typeof Table> = {
  title: "@sker/ui/ui/Table",
  component: Table,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Table>

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>姓名</TableHead>
          <TableHead>职位</TableHead>
          <TableHead>邮箱</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>张三</TableCell>
          <TableCell>工程师</TableCell>
          <TableCell>zhangsan@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>李四</TableCell>
          <TableCell>设计师</TableCell>
          <TableCell>lisi@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>王五</TableCell>
          <TableCell>产品经理</TableCell>
          <TableCell>wangwu@example.com</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>员工列表</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>姓名</TableHead>
          <TableHead>部门</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>张三</TableCell>
          <TableCell>技术部</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>李四</TableCell>
          <TableCell>设计部</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>项目</TableHead>
          <TableHead className="text-right">金额</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>项目 A</TableCell>
          <TableCell className="text-right">¥1,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>项目 B</TableCell>
          <TableCell className="text-right">¥2,000</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>总计</TableCell>
          <TableCell className="text-right">¥3,000</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}
