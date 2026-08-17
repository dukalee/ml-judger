import Papa from 'papaparse'

export function getAnswerCsvUrl(problemName: string): string {
  return `https://raw.githubusercontent.com/dukalee/datasets/main/${problemName}_ans.csv`
}

export async function fetchAnswerColumn(problemName: string, column: string): Promise<string[]> {
  const url = getAnswerCsvUrl(problemName)
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('정답 CSV를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.')
  }
  if (res.status === 404) {
    throw new Error(`"${problemName}_ans.csv" 파일을 찾을 수 없습니다. 문제명을 다시 확인해주세요.`)
  }
  if (!res.ok) {
    throw new Error(`정답 CSV를 불러오지 못했습니다 (HTTP ${res.status}).`)
  }
  const text = await res.text()
  return extractColumn(text, column, '정답 CSV')
}

export async function extractColumnFromFile(file: File, column: string): Promise<string[]> {
  const text = await file.text()
  return extractColumn(text, column, '업로드한 CSV')
}

function extractColumn(csvText: string, column: string, source: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  const fatalError = parsed.errors.find((e) => e.code !== 'UndetectableDelimiter')
  if (fatalError) {
    throw new Error(`${source} 형식이 올바르지 않습니다: ${fatalError.message}`)
  }
  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    throw new Error(`${source}에서 헤더를 읽을 수 없습니다. CSV 형식을 확인해주세요.`)
  }
  if (!parsed.meta.fields.includes(column)) {
    throw new Error(`${source}에 "${column}" 컬럼이 없습니다. (사용 가능한 컬럼: ${parsed.meta.fields.join(', ')})`)
  }
  if (parsed.data.length === 0) {
    throw new Error(`${source}에 데이터 행이 없습니다.`)
  }
  return parsed.data.map((row) => row[column])
}
