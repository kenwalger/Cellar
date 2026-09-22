import {readFileSync} from 'node:fs'

/**
 * Minimal RFC 4180 reader for the oracle CSVs.
 *
 * Kept local to the tests rather than exported from the package: reading CSV
 * is test scaffolding, not something a consumer of @cellar/core should get.
 * `studio/scripts/build-ndjson.mts` carries its own copy for the same reason.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

export function readCsv(path: string): Record<string, string>[] {
  const rows = parseCsv(readFileSync(path, 'utf8')).filter((row) =>
    row.some((cell) => cell.trim() !== ''),
  )
  const header = rows[0]!.map((name) => name.trim())
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {}
    header.forEach((name, index) => {
      record[name] = (cells[index] ?? '').trim()
    })
    return record
  })
}
