import { rm } from 'node:fs/promises'

const bun = globalThis as typeof globalThis & {
  Bun: {
    build: (options: {
      entrypoints: string[]
      outdir: string
      naming: string
      target: 'node'
      format: 'esm'
      minify: boolean
      sourcemap: 'external' | 'none' | 'inline'
      packages: 'bundle' | 'external'
      define: Record<string, string>
    }) => Promise<{ success: boolean; logs: unknown[] }>
  }
}

await rm('./api/index.js.map', { force: true })

const result = await bun.Bun.build({
  entrypoints: ['./src/server/vercel-entry.ts'],
  outdir: './api',
  naming: 'index.js',
  target: 'node',
  format: 'esm',
  minify: false,
  sourcemap: 'none',
  packages: 'bundle',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
})

if (!result.success) {
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('Bundled Vercel API function: api/index.js')
