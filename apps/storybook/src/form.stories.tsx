import type { Meta, StoryObj } from "@storybook/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@sker/ui/components/ui/form"
import { Input } from "@sker/ui/components/ui/input"
import { Button } from "@sker/ui/components/ui/button"
import { Textarea } from "@sker/ui/components/ui/textarea"

const meta: Meta = {
  title: "UI/Form",
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

const formSchema = z.object({
  username: z.string().min(2, "用户名至少2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
})

export const Default: Story = {
  render: () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: { username: "", email: "" },
    })

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})} className="space-y-4 w-[400px]">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input placeholder="请输入用户名" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input placeholder="请输入邮箱" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">提交</Button>
        </form>
      </Form>
    )
  },
}

export const WithDescription: Story = {
  render: () => {
    const form = useForm({
      defaultValues: { bio: "" },
    })

    return (
      <Form {...form}>
        <form className="space-y-4 w-[400px]">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>个人简介</FormLabel>
                <FormControl>
                  <Textarea placeholder="介绍一下自己" {...field} />
                </FormControl>
                <FormDescription>最多200个字符</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    )
  },
}

const multiFieldSchema = z.object({
  firstName: z.string().min(1, "必填"),
  lastName: z.string().min(1, "必填"),
  age: z.string().min(1, "必填"),
})

export const MultipleFields: Story = {
  render: () => {
    const form = useForm<z.infer<typeof multiFieldSchema>>({
      resolver: zodResolver(multiFieldSchema),
      defaultValues: { firstName: "", lastName: "", age: "" },
    })

    return (
      <Form {...form}>
        <form className="space-y-4 w-[400px]">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>姓</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>年龄</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">提交</Button>
        </form>
      </Form>
    )
  },
}
