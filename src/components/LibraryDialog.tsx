import { useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Download, FileUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { downloadJson } from '../lib/files'
import { useT } from '../i18n'
import { formatDuration, importProgram, localizeProgram, MAX_CUSTOM_PROGRAMS, NORWEGIAN_PROGRAM, totalSeconds, type Program } from '../lib/programs'
import { Modal } from './Modal'

export function LibraryDialog({ programs, selectedId, busy, onSelect, onEdit, onImport, onDelete, onClose }: {
  programs: Program[]
  selectedId: string
  busy: boolean
  onSelect: (program: Program) => void
  onEdit: (program: Program | null) => void
  onImport: (program: Program) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const all = useT()
  const text = all.library
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const atLimit = programs.length >= MAX_CUSTOM_PROGRAMS
  return <Modal title={text.title} subtitle={text.subtitle} onClose={onClose} wide>
    {busy && <p className="inline-notice">{text.busy}</p>}
    <div className="library-tools"><button className="primary-button" onClick={() => onEdit(null)} disabled={busy || atLimit}><Plus size={17} />{text.create}</button><button className="secondary-button" onClick={() => fileInput.current?.click()} disabled={busy || atLimit || importing}><FileUp size={17} />{importing ? text.reading : text.import}</button></div>
    <input ref={fileInput} className="sr-only" type="file" tabIndex={-1} accept=".json,application/json" aria-label={text.fileLabel} disabled={busy || atLimit || importing} onChange={async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      setError(''); setNotice(''); setImporting(true)
      try {
        if (file.size > 100_000) throw new Error(all.errors.fileSize)
        const program = importProgram(await file.text())
        onImport(program)
        setNotice(text.imported(program.name))
      } catch (cause) { setError(cause instanceof Error ? cause.message : text.readError) }
      finally { setImporting(false) }
    }} />
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    <div className="library-list">{[localizeProgram(NORWEGIAN_PROGRAM), ...programs].map((program) => {
      const builtin = program.id === NORWEGIAN_PROGRAM.id
      return <article className={`library-item ${selectedId === program.id ? 'selected' : ''}`} key={program.id}>
        <button className="library-select" onClick={() => onSelect(program)} disabled={busy} aria-label={text.select(program.name)}><span className={`library-symbol ${builtin ? '' : 'custom'}`}>{builtin ? '4×4' : 'MY'}</span><span><small>{builtin ? text.builtIn : text.mine}</small><strong>{program.name}</strong><span>{formatDuration(totalSeconds(program))} · {text.stepCount(program.steps.length)}</span></span>{selectedId === program.id ? <Check size={19} /> : <ArrowRight size={18} />}</button>
        {program.description && <p className="library-description">{program.description}</p>}
        <div className="library-item-actions"><button className="text-button" disabled={busy || (builtin && atLimit)} onClick={() => onEdit(program)}>{builtin ? <Copy size={14} /> : <Pencil size={14} />}{builtin ? text.copyEdit : text.edit}</button><button className="text-button" onClick={() => downloadJson(program, `four-by-four-${program.id}.json`)} aria-label={text.exportLabel(program.name)}><Download size={14} />{text.export}</button>{!builtin && <button className="icon-button delete-program" disabled={busy} onClick={() => setDeleteId(program.id)} aria-label={text.deleteLabel(program.name)}><Trash2 size={16} /></button>}</div>
        {deleteId === program.id && <div className="inline-confirm" role="alert"><p>{text.deleteConfirm(program.name)}</p><div><button className="secondary-button" onClick={() => setDeleteId(null)}>{text.cancel}</button><button className="danger-button" onClick={() => { onDelete(program.id); setDeleteId(null) }}>{text.deleteAction}</button></div></div>}
      </article>
    })}</div>
    <p className="notice-small">{text.notice(programs.length, MAX_CUSTOM_PROGRAMS)}</p>
  </Modal>
}
