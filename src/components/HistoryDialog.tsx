import { useState } from 'react'
import { Check, Download, Footprints, History, Trash2 } from 'lucide-react'
import { formatDuration } from '../lib/programs'
import { downloadJson } from '../lib/files'
import type { WorkoutRecord } from '../lib/timer'
import { Modal } from './Modal'

export function HistoryDialog({ history, onClear, onClose }: { history: WorkoutRecord[]; onClear: () => void; onClose: () => void }) {
  const [confirmClear, setConfirmClear] = useState(false)
  return (
    <Modal title="차곡차곡, 나의 움직임" subtitle="최근 100개 기록 · 이 브라우저에만 보관돼요." onClose={onClose}>
      {history.length === 0 ? <div className="empty-state"><span><Footprints size={32} /></span><h3>첫 번째 움직임을 기다려요.</h3><p>프로그램을 끝내면 여기에 기록할게요.<br />건너뛴 구간이 있으면 ‘일부 진행’으로 남아요.</p></div> : <>
        <div className="history-summary"><div><strong>{history.filter((record) => record.skippedStages === 0).length}<small>회</small></strong><span>전체 구간 완료</span></div><div><strong>{Math.floor(history.reduce((sum, record) => sum + record.activeSeconds, 0) / 60)}<small>분</small></strong><span>실제 진행 시간</span></div></div>
        <ul className="history-list" tabIndex={0} aria-label="운동 기록 목록">{history.map((record) => <li key={record.id}><span className={`history-icon ${record.skippedStages ? 'partial' : ''}`}>{record.skippedStages ? <History size={19} /> : <Check size={19} />}</span><div><strong>{record.programName}</strong><span>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(record.finishedAt)}</span></div><div className="record-meta"><strong>{formatDuration(record.activeSeconds)}</strong><span>{record.skippedStages ? `일부 진행 · ${record.skippedStages}구간 건너뜀` : '전체 완료'}</span></div></li>)}</ul>
        <div className="history-actions"><button className="secondary-button" onClick={() => downloadJson({ version: 1, history }, 'four-by-four-history.json')}><Download size={16} />기록 내보내기</button><button className="text-button danger" onClick={() => setConfirmClear(true)}><Trash2 size={15} />모두 삭제</button></div>
        {confirmClear && <div className="inline-confirm" role="alert"><p>모든 운동 기록을 삭제할까요? 되돌릴 수 없어요.</p><div><button className="secondary-button" onClick={() => setConfirmClear(false)}>취소</button><button className="danger-button" onClick={() => { onClear(); setConfirmClear(false) }}>기록 삭제</button></div></div>}
      </>}
      <p className="notice-small">기록은 기기 간 자동 동기화되지 않아요. 브라우저 데이터를 지우면 사라집니다. 내보낸 기록은 JSON 보관용이며, 기록 가져오기는 아직 지원하지 않아요.</p>
    </Modal>
  )
}
