import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProblemType } from './types/problem'
import { PROBLEM_TYPES, PROBLEM_TYPE_LABELS, PROBLEMS } from './types/problem'
import { extractColumnFromFile, fetchAnswerColumn } from './lib/csv'
import { scoreSubmission } from './lib/scoring'
import './App.css'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'
type DiffTier = 'match' | 'partial' | 'mismatch'

interface DiffRow {
  idx: number
  answer: string
  submitted: string
  tier: DiffTier
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function scoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 80) return 'high'
  if (score >= 50) return 'mid'
  return 'low'
}

function buildDiffRows(type: ProblemType, answers: string[], submissions: string[]): DiffRow[] {
  const len = Math.max(answers.length, submissions.length)
  const rows: DiffRow[] = []
  for (let i = 0; i < len; i++) {
    const answer = answers[i] ?? '—'
    const submitted = submissions[i] ?? '—'
    let tier: DiffTier

    if (type === 'classification') {
      tier = answer === submitted ? 'match' : 'mismatch'
    } else {
      const a = Number(answer)
      const s = Number(submitted)
      if (Number.isNaN(a) || Number.isNaN(s)) {
        tier = 'mismatch'
      } else {
        const denom = Math.abs(a) > 1e-9 ? Math.abs(a) : 1
        const relError = Math.abs(s - a) / denom
        tier = relError <= 0.05 ? 'match' : relError <= 0.2 ? 'partial' : 'mismatch'
      }
    }

    rows.push({ idx: i + 1, answer, submitted, tier })
  }
  return rows
}

function App() {
  const [problemName, setProblemName] = useState('')
  const [type, setType] = useState<ProblemType>('regression')
  const [targetColumn, setTargetColumn] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const handleProblemNameChange = (name: string) => {
    setProblemName(name)
    const problem = PROBLEMS.find((p) => p.id === name)
    if (problem) {
      setType(problem.type)
      setTargetColumn(problem.targetColumn)
    }
  }

  const [isProblemDropdownOpen, setIsProblemDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const problemFieldRef = useRef<HTMLDivElement>(null)

  const sortedProblems = useMemo(
    () => [...PROBLEMS].sort((a, b) => a.id.localeCompare(b.id)),
    [],
  )

  const filteredProblems = useMemo(() => {
    const q = problemName.trim().toLowerCase()
    if (!q) return sortedProblems
    return sortedProblems.filter((p) => p.id.toLowerCase().includes(q))
  }, [problemName, sortedProblems])

  useEffect(() => {
    if (!isProblemDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (problemFieldRef.current && !problemFieldRef.current.contains(e.target as Node)) {
        setIsProblemDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProblemDropdownOpen])

  const selectProblem = (id: string) => {
    handleProblemNameChange(id)
    setIsProblemDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  const handleProblemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isProblemDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIsProblemDropdownOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, filteredProblems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && filteredProblems[highlightedIndex]) {
        e.preventDefault()
        selectProblem(filteredProblems[highlightedIndex].id)
      }
    } else if (e.key === 'Escape') {
      setIsProblemDropdownOpen(false)
    }
  }

  const [status, setStatus] = useState<FetchStatus>('idle')
  const [error, setError] = useState('')
  const [answerValues, setAnswerValues] = useState<string[] | null>(null)
  const [submissionValues, setSubmissionValues] = useState<string[] | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [loadingDuration, setLoadingDuration] = useState(1500)
  const [loadingKey, setLoadingKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoading = status === 'loading'
  const canSubmit = problemName.trim() !== '' && targetColumn.trim() !== '' && file !== null && !isLoading

  const diffRows = useMemo(() => {
    if (!answerValues || !submissionValues) return []
    return buildDiffRows(type, answerValues, submissionValues)
  }, [type, answerValues, submissionValues])

  const matchCount = useMemo(() => diffRows.filter((r) => r.tier === 'match').length, [diffRows])

  const handleReset = () => {
    setProblemName('')
    setType('regression')
    setTargetColumn('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setStatus('idle')
    setError('')
    setAnswerValues(null)
    setSubmissionValues(null)
    setScore(null)
    setIsProblemDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !file) return

    const name = problemName.trim()
    const column = targetColumn.trim()
    const currentType = type
    const duration = Math.round(1000 + Math.random() * 2000)

    setLoadingDuration(duration)
    setLoadingKey((k) => k + 1)
    setStatus('loading')
    setError('')
    setAnswerValues(null)
    setSubmissionValues(null)
    setScore(null)

    try {
      const [[answer, submitted]] = await Promise.all([
        Promise.all([fetchAnswerColumn(name, column), extractColumnFromFile(file, column)]),
        sleep(duration),
      ])
      const result = scoreSubmission(currentType, answer, submitted)
      setAnswerValues(answer)
      setSubmissionValues(submitted)
      setScore(result)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">ML</span>
            <span className="brand-name">ML Judger</span>
          </div>
          <span className="topbar-tag">자동 채점 플랫폼</span>
        </div>
      </header>

      <div className="page">
        <div className="mock-inner">
          <form className="panel b-topform" onSubmit={handleSubmit}>
            <div className="field combobox" ref={problemFieldRef}>
              <span className="label">문제명</span>
              <div className="combobox-input-wrap">
                <input
                  className="inp combobox-input"
                  type="text"
                  role="combobox"
                  aria-expanded={isProblemDropdownOpen}
                  aria-controls="problem-listbox"
                  autoComplete="off"
                  value={problemName}
                  onChange={(e) => {
                    handleProblemNameChange(e.target.value)
                    setIsProblemDropdownOpen(true)
                    setHighlightedIndex(-1)
                  }}
                  onFocus={() => setIsProblemDropdownOpen(true)}
                  onKeyDown={handleProblemKeyDown}
                  placeholder="예: house_price"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={`combobox-toggle${isProblemDropdownOpen ? ' open' : ''}`}
                  tabIndex={-1}
                  disabled={isLoading}
                  onClick={() => setIsProblemDropdownOpen((v) => !v)}
                  aria-label="문제 목록 열기"
                >
                  <svg viewBox="0 0 12 8" fill="none" aria-hidden="true">
                    <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isProblemDropdownOpen && !isLoading && (
                  <ul className="combobox-list" id="problem-listbox" role="listbox">
                    {filteredProblems.length === 0 && <li className="combobox-empty">일치하는 문제가 없습니다</li>}
                    {filteredProblems.map((p, i) => (
                      <li
                        key={p.id}
                        role="option"
                        aria-selected={problemName === p.id}
                        className={`combobox-option${i === highlightedIndex ? ' active' : ''}${problemName === p.id ? ' selected' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          selectProblem(p.id)
                        }}
                        onMouseEnter={() => setHighlightedIndex(i)}
                      >
                        <span className="combobox-option-name">{p.id}</span>
                        <span className="combobox-option-meta">
                          {PROBLEM_TYPE_LABELS[p.type]} · {p.targetColumn}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="field">
              <span className="label">문제 유형</span>
              <div className="seg">
                {PROBLEM_TYPES.map((t) => (
                  <span
                    key={t}
                    className={type === t ? 'on' : ''}
                    onClick={() => !isLoading && setType(t)}
                    aria-pressed={type === t}
                  >
                    {PROBLEM_TYPE_LABELS[t]}
                  </span>
                ))}
              </div>
            </div>

            <label className="field">
              <span className="label">column 명</span>
              <input
                className="inp"
                type="text"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                placeholder="예: prediction"
                disabled={isLoading}
              />
            </label>

            <div className="field grow2">
              <span className="label">submission.csv</span>
              <label className="drop">
                <svg className="drop-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 2.5h8l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="M14 2.5V7h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <span className="drop-text">{file ? file.name : '파일 업로드'}</span>
                <input
                  ref={fileInputRef}
                  className="drop-input"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={isLoading}
                />
              </label>
            </div>

            <button className="btn" type="submit" disabled={!canSubmit}>
              <span className="btn-label">{isLoading ? '채점 중...' : '제출'}</span>
              {isLoading && (
                <span
                  key={loadingKey}
                  className="btn-bar run"
                  style={{ animationDuration: `${loadingDuration}ms` }}
                  aria-hidden="true"
                />
              )}
            </button>
          </form>

          <div className="panel">
            <div className="section-title">채점 결과</div>

            <div className="result-wrap">
              {status === 'idle' && (
                <p className="sub">문제명, 유형, column명을 입력하고 CSV를 제출하면 결과가 표시됩니다.</p>
              )}

              {status === 'error' && (
                <>
                  <p className="sub result-error">{error}</p>
                  <button type="button" className="reset-link" onClick={handleReset}>
                    다시 시도
                  </button>
                </>
              )}

              <div className={`result-loading${status === 'loading' ? ' show' : ''}`}>
                {isLoading && (
                  <div className="progress-track">
                    <div
                      key={loadingKey}
                      className="progress-fill"
                      style={{ animationDuration: `${loadingDuration}ms` }}
                    />
                  </div>
                )}
                <div className="skel skel-score" />
                <div className="skel skel-row" />
                <div className="skel skel-row" />
                <div className="skel skel-row" style={{ width: '80%' }} />
                <div className="load-label">
                  <span className="spinner" aria-hidden="true" />
                  정답 CSV를 조회하고 채점하는 중...
                </div>
              </div>

              {status === 'success' && answerValues && submissionValues && score !== null && (
                <div className="result-ready show">
                  <div className="score-row">
                    <span className={`score-num tier-${scoreTier(score)}`}>
                      {score.toFixed(1)}
                      <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.7 }}>점</span>
                    </span>
                    <div className="score-track">
                      <div
                        className={`score-fill tier-${scoreTier(score)}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                  </div>
                  <p className="sub" style={{ marginTop: 10 }}>
                    {type === 'regression' ? 'R² 기반 점수 (0~100)' : '정확도 (맞춘 개수 / 전체)'} · 일치{' '}
                    {matchCount} / 전체 {diffRows.length}
                  </p>

                  <div className="diff-wrap">
                    <table className="diff">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>정답</th>
                          <th>제출</th>
                          <th style={{ width: 70 }}>결과</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffRows.map((row) => (
                          <tr key={row.idx} className={row.tier}>
                            <td>{row.idx}</td>
                            <td>{row.answer}</td>
                            <td>{row.submitted}</td>
                            <td>
                              {row.tier === 'match' && <span className="badge match">일치</span>}
                              {row.tier === 'partial' && <span className="badge partial">근접</span>}
                              {row.tier === 'mismatch' && <span className="badge mismatch">불일치</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
