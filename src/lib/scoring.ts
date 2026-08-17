import type { ProblemType } from '../types/problem'

export function scoreSubmission(type: ProblemType, answer: string[], submission: string[]): number {
  if (answer.length !== submission.length) {
    throw new Error(
      `정답(${answer.length}개)과 제출(${submission.length}개)의 행 개수가 일치하지 않습니다.`,
    )
  }
  return type === 'regression'
    ? scoreRegression(answer, submission)
    : scoreClassification(answer, submission)
}

function scoreRegression(answer: string[], submission: string[]): number {
  const actual = answer.map(toNumber)
  const predicted = submission.map(toNumber)

  const mean = actual.reduce((sum, v) => sum + v, 0) / actual.length
  const ssTot = actual.reduce((sum, v) => sum + (v - mean) ** 2, 0)
  const ssRes = actual.reduce((sum, v, i) => sum + (v - predicted[i]) ** 2, 0)

  const r2 = ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot
  return Math.max(0, r2) * 100
}

function scoreClassification(answer: string[], submission: string[]): number {
  const correct = answer.filter((v, i) => v === submission[i]).length
  return (correct / answer.length) * 100
}

function toNumber(value: string): number {
  const n = Number(value)
  if (Number.isNaN(n)) {
    throw new Error(`숫자로 변환할 수 없는 값입니다: "${value}"`)
  }
  return n
}
