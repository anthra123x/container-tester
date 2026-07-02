import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultBadge } from '../../renderer/src/components/diagnostic/ResultBadge'

describe('ResultBadge', () => {
  it('renders APROBADO for PASS status', () => {
    render(<ResultBadge status="PASS" />)
    expect(screen.getByText('APROBADO')).toBeInTheDocument()
  })

  it('renders FALLÓ for FAIL status', () => {
    render(<ResultBadge status="FAIL" />)
    expect(screen.getByText('FALLÓ')).toBeInTheDocument()
  })

  it('renders OBSERVACIÓN for WARN status', () => {
    render(<ResultBadge status="WARN" />)
    expect(screen.getByText('OBSERVACIÓN')).toBeInTheDocument()
  })

  it('renders PENDIENTE for PENDING status', () => {
    render(<ResultBadge status="PENDING" />)
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument()
  })

  it('renders EJECUTANDO for RUNNING status', () => {
    render(<ResultBadge status="RUNNING" />)
    expect(screen.getByText('EJECUTANDO')).toBeInTheDocument()
  })

  it('renders SALTADO for SKIP status', () => {
    render(<ResultBadge status="SKIP" />)
    expect(screen.getByText('SALTADO')).toBeInTheDocument()
  })

  it('shows spinner for RUNNING status', () => {
    render(<ResultBadge status="RUNNING" />)
    expect(screen.getByText('EJECUTANDO').querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('applies sm size class', () => {
    render(<ResultBadge status="PASS" size="sm" />)
    const badge = screen.getByText('APROBADO')
    expect(badge.className).toContain('text-xs')
  })

  it('applies lg size class', () => {
    render(<ResultBadge status="PASS" size="lg" />)
    const badge = screen.getByText('APROBADO')
    expect(badge.className).toContain('text-base')
  })
})
