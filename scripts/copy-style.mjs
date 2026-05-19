import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const source = resolve(rootDir, 'src/styles.css')
const destination = resolve(rootDir, 'dist/fluid-cursor.css')

await mkdir(dirname(destination), { recursive: true })
await copyFile(source, destination)