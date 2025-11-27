import type { Meta, StoryObj } from '@storybook/react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,

} from '@sker/ui/components/ui/carousel'
import {
  Card,
  CardContent,
} from '@sker/ui/components/ui/card'
const meta = {
  title: 'UI/Carousel',
  component: Carousel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-xs">
      <Carousel>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
}

export const Vertical: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-xs">
      <Carousel orientation="vertical" className="w-full max-w-xs">
        <CarouselContent className="-mt-1 h-[200px]">
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index} className="pt-1 md:basis-1/2">
              <Card>
                <CardContent className="flex items-center justify-center p-6">
                  <span className="text-3xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
}

export const MultipleItems: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-sm">
      <Carousel
        opts={{
          align: 'start',
        }}
        className="w-full max-w-sm"
      >
        <CarouselContent>
          {Array.from({ length: 10 }).map((_, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-3xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
}

export const WithImages: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-md">
      <Carousel className="w-full max-w-md">
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <Card>
                <CardContent className="flex aspect-video items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-6">
                  <div className="text-center text-white">
                    <p className="text-4xl font-bold">{index + 1}</p>
                    <p className="mt-2 text-sm">幻灯片 {index + 1}</p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
}

export const Loop: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-xs">
      <Carousel
        opts={{
          loop: true,
        }}
      >
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
}

export const WithoutNavigation: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-xs">
      <Carousel>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  ),
}

export const ContentCards: Story = {
  args: {},
  render: () => (
    <div className="w-full max-w-xl">
      <Carousel className="w-full max-w-xl">
        <CarouselContent>
          {[
            { title: '产品特性 1', desc: '高性能、可扩展的架构设计' },
            { title: '产品特性 2', desc: '直观易用的用户界面' },
            { title: '产品特性 3', desc: '强大的数据分析能力' },
            { title: '产品特性 4', desc: '7×24 小时技术支持' },
            { title: '产品特性 5', desc: '企业级安全保障' },
          ].map((item, index) => (
            <CarouselItem key={index}>
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-center text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
}
