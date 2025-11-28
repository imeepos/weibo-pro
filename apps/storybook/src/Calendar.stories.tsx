import type { Meta, StoryObj } from '@storybook/react'
import { Calendar } from '@sker/ui/components/ui/calendar'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    return <Calendar mode="single" selected={selected} onSelect={setSelected} />
  },
}

export const WithDropdown: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        captionLayout="dropdown"
      />
    )
  },
}

export const Multiple: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date[]>([])
    return (
      <Calendar
        mode="multiple"
        selected={selected}
        onSelect={(dates) => setSelected(dates || [])}
        required={false}
      />
    )
  },
}

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange>()
    return <Calendar mode="range" selected={range} onSelect={setRange} />
  },
}

export const WithDisabledDates: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    const disabledDays = [
      { from: new Date(2024, 0, 1), to: new Date(2024, 0, 5) },
      new Date(2024, 0, 15),
    ]
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        disabled={disabledDays}
      />
    )
  },
}

export const WithWeekNumbers: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        showWeekNumber
      />
    )
  },
}

export const MultipleMonths: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        numberOfMonths={2}
      />
    )
  },
}

export const WithoutOutsideDays: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        showOutsideDays={false}
      />
    )
  },
}

export const WithDefaultMonth: Story = {
  render: () => {
    const [selected, setSelected] = useState<Date>()
    return (
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={new Date(2024, 5)}
      />
    )
  },
}
