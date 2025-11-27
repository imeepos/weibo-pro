import type { Meta, StoryObj } from "@storybook/react"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@sker/ui/components/ui/navigation-menu"

const meta: Meta<typeof NavigationMenu> = {
  title: "@sker/ui/ui/NavigationMenu",
  component: NavigationMenu,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof NavigationMenu>

export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>产品</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[400px] p-4">
              <NavigationMenuLink href="#">产品 A</NavigationMenuLink>
              <NavigationMenuLink href="#">产品 B</NavigationMenuLink>
              <NavigationMenuLink href="#">产品 C</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
            关于
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}

export const MultipleDropdowns: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>产品</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[300px] p-2">
              <NavigationMenuLink href="#">产品 A</NavigationMenuLink>
              <NavigationMenuLink href="#">产品 B</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>解决方案</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[300px] p-2">
              <NavigationMenuLink href="#">企业版</NavigationMenuLink>
              <NavigationMenuLink href="#">个人版</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
            定价
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}

export const WithDescriptions: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>功能</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[500px] p-2">
              <NavigationMenuLink href="#">
                <div className="font-medium">数据分析</div>
                <div className="text-muted-foreground text-xs">实时数据分析和可视化</div>
              </NavigationMenuLink>
              <NavigationMenuLink href="#">
                <div className="font-medium">团队协作</div>
                <div className="text-muted-foreground text-xs">高效的团队协作工具</div>
              </NavigationMenuLink>
              <NavigationMenuLink href="#">
                <div className="font-medium">安全保障</div>
                <div className="text-muted-foreground text-xs">企业级安全防护</div>
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}

export const WithoutViewport: Story = {
  render: () => (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>菜单</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[200px] p-2">
              <NavigationMenuLink href="#">选项 1</NavigationMenuLink>
              <NavigationMenuLink href="#">选项 2</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}
