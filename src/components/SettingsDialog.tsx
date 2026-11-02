import { useState } from 'react'
import { Heart, Languages, Monitor, Paintbrush, Volume2 } from 'lucide-react'
import { useT, type Language } from '../i18n'
import { heartRateRange, maximumHeartRate, parseProfile, type FillStyle, type Preferences } from '../lib/storage'
import { Modal } from './Modal'

export function SettingsDialog({ preferences, onSave, onClose }: { preferences: Preferences; onSave: (value: Preferences) => void; onClose: () => void }) {
  const text = useT().settings
  const [method, setMethod] = useState<'age' | 'manual'>(preferences.profile?.method ?? 'age')
  const [age, setAge] = useState(preferences.profile?.method === 'age' ? String(preferences.profile.value) : '')
  const [manual, setManual] = useState(preferences.profile?.method === 'manual' ? String(preferences.profile.value) : '')
  const [sound, setSound] = useState(preferences.sound)
  const [keepAwake, setKeepAwake] = useState(preferences.keepAwake)
  const [fill, setFill] = useState<FillStyle>(preferences.fill)
  const [language, setLanguage] = useState<Language>(preferences.language)
  const [error, setError] = useState('')
  const input = method === 'age' ? age : manual
  const profile = input.trim() ? parseProfile({ method, value: Number(input) }) : null
  const target = profile ? heartRateRange(profile, { min: 85, max: 95 }) : null
  return (
    <Modal title={text.title} subtitle={text.subtitle} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault()
        if (input.trim() && !profile) { setError(method === 'age' ? text.ageError : text.manualError); return }
        onSave({ profile, sound, keepAwake, fill, language })
      }}>
        <h3 className="form-section-title"><Languages size={17} /> {text.language}</h3>
        <div className="segmented-control">{([['ko', '한국어'], ['en', 'English']] as const).map(([value, label]) => <button key={value} type="button" lang={value} aria-pressed={language === value} className={language === value ? 'selected' : ''} onClick={() => setLanguage(value)}>{label}</button>)}</div>
        <h3 className="form-section-title"><Heart size={17} /> {text.heartSection}</h3>
        <div className="segmented-control"><button type="button" aria-pressed={method === 'age'} className={method === 'age' ? 'selected' : ''} onClick={() => { setMethod('age'); setError('') }}>{text.byAge}</button><button type="button" aria-pressed={method === 'manual'} className={method === 'manual' ? 'selected' : ''} onClick={() => { setMethod('manual'); setError('') }}>{text.byManual}</button></div>
        <label className="field-label" htmlFor="heart-value">{method === 'age' ? text.ageLabel : text.manualLabel}</label>
        <div className="input-with-unit"><input id="heart-value" type="number" inputMode="numeric" min={method === 'age' ? 18 : 80} max={method === 'age' ? 100 : 240} step="1" value={input} placeholder={method === 'age' ? text.agePlaceholder : text.manualPlaceholder} aria-invalid={Boolean(error)} aria-describedby="heart-input-help" onChange={(event) => { (method === 'age' ? setAge : setManual)(event.target.value); setError('') }} /><span>{method === 'age' ? text.ageUnit : 'bpm'}</span></div>
        <p id="heart-input-help" className="field-help">{method === 'age' ? text.ageHelp : text.manualHelp}</p>
        {profile && target && <div className="heart-preview"><span>{method === 'age' ? text.estimated : ''}{text.maxHeartRate} <strong>{maximumHeartRate(profile)} bpm</strong></span><span>{text.workTarget}</span><strong className="preview-value">{target.min}–{target.max} <small>bpm</small></strong></div>}
        {preferences.profile && <button type="button" className="text-button clear-profile" onClick={() => { setAge(''); setManual(''); setError('') }}>{text.clearProfile}</button>}
        <h3 className="form-section-title"><Paintbrush size={17} /> {text.fillSection}</h3>
        <div className="segmented-control">{([['sweep', text.fillSweep], ['circle', text.fillCircle]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={fill === value} className={fill === value ? 'selected' : ''} onClick={() => setFill(value)}>{label}</button>)}</div>
        <p className="field-help">{text.fillHelp}</p>
        <div className="settings-toggles">
          <label className="toggle-row"><span><Volume2 size={18} /><span><strong>{text.sound}</strong><small>{text.soundHelp}</small></span></span><input type="checkbox" role="switch" checked={sound} onChange={(event) => setSound(event.target.checked)} /><i className="switch-ui" aria-hidden="true" /></label>
          <label className="toggle-row"><span><Monitor size={18} /><span><strong>{text.keepAwake}</strong><small>{text.keepAwakeHelp}</small></span></span><input type="checkbox" role="switch" checked={keepAwake} onChange={(event) => setKeepAwake(event.target.checked)} /><i className="switch-ui" aria-hidden="true" /></label>
        </div>
        <p className="notice-small">{text.notice}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button full-width" type="submit">{text.save}</button>
      </form>
    </Modal>
  )
}
