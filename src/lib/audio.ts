let context: AudioContext | null = null

/** Call from a user gesture; mobile browsers do not permit autoplay audio. */
export function unlockAudio() {
  try {
    const Audio = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return
    context ??= new Audio()
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } catch { /* Audio is a progressive enhancement, never a timer dependency. */ }
}

export function playCue(completed = false) {
  if (!context || context.state !== 'running' || document.visibilityState !== 'visible') return
  try {
    const notes = completed ? [523.25, 659.25, 783.99] : [659.25, 880]
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator()
      const gain = context!.createGain()
      const at = context!.currentTime + index * 0.2
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.16, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.22)
      oscillator.connect(gain)
      gain.connect(context!.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.24)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    })
  } catch { /* Unsupported/suspended audio must not interrupt an exercise. */ }
}
