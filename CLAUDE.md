# ML Judger

학생들이 머신러닝 과제로 만든 예측 결과 CSV를 업로드하면, GitHub에 미리 올려둔 정답 CSV와
자동으로 대조하여 점수를 채점해주는 **정적 웹사이트**.

## 핵심 요구사항

- **정적 사이트**: 백엔드/서버 없음. 채점 로직은 전부 클라이언트(브라우저)에서 수행.
- **배포**: Vercel (정적 빌드 산출물 배포).
- **문제 목록 확장 가능**: 새로운 문제를 지속적으로 추가할 수 있어야 함.
  - 백엔드가 없으므로, 문제 목록은 레포에 커밋된 설정 파일(JSON 등)로 관리한다.
  - 문제 추가 = 설정 파일에 항목 추가 + git push → Vercel 자동 재배포.
  - 즉, "문제 추가"는 코드 배포 행위이지 런타임 CRUD가 아님 (관리자용 별도 백엔드 불필요).

## 문제(Problem) 정의 스키마

각 문제는 최소 다음 정보를 가진다:

- `id`: 문제 식별자
- `title`: 문제 이름
- `type`: `"regression"` | `"classification"`
- `answerCsvUrl`: 정답 CSV의 GitHub raw URL (`https://raw.githubusercontent.com/...`)
- (필요 시) `targetColumn`: 정답/예측을 비교할 컬럼명 또는 "마지막 컬럼" 규칙

학생이 업로드하는 CSV는 주어진 feature 컬럼들 + **마지막 컬럼에 예측값**을 채운 형태.

## 채점 로직

업로드된 CSV와 정답 CSV를 클라이언트에서 fetch/parse 후 비교.

- **Regression**: 결정계수(R², coefficient of determination)를 계산하여 0~100점으로 환산.
  - `R² = 1 - (SS_res / SS_tot)`
  - 음수가 나올 수 있으므로 0점 하한 처리 등 표시 정책 고려.
- **Classification**: 단순 정확도.
  - `score = 맞춘 개수 / 전체 라벨 수` (퍼센트로 표시)

## 기술 스택

- **프레임워크**: React
- **빌드 도구**: Vite
- **언어**: TypeScript
- CSV 파싱: PapaParse (`src/lib/csv.ts`).
- 정답 CSV는 매 채점 시 GitHub raw URL에서 fetch.

## 현재 구현 상태 (요약)

- 문제 목록 레지스트리: `docs/problem_lists/problems.json`에 `{id, type, targetColumn}` 배열로 관리.
  `src/types/problem.ts`가 이 JSON을 직접 import해 `PROBLEMS` 상수로 노출한다.
  학생은 폼에서 **문제명을 드롭다운으로 선택**하며, 선택 즉시 문제 유형/column명이
  레지스트리 값으로 자동 채워지고 두 필드는 읽기 전용이 된다 (`src/App.tsx`의
  `handleProblemNameChange`). 새 문제 추가 = `problems.json`에 항목 추가 + git push.
  정답 CSV URL 자체는 여전히 `src/lib/csv.ts`의 `getAnswerCsvUrl()`이
  `https://raw.githubusercontent.com/dukalee/datasets/main/{문제명}_ans.csv` 관례로 구성한다
  (레지스트리에 `answerCsvUrl` 필드는 아직 없음 — 파일명 관례에 의존 중).
- 채점: `src/lib/scoring.ts` — regression은 R²(0 하한), classification은 정확도.
  행 개수가 정답과 다르면 에러.
- UI: `src/App.tsx` + `src/App.css`. 연한 블루 톤 테마(dacon.io 참고), 상단 고정 브랜드 헤더바.
  레이아웃은 `mockups/layout-mocks.html`의 **B안(상단 폼 바 + 하단 결과 패널 전체 폭)**을 그대로 채택
  (`panel`/`b-topform`/`seg`/`drop`/`btn`/`result-wrap`/`score-row`/`diff` 등 mock B의 클래스명을 그대로 사용).
  결과 화면에 정답 vs 제출 값을 **git-diff 스타일 1:1 비교 테이블**로 표시
  (classification은 완전 일치 여부, regression은 상대오차 기준 일치/근접/불일치 3단계 배지).
  문제 유형 선택 pill 라벨은 mock과 동일하게 `회귀`/`분류` 단일 줄 텍스트 사용
  (`src/types/problem.ts`의 `PROBLEM_TYPE_LABELS`) — 2줄(`Regression (회귀)`)로 렌더링되면
  `.b-topform`의 `align-items:end` 때문에 폼 필드 라벨 정렬이 어긋나므로 반드시 1줄 유지.
  제출 기록(히스토리) 기능은 아직 미구현 — 현재는 채점 결과 1건만 화면에 표시되고 재제출 시 덮어써짐.

## 확인이 필요한 사항 (TODO / 검증)

- [x] GitHub raw CSV fetch가 브라우저에서 CORS 문제없이 동작함을 확인 (`fetchAnswerColumn`).
- [ ] 정답 CSV가 public 레포에 있어야 함 (private면 인증 필요 → 정적 사이트 원칙과 충돌).
- [ ] 문제 목록/레지스트리를 JSON으로 관리할지, 지금처럼 "문제명 → 파일명 관례" 방식을 유지할지 결정.
- [ ] CSV 컬럼 순서/헤더 불일치 시 처리 정책 (현재는 헤더 기반 파싱이라 순서는 무관, 컬럼명이 없으면 에러).
- [ ] 제출 기록(히스토리) 기능 자체를 구현할지, 구현한다면 세션 메모리에만 둘지
      localStorage 등으로 영속화할지 여부 (현재 미구현).
