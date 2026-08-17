import problemsData from '../../docs/problem_lists/problems.json'

export type ProblemType = 'regression' | 'classification'

export interface Submission {
  problemName: string
  type: ProblemType
  targetColumn: string
  file: File
}

export interface Problem {
  id: string
  type: ProblemType
  targetColumn: string
}

export const PROBLEMS: Problem[] = problemsData as Problem[]

export const PROBLEM_TYPES: ProblemType[] = ['regression', 'classification']

export const PROBLEM_TYPE_LABELS: Record<ProblemType, string> = {
  regression: '회귀',
  classification: '분류',
}
