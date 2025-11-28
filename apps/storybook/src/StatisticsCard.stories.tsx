import type { Meta, StoryObj } from '@storybook/react';
import { StatisticsCard } from '@sker/ui/components/ui/statistics-card';

const meta = {
  title: 'Components/StatisticsCard',
  component: StatisticsCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
  },
} satisfies Meta<typeof StatisticsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    title: '统计',
    items: [
      { label: '总数', value: 1234 },
      { label: '活跃', value: 567 },
      { label: '离线', value: 89 },
    ],
  },
};

export const WithoutTitle: Story = {
  args: {
    items: [
      { label: '用户数', value: 10520 },
      { label: '订单数', value: 3456 },
    ],
  },
};

export const DeviceStatistics: Story = {
  args: {
    title: '设备统计',
    items: [
      { label: '回声设备', value: 45 },
      { label: '家电设备', value: 128 },
      { label: 'IoT设备', value: 89 },
      { label: '云服务', value: 12 },
    ],
  },
};

export const StringValues: Story = {
  args: {
    title: '系统状态',
    items: [
      { label: '状态', value: '运行中' },
      { label: '版本', value: 'v2.1.0' },
      { label: '更新时间', value: '2分钟前' },
    ],
  },
};

export const Positioned: Story = {
  render: () => (
    <div className="relative w-[800px] h-[600px] bg-gray-100 rounded-lg">
      <StatisticsCard
        title="左上"
        position="top-left"
        items={[{ label: '数据', value: 100 }]}
      />
      <StatisticsCard
        title="右上"
        position="top-right"
        items={[{ label: '数据', value: 200 }]}
      />
      <StatisticsCard
        title="左下"
        position="bottom-left"
        items={[{ label: '数据', value: 300 }]}
      />
      <StatisticsCard
        title="右下"
        position="bottom-right"
        items={[{ label: '数据', value: 400 }]}
      />
    </div>
  ),
};
