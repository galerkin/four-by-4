import { useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Download, FileUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { downloadJson } from '../lib/files'
import { formatDuration, importProgram, MAX_CUSTOM_PROGRAMS, NORWEGIAN_PROGRAM, totalSeconds, type Program } from '../lib/programs'
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
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const atLimit = programs.length >= MAX_CUSTOM_PROGRAMS
  return <Modal title="오늘은 어떤 움직임을 할까요?" subtitle="만들어 두고, 필요할 때 실행하세요." onClose={onClose} wide>
    {busy && <p className="inline-notice">운동은 계속 진행 중이에요. 프로그램 변경·편집은 현재 운동을 끝내거나 초기화한 뒤 할 수 있어요.</p>}
    <div className="library-tools"><button className="primary-button" onClick={() => onEdit(null)} disabled={busy || atLimit}><Plus size={17} />새 프로그램</button><button className="secondary-button" onClick={() => fileInput.current?.click()} disabled={busy || atLimit || importing}><FileUp size={17} />{importing ? '읽는 중…' : '파일 가져오기'}</button></div>
    <input ref={fileInput} className="sr-only" type="file" tabIndex={-1} accept=".json,application/json" aria-label="프로그램 JSON 파일" disabled={busy || atLimit || importing} onChange={async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      setError(''); setNotice(''); setImporting(true)
      try {
        if (file.size > 100_000) throw new Error('프로그램 파일은 100KB 이하만 가져올 수 있어요.')
        const program = importProgram(await file.text())
        onImport(program)
        setNotice(`‘${program.name}’을 가져왔어요. 아래에서 선택해 주세요.`)
      } catch (cause) { setError(cause instanceof Error ? cause.message : '파일을 읽지 못했어요. 다시 선택해 주세요.') }
      finally { setImporting(false) }
    }} />
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    <div className="library-list">{[NORWEGIAN_PROGRAM, ...programs].map((program) => {
      const builtin = program.id === NORWEGIAN_PROGRAM.id
      return <article className={`library-item ${selectedId === program.id ? 'selected' : ''}`} key={program.id}>
        <button className="library-select" onClick={() => onSelect(program)} disabled={busy} aria-label={`${program.name} 선택`}><span className={`library-symbol ${builtin ? '' : 'custom'}`}>{builtin ? '4×4' : 'MY'}</span><span><small>{builtin ? '기본 프로그램' : '내 프로그램'}</small><strong>{program.name}</strong><span>{formatDuration(totalSeconds(program))} · {program.steps.length}개 구간</span></span>{selectedId === program.id ? <Check size={19} /> : <ArrowRight size={18} />}</button>
        {program.description && <p className="library-description">{program.description}</p>}
        <div className="library-item-actions"><button className="text-button" disabled={busy || (builtin && atLimit)} onClick={() => onEdit(program)}>{builtin ? <Copy size={14} /> : <Pencil size={14} />}{builtin ? '복사해서 수정' : '수정'}</button><button className="text-button" onClick={() => downloadJson(program, `four-by-four-${program.id}.json`)} aria-label={`${program.name} 내보내기`}><Download size={14} />내보내기</button>{!builtin && <button className="icon-button delete-program" disabled={busy} onClick={() => setDeleteId(program.id)} aria-label={`${program.name} 삭제`}><Trash2 size={16} /></button>}</div>
        {deleteId === program.id && <div className="inline-confirm" role="alert"><p>‘{program.name}’을 삭제할까요? 운동 기록은 유지돼요.</p><div><button className="secondary-button" onClick={() => setDeleteId(null)}>취소</button><button className="danger-button" onClick={() => { onDelete(program.id); setDeleteId(null) }}>프로그램 삭제</button></div></div>}
      </article>
    })}</div>
    <p className="notice-small">내 프로그램 {programs.length}/{MAX_CUSTOM_PROGRAMS}개 · 이 브라우저에 저장돼요. JSON 내보내기·가져오기로 다른 기기에 옮길 수 있어요.</p>
  </Modal>
}
