import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge Component', () => {
  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toBeInTheDocument()
  })

  it('should render with destructive variant', () => {
    render(<Badge variant="destructive">Delete</Badge>)
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should render with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(<Badge className="custom-class">Badge</Badge>)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('custom-class')
  })

  it('should accept additional props', () => {
    render(
      <Badge id="test-badge" title="Test Title">
        Badge
      </Badge>
    )
    const badge = document.getElementById('test-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'Test Title')
  })

  it('should render as span by default', () => {
    const { container } = render(<Badge>Badge</Badge>)
    const badge = container.querySelector('span[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
  })

  it('should support children content', () => {
    render(
      <Badge>
        <span>Child Content</span>
      </Badge>
    )
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })
})
