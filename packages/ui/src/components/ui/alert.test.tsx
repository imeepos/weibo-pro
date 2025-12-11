import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from './alert'

describe('Alert Component', () => {
  it('should render alert with default variant', () => {
    render(<Alert>Alert content</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveAttribute('data-slot', 'alert')
  })

  it('should render alert with destructive variant', () => {
    render(<Alert variant="destructive">Error occurred</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(
      <Alert className="custom-alert">Alert</Alert>
    )
    const alert = container.querySelector('[data-slot="alert"]')
    expect(alert).toHaveClass('custom-alert')
  })

  it('should support additional props', () => {
    render(
      <Alert id="test-alert" title="Test Alert">
        Content
      </Alert>
    )
    const alert = document.getElementById('test-alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveAttribute('title', 'Test Alert')
  })

  describe('AlertTitle', () => {
    it('should render alert title', () => {
      render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
        </Alert>
      )
      expect(screen.getByText('Alert Title')).toBeInTheDocument()
    })

    it('should have correct data-slot attribute', () => {
      const { container } = render(<AlertTitle>Title</AlertTitle>)
      const title = container.querySelector('[data-slot="alert-title"]')
      expect(title).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const { container } = render(
        <AlertTitle className="custom-title">Title</AlertTitle>
      )
      const title = container.querySelector('[data-slot="alert-title"]')
      expect(title).toHaveClass('custom-title')
    })
  })

  describe('AlertDescription', () => {
    it('should render alert description', () => {
      render(
        <Alert>
          <AlertDescription>Alert description</AlertDescription>
        </Alert>
      )
      expect(screen.getByText('Alert description')).toBeInTheDocument()
    })

    it('should have correct data-slot attribute', () => {
      const { container } = render(
        <AlertDescription>Description</AlertDescription>
      )
      const description = container.querySelector('[data-slot="alert-description"]')
      expect(description).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const { container } = render(
        <AlertDescription className="custom-description">
          Description
        </AlertDescription>
      )
      const description = container.querySelector('[data-slot="alert-description"]')
      expect(description).toHaveClass('custom-description')
    })
  })

  describe('Complete Alert', () => {
    it('should render complete alert with title and description', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      )
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })
})
