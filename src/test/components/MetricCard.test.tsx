import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MetricCard } from '../../renderer/src/components/diagnostic/MetricCard'
import { Cpu } from 'lucide-react'

describe('MetricCard', () => {
  const defaultProps = {
    icon: <Cpu data-testid="cpu-icon" />,
    label: 'CPU',
    value: '85%',
    status: 'success' as const,
  }

  it('renders label and value', () => {
    render(<MetricCard {...defaultProps} />)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders subvalue when provided', () => {
    render(<MetricCard {...defaultProps} subvalue="6 núcleos | 2.4 GHz" />)
    expect(screen.getByText('6 núcleos | 2.4 GHz')).toBeInTheDocument()
  })

  it('does not render subvalue when null', () => {
    render(<MetricCard {...defaultProps} />)
    expect(screen.queryByText('6 núcleos')).not.toBeInTheDocument()
  })

  it('renders icon', () => {
    render(<MetricCard {...defaultProps} />)
    expect(screen.getByTestId('cpu-icon')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<MetricCard {...defaultProps} onClick={handleClick} />)
    await userEvent.click(screen.getByText('CPU').closest('div')!)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with warning status', () => {
    render(<MetricCard {...defaultProps} status="warning" value="75°C" label="Temperature" />)
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('75°C')).toBeInTheDocument()
  })

  it('renders with danger status', () => {
    render(<MetricCard {...defaultProps} status="danger" value="95°C" label="Temperature" />)
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('95°C')).toBeInTheDocument()
  })
})
