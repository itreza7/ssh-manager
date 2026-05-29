// One-time migration: import connections from the legacy Python app
// (~/.ssh_manager/connections.json) into the Electron app's store
// (%APPDATA%/ssh-manager/connections.json). Field names are remapped to the
// new schema. Merges by id, so re-running is safe.
//
// Note: the Python app kept passwords in Windows Credential Manager; those are
// NOT migrated (different mechanism). Password connections must be re-entered.
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const src = join(homedir(), '.ssh_manager', 'connections.json')
const destDir = join(process.env.APPDATA || homedir(), 'ssh-manager')
const dest = join(destDir, 'connections.json')

if (!existsSync(src)) {
  console.log(`No legacy store at ${src} — nothing to migrate.`)
  process.exit(0)
}

const legacy = JSON.parse(readFileSync(src, 'utf-8'))
const existing = existsSync(dest) ? JSON.parse(readFileSync(dest, 'utf-8')) : []
const byId = new Map(existing.map((c) => [c.id, c]))

let added = 0
for (const c of legacy) {
  const conn = {
    id: c.id,
    name: c.name || 'Unnamed',
    host: c.host,
    port: c.port || 22,
    username: c.username || '',
    authMethod: c.auth_method || 'key',
    ...(c.key_path ? { keyPath: c.key_path } : {}),
    ...(c.notes ? { notes: c.notes } : {})
  }
  if (!byId.has(conn.id)) added++
  byId.set(conn.id, conn)
}

mkdirSync(destDir, { recursive: true })
writeFileSync(dest, JSON.stringify([...byId.values()], null, 2), 'utf-8')
console.log(`Migrated ${legacy.length} connection(s), ${added} new. Wrote ${dest}`)
