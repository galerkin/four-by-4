# 무료 운영 옵션 검토

## 현재 결정

로컬 검증 후 사용자 요청에 따라 **공개 GitHub 저장소 + GitHub Pages**를 배포 방식으로 선택했다. 웹앱 주소는 https://galerkin.github.io/four-by-4/ 이다. 별도의 유료 서비스 가입 없이 기존 GitHub 계정을 사용한다.

현재 GitHub 인증의 기존 권한으로 이용할 수 있는 **배포 브랜치 방식**을 사용한다. 사용자 정의 Actions 워크플로 추가 권한을 새로 요청하지 않는다. `npm run publish:pages`가 린트·단위 테스트·데스크톱/모바일 E2E·하위 경로/오프라인 검증을 통과한 정적 산출물만 `gh-pages`에 올리고, GitHub Pages가 그 브랜치를 자동 게시한다. `main` push만으로 앱이 배포되는 방식은 아니다.

개인적으로 사용하는 공개 가능한 정적 앱이면 **GitHub Pages**가 가장 단순하다. 기존 GitHub 저장소만 활용하면 별도 서비스 가입을 줄일 수 있다. 비공개 소스 유지가 중요하면 **Cloudflare Pages**도 좋은 대안이다. Vercel에 한정할 이유는 없다.

무료를 지속 가능하게 만드는 핵심은 사업자의 무료 등급보다 **서버·DB·외부 유료 API가 없는 작은 정적 앱**이라는 구조다. 같은 `dist/` 산출물을 다른 호스팅으로 옮길 수 있다. 어떤 회사의 무료 정책도 영구 보장을 의미하지는 않는다.

## 비교

공식 문서 확인일: 2026-11-01. 세부 한도·약관은 실제 배포 전에 다시 확인한다.

| 옵션 | 이 프로젝트에 맞는 점 | 조건 및 주의점 |
| --- | --- | --- |
| **GitHub Pages** | 기존 저장소 활용, 정적 호스팅, HTTPS, 배포 브랜치 갱신 시 자동 게시 | GitHub Free에서는 공개 저장소 필요. 이 프로젝트는 사용자 승인하에 공개하여 사용한다. 사이트 1GB, 월 100GB soft bandwidth limit. 영리 SaaS 등 용도 제한 |
| **Cloudflare Pages Free** | 소스 비공개 유지 가능, Git 연동, 무료 `pages.dev` 주소, 정적 요청 무료·무제한 | 계정 추가 필요. 월 500회 빌드, 동시 빌드 1개, 파일 20,000개, 개별 파일 25MiB 제한. Functions/Workers는 별도 한도이며 현재 앱에는 불필요 |
| **Vercel Hobby** | Vite 자동 인식, Git 연동, 무료 `vercel.app` 주소, 간단한 미리보기 배포 | 개인·비상업 용도. 무료 사용량 초과 시 기능이 제한/일시 중단될 수 있음. 개인 비공개 저장소 가능하지만 조직 소유 비공개 저장소를 Hobby에 연결하는 데 제약이 있음 |

현재 앱은 빌드된 HTML/CSS/JS·자체 폰트·아이콘만 배포한다. 서버 함수, 이미지 최적화 서비스, 스토리지 상품, 웹 분석 유료 기능을 켤 필요가 없다. 무료 기본 주소면 유료 도메인도 필요 없다.

## 로컬에서 배포 없이 확인

```bash
npm ci
npm run check
npx playwright install chromium webkit
npm run test:e2e
npm run preview -- --port 5173 --strictPort
```

PC의 `http://localhost:5173` 또는 같은 Wi-Fi에서 출력된 Network 주소로 확인한다. LAN HTTP에서는 iPhone의 일부 보안 컨텍스트 기능을 검증할 수 없다. 자세한 내용은 [README](../README.md#로컬-실행)를 참고한다.

## GitHub Pages 구성

1. 사용자 승인하에 저장소를 공개로 전환한다. 공개 대상 파일과 `main` 이력에 비밀 값이나 개인정보가 없는지 점검한다.
2. 저장소 Settings → Pages에서 **Deploy from a branch**, 브랜치 **gh-pages**, 폴더 **/ (root)**를 선택한다.
3. 소스는 `main`에 커밋/push한다. `npm run publish:pages`는 작업 디렉터리가 깨끗하고 로컬 `main`과 원격 `main`이 같은지 먼저 확인한다.
4. 배포 스크립트가 린트·단위 테스트·Chromium/WebKit E2E를 실행하고 `/four-by-4/` 경로로 빌드한다. `npm run test:pages`는 실제 HTTP 하위 경로의 앱·매니페스트·아이콘·서비스 워커·오프라인 재실행을 확인한다.
5. 임시 Git 인덱스에 검증한 `dist/`만 담아 `gh-pages`에 일반 fast-forward push한다. 소스 브랜치/인덱스를 변경하거나 강제 push하지 않는다. `.nojekyll`로 불필요한 Jekyll 처리를 막고, `deployment.json`에 대응하는 공개 소스 커밋을 기록한다.
6. GitHub의 **pages build and deployment** 결과와 HTTPS 주소를 확인한다. `npm run publish:pages -- --dry-run`은 원격 push 없이 동일한 검증/트리 생성을 수행한다.

로컬에서 동일한 하위 경로 산출물을 확인하려면:

```bash
VITE_BASE_PATH=/four-by-4/ npm run build
npm run test:pages
```

배포 주소는 `https://galerkin.github.io/four-by-4/`이다. 사용자/커스텀 도메인 최상위에 올릴 때는 기본 `/`로 빌드한다. HTML·JS·폰트·매니페스트·서비스 워커가 하위 경로를 함께 사용하도록 구성했다.

## 나중에 Cloudflare Pages / Vercel을 선택하면

1. 사용자가 해당 서비스에 로그인하고 GitHub 저장소 접근 권한을 승인한다.
2. 저장소를 Import하고 프레임워크는 Vite, 빌드 명령은 `npm run build`, 출력은 `dist`로 지정한다.
3. Node 22 사용. 사이트 최상위 경로라면 `VITE_BASE_PATH`는 설정하지 않는다.
4. 무료 플랜과 비상업 사용 조건을 확인하고 Deploy한다. Pro 체험/유료 부가 기능은 선택할 필요 없다.
5. HTTPS 배포 후 iPhone Safari에서 소리·홈 화면 설치·화면 켜짐 유지·오프라인 재실행을 실기기로 확인한다.

## 운영과 데이터

- 무료 공개 사이트라고 운동 기록까지 공개되는 것은 아니다. 현재 프로그램·설정·기록은 각 브라우저의 `localStorage`에만 보관하며 서버에 전송하지 않는다.
- 반대로 기기 간 자동 동기화/서버 백업은 없다. 프로그램 파일 내보내기·가져오기로 수동 이동한다.
- 다른 도메인으로 호스팅을 옮기면 브라우저 저장 영역도 바뀐다. 먼저 프로그램을 내보내야 한다. 기록 파일은 보관용 내보내기만 지원한다.
- 개인 나이/최대 심박수가 들어 있는 브라우저 저장 데이터나 내보낸 기록 파일을 Git 저장소에 추가하지 않는다.
- PWA 업데이트는 사용자 선택이며 운동 중에는 적용 버튼을 막는다. 앱 캐시는 브라우저에서 삭제될 수 있으므로 최초 및 필요시 인터넷 연결이 필요하다.

## 공식 출처

- [GitHub Pages 소개/무료 요금제 조건](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [GitHub Pages 한도/용도 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Cloudflare Pages 한도](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare 정적 요청 무료·무제한 / Functions 과금 구분](https://developers.cloudflare.com/pages/functions/pricing/)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Vercel Git 연동과 Hobby 제약](https://vercel.com/docs/git)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
