import { useState } from 'react'
import { Heart, Monitor, Paintbrush, Volume2 } from 'lucide-react'
import { heartRateRange, maximumHeartRate, parseProfile, type FillStyle, type Preferences } from '../lib/storage'
import { Modal } from './Modal'

export function SettingsDialog({ preferences, onSave, onClose }: { preferences: Preferences; onSave: (value: Preferences) => void; onClose: () => void }) {
  const [method, setMethod] = useState<'age' | 'manual'>(preferences.profile?.method ?? 'age')
  const [age, setAge] = useState(preferences.profile?.method === 'age' ? String(preferences.profile.value) : '')
  const [manual, setManual] = useState(preferences.profile?.method === 'manual' ? String(preferences.profile.value) : '')
  const [sound, setSound] = useState(preferences.sound)
  const [keepAwake, setKeepAwake] = useState(preferences.keepAwake)
  const [fill, setFill] = useState<FillStyle>(preferences.fill)
  const [error, setError] = useState('')
  const input = method === 'age' ? age : manual
  const profile = input.trim() ? parseProfile({ method, value: Number(input) }) : null
  const target = profile ? heartRateRange(profile, { min: 85, max: 95 }) : null
  return (
    <Modal title="내 페이스에 맞게" subtitle="개인 설정은 이 브라우저에만 저장돼요." onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault()
        if (input.trim() && !profile) { setError(method === 'age' ? '18~100세 사이의 나이를 정수로 입력해 주세요.' : '최대 심박수를 80~240 bpm 사이의 정수로 입력해 주세요.'); return }
        onSave({ profile, sound, keepAwake, fill })
      }}>
        <h3 className="form-section-title"><Heart size={17} /> 심박수 목표 설정</h3>
        <div className="segmented-control"><button type="button" aria-pressed={method === 'age'} className={method === 'age' ? 'selected' : ''} onClick={() => { setMethod('age'); setError('') }}>나이로 추정</button><button type="button" aria-pressed={method === 'manual'} className={method === 'manual' ? 'selected' : ''} onClick={() => { setMethod('manual'); setError('') }}>최대 심박수 직접 입력</button></div>
        <label className="field-label" htmlFor="heart-value">{method === 'age' ? '나이 (만)' : '최대 심박수 · 현재 심박수가 아니에요'}</label>
        <div className="input-with-unit"><input id="heart-value" type="number" inputMode="numeric" min={method === 'age' ? 18 : 80} max={method === 'age' ? 100 : 240} step="1" value={input} placeholder={method === 'age' ? '예: 40' : '예: 185'} aria-invalid={Boolean(error)} aria-describedby="heart-input-help" onChange={(event) => { (method === 'age' ? setAge : setManual)(event.target.value); setError('') }} /><span>{method === 'age' ? '세' : 'bpm'}</span></div>
        <p id="heart-input-help" className="field-help">{method === 'age' ? '성인용 추정식: 208 − (0.7 × 나이). 실제 최대 심박수와 차이가 날 수 있어요.' : '검사 등으로 확인한 최대 심박수가 있다면 입력하세요. 최대 강도 자가 검사를 권하는 기능은 아니에요.'}</p>
        {profile && target && <div className="heart-preview"><span>{method === 'age' ? '예상 ' : ''}최대 심박수 <strong>{maximumHeartRate(profile)} bpm</strong></span><span>4×4 고강도 목표 · 85–95%</span><strong className="preview-value">{target.min}–{target.max} <small>bpm</small></strong></div>}
        {preferences.profile && <button type="button" className="text-button clear-profile" onClick={() => { setAge(''); setManual(''); setError('') }}>심박수 설정 비우기</button>}
        <h3 className="form-section-title"><Paintbrush size={17} /> 진행 색 채우기</h3>
        <div className="segmented-control">{([['sweep', '왼쪽에서 오른쪽으로'], ['circle', '가운데서 퍼지는 원']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={fill === value} className={fill === value ? 'selected' : ''} onClick={() => setFill(value)}>{label}</button>)}</div>
        <p className="field-help">구간이 지날수록 화면이 진한 색으로 차올라요.</p>
        <div className="settings-toggles">
          <label className="toggle-row"><span><Volume2 size={18} /><span><strong>구간 전환 알림음</strong><small>화면이 열려 있을 때 짧은 소리로 안내</small></span></span><input type="checkbox" role="switch" checked={sound} onChange={(event) => setSound(event.target.checked)} /><i className="switch-ui" aria-hidden="true" /></label>
          <label className="toggle-row"><span><Monitor size={18} /><span><strong>운동 중 화면 켜두기</strong><small>지원하는 브라우저에서 자동 잠금 방지</small></span></span><input type="checkbox" role="switch" checked={keepAwake} onChange={(event) => setKeepAwake(event.target.checked)} /><i className="switch-ui" aria-hidden="true" /></label>
        </div>
        <p className="notice-small">이 앱은 심박수를 측정하거나 워치에 연결하지 않아요. 질환·복용 약물에 따라 목표가 달라질 수 있으니 필요한 경우 의료진의 안내를 따르세요.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button full-width" type="submit">설정 저장</button>
      </form>
    </Modal>
  )
}
