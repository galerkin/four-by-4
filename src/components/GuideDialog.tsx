import { ArrowUpRight, Check, Heart, Share, ShieldCheck, Smartphone } from 'lucide-react'
import { Modal } from './Modal'

export function GuideDialog({ onClose }: { onClose: () => void }) {
  return <Modal title="운동은 내가, 순서는 앱이." subtitle="좋은 프로그램을, 실행하기 쉬운 습관으로." onClose={onClose}>
    <div className="guide-intro"><span className="eyebrow">THE NORWEGIAN 4×4</span><h3>네 번의 4분,<br />더 탄탄한 심폐 체력.</h3><p>노르웨이 NTNU의 연구에서 사용해 온 유산소 인터벌 방식이에요. 심폐 체력(VO₂max) 향상에 도움을 줄 수 있지만, 개인의 상태와 꾸준함에 따라 효과는 달라요.</p></div>
    <ol className="guide-steps"><li><span>01</span><div><strong>10분, 천천히 준비해요</strong><p>최대 심박수의 60–70% 정도로 몸을 풀어요.</p></div></li><li><span>02</span><div><strong>4분 운동 + 사이사이 3분 회복</strong><p>4분 고강도를 네 번 반복해요. 목표는 최대 심박수의 85–95%. 처음 1–2분은 점진적으로 올려요. 세 번의 회복은 60–70% 정도로 천천히 걸어요.</p></div></li><li><span>03</span><div><strong>5분, 차분하게 마무리해요</strong><p>마지막 고강도 뒤에는 바로 쿨다운. 총 40분이에요. 전력 질주나 탈진이 목표는 아니에요.</p></div></li></ol>
    <div className="guide-note"><Heart size={20} /><p><strong>85 bpm이 아니라, 최대 심박수의 85%예요.</strong>나이 기반 값은 추정치일 뿐이에요. 실제 심박수는 워치에서 확인하고, 몸의 느낌도 함께 살펴주세요.</p></div>
    <h3 className="form-section-title">다른 운동도, 같은 방식으로</h3><p className="body-copy">‘프로그램’에서 내 프로그램을 만들거나 JSON 파일을 가져오세요. 구간별 시간·안내·선택적 심박수 목표를 정하면 자동으로 순서가 넘어가요. 건너뛰기는 완료한 운동 시간에 포함하지 않아요.</p>
    <div className="safety-note"><ShieldCheck size={20} /><p>일반적인 성인 운동 안내이며 의료 조언을 대신하지 않아요. 심혈관 질환·복용 약물이 있거나 임신 중, 오랜 운동 공백 후라면 고강도 운동 전에 의료진과 상의하세요. 가슴 통증·어지럼·비정상적인 호흡곤란이 생기면 즉시 멈추세요.</p></div>
    <div className="source-links"><a href="https://www.ntnu.edu/cerg/advice" target="_blank" rel="noreferrer">NTNU · 4×4 운동 가이드<ArrowUpRight size={14} /></a><a href="https://pubmed.ncbi.nlm.nih.gov/11153730/" target="_blank" rel="noreferrer">Tanaka 등 · 최대 심박수 추정식<ArrowUpRight size={14} /></a></div>
  </Modal>
}

export function InstallDialog({ onClose }: { onClose: () => void }) {
  return <Modal title="홈 화면에서, 더 가깝게." subtitle="iPhone 16 Pro Max와 데스크톱에서 사용할 수 있어요." onClose={onClose}>
    <div className="install-illustration"><Smartphone size={54} strokeWidth={1.3} /><span className="mini-logo"><i /><i /><i /><i /></span></div>
    <ol className="guide-steps"><li><span>01</span><div><strong>iPhone Safari에서 앱을 열어요</strong><p>배포된 HTTPS 주소로 접속해 주세요.</p></div></li><li><span><Share size={17} /></span><div><strong>공유 → 홈 화면에 추가</strong><p>메뉴 위치는 iOS 버전에 따라 달라요. ‘웹 앱으로 열기’가 보이면 켜 주세요.</p></div></li><li><span><Check size={17} /></span><div><strong>나만의 운동 앱처럼 사용해요</strong><p>온라인에서 첫 로딩과 캐시 저장이 끝나면 오프라인에서도 실행할 수 있어요. 브라우저가 캐시를 지우면 다시 인터넷 연결이 필요해요.</p></div></li></ol>
    <div className="guide-note"><Smartphone size={20} /><p><strong>운동 중에는 앱 화면을 열어두세요.</strong>화면 잠금·백그라운드에서는 iOS가 소리와 타이머 실행을 제한할 수 있어요. 돌아오면 실제 경과 시간을 반영하지만, 놓친 알림을 제시간에 전달하지는 못해요.</p></div>
    <p className="notice-small">설치한 앱과 Safari, 다른 기기의 기록은 서로 다를 수 있어요. 프로그램 파일은 내보내기·가져오기로 옮길 수 있고, 자동 동기화는 없어요.</p>
  </Modal>
}
