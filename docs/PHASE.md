# ML Judger 개발 Phase

프로젝트를 6개 phase로 나눈다. 각 phase는 독립적으로 배포/검증 가능한 단위를 목표로 한다.

## Phase 1 — 프로젝트 초기 세팅 ✅

- 기술 스택: React + Vite + TypeScript (확정).
- CSV 파싱 라이브러리 결정 (PapaParse).
- 프로젝트 스캐폴딩, 린트 설정 (`.oxlintrc.json`).
- GitHub raw CSV fetch의 CORS 동작을 실제로 테스트하여 확인 (`fetchAnswerColumn`이 정상 fetch/파싱).

**완료 기준**: 로컬 개발 서버 실행 성공, raw.githubusercontent.com fetch 테스트 성공. — 완료.
(Vercel 배포 연결 여부는 별도 확인 필요.)

## Phase 2 — 문제 입력 및 제출 UI 구성 ✅

- 문제명 입력 필드.
- 문제 유형 선택 버튼 (`regression` / `classification`, segmented control).
- 채점할 column 명 입력 필드.
- `submission.csv` 파일 업로드 기능 (드래그/클릭 드롭존).

**완료 기준**: 문제명/유형/채점 column명을 입력하고 `submission.csv`를 업로드하면 해당 값들이 상태로 저장되어 다음 단계에서 사용 가능함을 확인. — 완료 (`src/App.tsx`).

## Phase 3 — 정답 CSV 조회 스크립트 작성 ✅

- `https://raw.githubusercontent.com/dukalee/datasets/main/{문제명}_ans.csv` 관례로 fetch (`getAnswerCsvUrl`).
- 정답 CSV에서 채점 column명의 값들을 추출.
- 업로드된 `submission.csv`에서 동일한 채점 column명의 값들을 추출.
- 404/네트워크 오류/컬럼 없음 등 케이스별 에러 메시지 처리 완료.

**완료 기준**: 문제명을 입력하면 `{문제명}_ans.csv`를 정상적으로 fetch/파싱하고, 정답 column 값 배열과 제출 column 값 배열이 각각 추출됨. — 완료 (`src/lib/csv.ts`).

## Phase 4 — 채점 로직 구현 ✅

- `regression` 문제: 결정계수(R²)를 계산해 0~100점으로 환산 (음수는 0점 하한).
- `classification` 문제: 맞은 개수 / 총 개수 → 0~100점.
- 정답/제출 행 개수가 다르면 에러.

**완료 기준**: 문제명 입력 → 유형/컬럼 선택 → `submission.csv` 업로드 → 채점 결과 출력까지 end-to-end 동작. — 완료 (`src/lib/scoring.ts`).

## Phase 5 — UI/UX 고도화 ✅

- 연한 블루 톤 디자인 시스템 도입 (dacon.io 참고), 상단 고정 브랜드 헤더바.
- "저장된 제출 정보" 패널 제거, 로딩/에러 상태만 간결하게 표시.
- 정답 vs 제출 값을 **git-diff 스타일 1:1 비교 테이블**로 표시
  (classification: 완전 일치 여부 / regression: 상대오차 기준 일치·근접·불일치 3단계 배지, 상단에 일치 개수 요약).
- 점수 진행 바(등급별 그라데이션) 추가.
- **제출 기록**을 세션 메모리(React state)로 관리: "제출 1, 제출 2 ..." 순번 표기, 최대 10개까지 누적 후 오래된 항목부터 제거. 새로고침 시 초기화됨(비영속).

**완료 기준**: 채점 결과 화면에서 정답/제출 비교가 표 형태로 명확히 보이고, 같은 세션 내 여러 번 제출 시 기록이 누적되어 보임. — 완료.

## Phase 6 — 마감 및 배포 안정화 (예정)

- 문제 목록 관리 방식 확정: 현재는 "문제명 → `{문제명}_ans.csv`" 파일명 관례에 의존. JSON 레지스트리(`answerCsvUrl`, `type` 사전 정의) 도입 여부 결정.
- CSV 컬럼 순서/헤더 불일치, private 레포 접근 등 나머지 TODO 검증 (`CLAUDE.md` 참고).
- 제출 기록 영속화(localStorage 등) 필요 여부 결정.
- 여러 문제를 등록해 실제 다건 운영 시나리오 테스트.
- Vercel 프로덕션 배포 최종 점검, README/사용 가이드 작성.

**완료 기준**: 실제 학생 사용 시나리오(문제 선택 → CSV 업로드 → 채점 결과 확인)가 프로덕션 URL에서 안정적으로 동작.
