import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '..', 'data')
const libraryPath = path.join(dataDir, 'learn-library.json')

export async function readRecords() {
  await mkdir(dataDir, { recursive: true })

  try {
    const content = await readFile(libraryPath, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeFile(libraryPath, '[]\n', 'utf8')
      return []
    }

    throw error
  }
}

export async function saveRecord(record) {
  const records = await readRecords()
  const nextRecords = [record, ...records].slice(0, 200)
  await writeFile(libraryPath, `${JSON.stringify(nextRecords, null, 2)}\n`, 'utf8')
  return record
}
