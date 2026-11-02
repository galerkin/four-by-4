import { useState } from 'react'
import { Check, Download, Footprints, History, Trash2 } from 'lucide-react'
import { useT } from '../i18n'
import { formatDuration, localizeProgram, NORWEGIAN_PROGRAM } from '../lib/programs'
import { downloadJson } from '../lib/files'
import type { WorkoutRecord } from '../lib/timer'
import { Modal } from './Modal'

export function HistoryDialog({ history, onClear, onClose }: { history: WorkoutRecord[]; onClear: () => void; onClose: () => void }) {
  const all = useT()
  const text = all.history
  const [confirmClear, setConfirmClear] = useState(false)
  // Records of the built-in program show its name in the current language.
  const builtInName = localizeProgram(NORWEGIAN_PROGRAM).name
  return (
    <Modal title={text.title} subtitle={text.subtitle} onClose={onClose}>
      {history.length === 0 ? <div className="empty-state"><span><Footprints size={32} /></span><h3>{text.emptyTitle}</h3><p>{text.emptyBody}<br />{text.emptyPartial}</p></div> : <>
        <div className="history-summary"><div><strong>{history.filter((record) => record.skippedStages === 0).length}<small>{text.times}</small></strong><span>{text.completed}</span></div><div><strong>{Math.floor(history.reduce((sum, record) => sum + record.activeSeconds, 0) / 60)}<small>{text.minutes}</small></strong><span>{text.activeTime}</span></div></div>
        <ul className="history-list" tabIndex={0} aria-label={text.list}>{history.map((record) => <li key={record.id}><span className={`history-icon ${record.skippedStages ? 'partial' : ''}`}>{record.skippedStages ? <History size={19} /> : <Check size={19} />}</span><div><strong>{record.programId === NORWEGIAN_PROGRAM.id ? builtInName : record.programName}</strong><span>{new Intl.DateTimeFormat(all.meta.locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(record.finishedAt)}</span></div><div className="record-meta"><strong>{formatDuration(record.activeSeconds)}</strong><span>{record.skippedStages ? text.partial(record.skippedStages) : text.full}</span></div></li>)}</ul>
        <div className="history-actions"><button className="secondary-button" onClick={() => downloadJson({ version: 1, history }, 'four-by-four-history.json')}><Download size={16} />{text.export}</button><button className="text-button danger" onClick={() => setConfirmClear(true)}><Trash2 size={15} />{text.clear}</button></div>
        {confirmClear && <div className="inline-confirm" role="alert"><p>{text.clearConfirm}</p><div><button className="secondary-button" onClick={() => setConfirmClear(false)}>{text.cancel}</button><button className="danger-button" onClick={() => { onClear(); setConfirmClear(false) }}>{text.clearAction}</button></div></div>}
      </>}
      <p className="notice-small">{text.notice}</p>
    </Modal>
  )
}
