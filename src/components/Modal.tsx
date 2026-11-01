import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({ title, subtitle, onClose, children, wide = false }: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return createPortal(
    <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="modal-inner">
        <header className="modal-heading">
          <div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-button subtle" aria-label="닫기" onClick={onClose}><X size={21} /></button>
        </header>
        {children}
      </div>
    </dialog>, document.body,
  )
}
