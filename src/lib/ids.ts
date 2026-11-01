/** IDs are identifiers, not security tokens. The fallback also works on a phone over LAN HTTP. */
export function newId(prefix = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return prefix + crypto.randomUUID()
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return prefix + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
