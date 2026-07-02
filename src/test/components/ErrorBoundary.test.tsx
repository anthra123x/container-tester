import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../../renderer/src/components/shared/ErrorBoundary'

const ErrorThrower = ({ message }: { message: string }) => {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ErrorThrower message="Something broke" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Unexpected Error')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
    expect(screen.getByText('Reload')).toBeInTheDocument()
  })

  it('renders generic message when error has no message', () => {
    render(
      <ErrorBoundary>
        <ErrorThrower message="" />
      </ErrorBoundary>
    )
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
  })
})
