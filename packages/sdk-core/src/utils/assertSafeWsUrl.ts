import { ValidationError } from '../errors'

const BLOCKED_TLDS = /\.(local|internal|home|lan|intranet)$/i

const PRIVATE_IPV4_PATTERNS = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
]

const isPrivateIpv6 = (host: string): boolean => {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    h === '::' ||
    h === '::1' ||
    h.startsWith('fc') ||
    h.startsWith('fd') ||
    /^fe[89ab]/.test(h)
  )
}

/**
 * Validates a user-provided WebSocket endpoint before it is handed to the
 * API factory. Blocks non-wss endpoints, embedded credentials and internal
 * network targets (loopback, RFC1918/CGNAT ranges, link-local, IPv6 ULA /
 * link-local, and common internal hostnames). In development mode ws:// and
 * localhost are allowed so local nodes keep working.
 */
export const assertSafeWsUrl = (url: string, development = false): void => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ValidationError(`Invalid WebSocket endpoint: ${url}`)
  }

  if (parsed.username || parsed.password) {
    throw new ValidationError('WebSocket endpoint must not contain credentials')
  }

  if (development) return

  if (parsed.protocol !== 'wss:') {
    throw new ValidationError(`WebSocket endpoint must use wss://, received: ${url}`)
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '')

  if (host === 'localhost' || BLOCKED_TLDS.test(host)) {
    throw new ValidationError(`WebSocket endpoint must not target internal hosts: ${host}`)
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (PRIVATE_IPV4_PATTERNS.some((p) => p.test(host))) {
      throw new ValidationError(`WebSocket endpoint must not target private IP ranges: ${host}`)
    }
  } else if (host.includes(':') && isPrivateIpv6(host)) {
    throw new ValidationError(`WebSocket endpoint must not target private IP ranges: ${host}`)
  }
}
