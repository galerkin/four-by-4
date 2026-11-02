import { ArrowUpRight, Check, Heart, Share, ShieldCheck, Smartphone } from 'lucide-react'
import { useT } from '../i18n'
import { Modal } from './Modal'

export function GuideDialog({ onClose }: { onClose: () => void }) {
  const text = useT().guide
  return <Modal title={text.title} subtitle={text.subtitle} onClose={onClose}>
    <div className="guide-intro"><span className="eyebrow">THE NORWEGIAN 4×4</span><h3>{text.headline[0]}<br />{text.headline[1]}</h3><p>{text.intro}</p></div>
    <ol className="guide-steps">{text.steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
    <div className="guide-note"><Heart size={20} /><p><strong>{text.noteTitle}</strong>{text.note}</p></div>
    <h3 className="form-section-title">{text.otherTitle}</h3><p className="body-copy">{text.other}</p>
    <div className="safety-note"><ShieldCheck size={20} /><p>{text.safety}</p></div>
    <div className="source-links"><a href="https://www.ntnu.edu/cerg/advice" target="_blank" rel="noreferrer">{text.sourceNtnu}<ArrowUpRight size={14} /></a><a href="https://pubmed.ncbi.nlm.nih.gov/11153730/" target="_blank" rel="noreferrer">{text.sourceTanaka}<ArrowUpRight size={14} /></a></div>
  </Modal>
}

export function InstallDialog({ onClose }: { onClose: () => void }) {
  const text = useT().install
  const icons = [<span key="1">01</span>, <span key="2"><Share size={17} /></span>, <span key="3"><Check size={17} /></span>]
  return <Modal title={text.title} subtitle={text.subtitle} onClose={onClose}>
    <div className="install-illustration"><Smartphone size={54} strokeWidth={1.3} /><span className="mini-logo"><i /><i /><i /><i /></span></div>
    <ol className="guide-steps">{text.steps.map((step, index) => <li key={step.title}>{icons[index]}<div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
    <div className="guide-note"><Smartphone size={20} /><p><strong>{text.noteTitle}</strong>{text.note}</p></div>
    <p className="notice-small">{text.notice}</p>
  </Modal>
}
