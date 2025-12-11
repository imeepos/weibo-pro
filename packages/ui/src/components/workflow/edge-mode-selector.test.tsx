import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EdgeModeSelector, type EdgeModeOption } from './edge-mode-selector'
import { EdgeMode } from './types'

const mockOptions: EdgeModeOption[] = [
  {
    key: EdgeMode.MERGE,
    icon: '⚡',
    label: 'Merge Mode',
    description: 'Immediate trigger',
    scenario: 'Concurrent operations',
  },
  {
    key: EdgeMode.ZIP,
    icon: '🔗',
    label: 'Zip Mode',
    description: 'Paired execution',
    scenario: 'Synchronized arrays',
  },
  {
    key: EdgeMode.COMBINE_LATEST,
    icon: '🔄',
    label: 'Combine Latest',
    description: 'Use latest values',
    scenario: 'Multi-input aggregation',
  },
  {
    key: EdgeMode.WITH_LATEST_FROM,
    icon: '🎯',
    label: 'With Latest From',
    description: 'Primary-secondary flow',
    scenario: 'Master-slave dependency',
  },
]

describe('EdgeModeSelector Component', () => {
  it('should render mode selector with all options', () => {
    const onChange = vi.fn()
    render(
      <EdgeModeSelector
        value={EdgeMode.MERGE}
        options={mockOptions}
        onChange={onChange}
      />
    )

    expect(screen.getByText('模式选择')).toBeInTheDocument()
    mockOptions.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument()
      expect(screen.getByText(option.description)).toBeInTheDocument()
    })
  })

  it('should highlight selected option', () => {
    const onChange = vi.fn()
    const { container } = render(
      <EdgeModeSelector
        value={EdgeMode.ZIP}
        options={mockOptions}
        onChange={onChange}
      />
    )

    // Radix RadioGroup 使用 button[role="radio"] 而非 input[type="radio"]
    const radioButtons = container.querySelectorAll('button[role="radio"]')
    expect(radioButtons[1]).toHaveAttribute('data-state', 'checked')
  })

  it('should call onChange when selecting different mode', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <EdgeModeSelector
        value={EdgeMode.MERGE}
        options={mockOptions}
        onChange={onChange}
      />
    )

    // Radix RadioGroup 使用 button[role="radio"]
    const radioButtons = container.querySelectorAll('button[role="radio"]')
    await user.click(radioButtons[1]) // ZIP is at index 1

    expect(onChange).toHaveBeenCalledWith(EdgeMode.ZIP)
  })

  it('should render icons for each option', () => {
    const onChange = vi.fn()
    render(
      <EdgeModeSelector
        value={EdgeMode.MERGE}
        options={mockOptions}
        onChange={onChange}
      />
    )

    mockOptions.forEach((option) => {
      expect(screen.getByText(option.icon)).toBeInTheDocument()
    })
  })

  it('should render scenario text for each option', () => {
    const onChange = vi.fn()
    render(
      <EdgeModeSelector
        value={EdgeMode.MERGE}
        options={mockOptions}
        onChange={onChange}
      />
    )

    mockOptions.forEach((option) => {
      expect(screen.getByText(`适用：${option.scenario}`)).toBeInTheDocument()
    })
  })

  it('should handle value changes from prop updates', () => {
    const onChange = vi.fn()
    const { rerender, container } = render(
      <EdgeModeSelector
        value={EdgeMode.MERGE}
        options={mockOptions}
        onChange={onChange}
      />
    )

    // Radix RadioGroup 使用 button[role="radio"]
    const radioButtons = container.querySelectorAll('button[role="radio"]')
    expect(radioButtons[0]).toHaveAttribute('data-state', 'checked')

    rerender(
      <EdgeModeSelector
        value={EdgeMode.COMBINE_LATEST}
        options={mockOptions}
        onChange={onChange}
      />
    )

    const updatedRadioButtons = container.querySelectorAll('button[role="radio"]')
    expect(updatedRadioButtons[2]).toHaveAttribute('data-state', 'checked')
  })

  it('should work with empty options', () => {
    const onChange = vi.fn()
    render(
      <EdgeModeSelector
        value={EdgeMode.MERGE}
        options={[]}
        onChange={onChange}
      />
    )

    expect(screen.getByText('模式选择')).toBeInTheDocument()
  })
})
