import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIndicator } from '../../renderer/src/components/shared/StatusIndicator'

describe('StatusIndicator', () => {
  it('renders label', () => {
    render(<StatusIndicator status="success" label="Running" />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('renders success dot', () => {
    const { container } = render(<StatusIndicator status="success" label="OK" />)
    const dot = container.querySelector('span.rounded-full')
    expect(dot?.className).toContain('bg-success')
  })

  it('renders warning dot', () => {
    const { container } = render(<StatusIndicator status="warning" label="Warning" />)
    const dot = container.querySelector('span.rounded-full')
    expect(dot?.className).toContain('bg-warning')
  })

  it('renders danger dot', () => {
    const { container } = render(<StatusIndicator status="danger" label="Error" />)
    const dot = container.querySelector('span.rounded-full')
    expect(dot?.className).toContain('bg-danger')
  })

  it('renders inactive dot', () => {
    const { container } = render(<StatusIndicator status="inactive" label="Off" />)
    const dot = container.querySelector('span.rounded-full')
    expect(dot?.className).toContain('bg-neutral-200')
  })
})
