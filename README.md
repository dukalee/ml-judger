# ML Judger

머신러닝 과제로 만든 예측 결과 CSV를 업로드하면, GitHub에 올려둔 정답 CSV와 브라우저에서
바로 대조하여 채점해주는 정적 웹사이트입니다. 백엔드 없이 전부 클라이언트에서 동작합니다.

## 사용 방법

1. **문제명**을 입력합니다. (예: `student_performance`)
   - 이 이름은 `https://github.com/dukalee/datasets/blob/main/{문제명}_ans.csv` 정답 파일과 매칭됩니다.
2. **문제 유형**을 선택합니다. (`Regression` / `Classification`)
3. **채점할 column 명**을 입력합니다. 정답 CSV와 제출 CSV 양쪽에 동일한 이름의 컬럼이 있어야 합니다.
4. 예측 결과가 담긴 **submission.csv**를 업로드합니다.
5. **제출**을 누르면 정답 CSV를 fetch하여 자동으로 채점 결과(점수)를 보여줍니다.

## 채점 방식

- **Regression**: 결정계수(R²)를 0~100점으로 환산합니다. 음수 R²는 0점으로 처리합니다.
- **Classification**: 정확도(맞춘 개수 / 전체 개수)를 퍼센트로 표시합니다.

## 개발

```bash
npm install
npm run dev      # 로컬 개발 서버
npm run build    # 프로덕션 빌드 (tsc + vite build)
npm run lint      # oxlint
```

## 기술 스택

- React + TypeScript + Vite
- [PapaParse](https://www.papaparse.com/)로 브라우저에서 CSV 파싱
- 정적 산출물(Vercel 등)로 배포, 정답 CSV는 매 채점 시 GitHub raw URL에서 fetch

## 새 문제 추가

정답 CSV(`{문제명}_ans.csv`)를 `dukalee/datasets` 레포에 커밋해두면, 학생은 해당 문제명을
입력하는 것만으로 바로 채점받을 수 있습니다. 별도의 백엔드/관리자 페이지가 필요 없습니다.
