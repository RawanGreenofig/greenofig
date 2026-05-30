'use client'

import { useRef, useState } from 'react'
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  X,
  Check,
  AlertTriangle,
} from '@/icons'
import {
  parseSpreadsheet,
  fileKind,
  EMPTY_PARSED,
  type ParsedClient,
} from '@/lib/clinic-import'

/**
 * Bulk-import walk-in clients. The coach drops in an Excel/CSV sheet, a
 * PDF, or a photo (a handwritten list, an intake form, a business card).
 * Spreadsheets parse in the browser; photos/PDFs go to the AI extract
 * route (Gemini vision). Everything lands in one editable review table
 * so the coach can fix anything before it's saved — then Add (new rows)
 * or Replace (match existing walk-ins by phone).
 */

type ImportResult = { added: number; updated: number; skipped: number; errors: string[] }

const ACCEPT = '.xlsx,.xls,.csv,.pdf,image/*'

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('Could not read file.'))
    fr.readAsDataURL(file)
  })
}

export function ImportClientsDialog({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: () => void | Promise<void>
}) {
  const [rows, setRows] = useState<ParsedClient[]>([])
  const [stage, setStage] = useState<'upload' | 'review'>('upload')
  const [working, setWorking] = useState<string | null>(null)
  const [mode, setMode] = useState<'add' | 'replace'>('add')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const validCount = rows.filter((r) => r.full_name.trim()).length

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setResult(null)
    let collected: ParsedClient[] = []
    for (const file of Array.from(files)) {
      const kind = fileKind(file)
      try {
        if (kind === 'spreadsheet') {
          setWorking(`Reading ${file.name}…`)
          collected = collected.concat(await parseSpreadsheet(file))
        } else if (kind === 'image' || kind === 'pdf') {
          setWorking(`AI reading ${file.name}…`)
          const dataUrl = await readAsDataURL(file)
          const base64 = dataUrl.split(',')[1] ?? ''
          const res = await fetch('/api/nutritionist/clinic-clients/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              mimeType: file.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
            }),
          })
          const data = (await res.json().catch(() => ({}))) as {
            clients?: ParsedClient[]
            error?: string
          }
          if (!res.ok) {
            setError(data.error ?? `AI extraction failed (${res.status}).`)
          } else {
            collected = collected.concat(data.clients ?? [])
          }
        } else {
          setError(`Unsupported file "${file.name}". Use Excel, CSV, PDF, or an image.`)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to read that file.')
      }
    }
    setWorking(null)
    if (collected.length > 0) setRows((curr) => [...curr, ...collected])
    setStage('review')
  }

  function updateRow(i: number, patch: Partial<ParsedClient>) {
    setRows((curr) => curr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeRow(i: number) {
    setRows((curr) => curr.filter((_, idx) => idx !== i))
  }
  function addEmptyRow() {
    setRows((curr) => [...curr, { ...EMPTY_PARSED }])
  }

  async function doImport() {
    if (importing) return
    const payload = rows.filter((r) => r.full_name.trim())
    if (payload.length === 0) {
      setError('Add at least one client with a name.')
      return
    }
    setImporting(true)
    setError(null)
    try {
      const res = await fetch('/api/nutritionist/clinic-clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload, mode }),
      })
      const data = (await res.json().catch(() => ({}))) as ImportResult & { error?: string }
      if (!res.ok) {
        setError(data.error ?? `Import failed (${res.status}).`)
        setImporting(false)
        return
      }
      setResult({
        added: data.added ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      })
      await onImported()
    } catch {
      setError('Network error during import.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && !importing && !working && onClose()}
    >
      <div className="w-full max-w-5xl max-h-[92dvh] flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg-1 inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime-400" strokeWidth={2} />
              Import clinic clients
            </h2>
            <p className="mt-1 text-xs text-fg-3">
              Upload an Excel/CSV sheet, a PDF, or a photo — AI pulls each client&apos;s details,
              then you review and edit before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !importing && !working && onClose()}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5 space-y-4">
          {/* Dropzone / uploader (always available — lets them add more files) */}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={!!working}
            className="w-full rounded-xl border border-dashed border-border hover:border-lime-400/50 bg-bg-deeper/50 px-4 py-6 text-center transition-colors disabled:opacity-60"
          >
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {working ? (
              <span className="inline-flex items-center gap-2 text-sm text-fg-2">
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                {working}
              </span>
            ) : (
              <span className="inline-flex flex-col items-center gap-1.5 text-fg-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg-1">
                  <Upload className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
                  Choose file(s)
                </span>
                <span className="inline-flex items-center gap-2 text-[11px] text-fg-3">
                  <FileSpreadsheet className="w-3 h-3" strokeWidth={1.75} />
                  Excel / CSV parsed instantly · PDF &amp; photos read by AI
                </span>
              </span>
            )}
          </button>

          {error && (
            <p className="text-xs inline-flex items-center gap-1.5" style={{ color: '#fca5a5' }}>
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
              {error}
            </p>
          )}

          {result && (
            <div className="rounded-lg border border-lime-600/40 bg-lime-400/10 px-4 py-3 text-sm text-fg-1">
              <p className="inline-flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-lime-400" strokeWidth={2.25} />
                Imported — {result.added} added
                {result.updated > 0 ? `, ${result.updated} updated` : ''}
                {result.skipped > 0 ? `, ${result.skipped} skipped` : ''}.
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1.5 text-xs text-fg-3 list-disc ps-5">
                  {result.errors.map((er, i) => (
                    <li key={i}>{er}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {stage === 'review' && !result && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-fg-3">
                  {rows.length === 0
                    ? 'Nothing detected yet — add rows manually or upload a file.'
                    : `${validCount} client${validCount === 1 ? '' : 's'} ready${rows.length !== validCount ? ` · ${rows.length - validCount} missing a name` : ''}.`}
                </p>
                <button
                  type="button"
                  onClick={addEmptyRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-lime-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  Add row
                </button>
              </div>

              {rows.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm" style={{ minWidth: 760 }}>
                    <thead>
                      <tr className="text-[10px] uppercase tracking-eyebrow text-fg-3 bg-bg-deeper">
                        <Th>Name *</Th>
                        <Th>Phone</Th>
                        <Th>Email</Th>
                        <Th>Date of birth</Th>
                        <Th>Gender</Th>
                        <Th>Notes</Th>
                        <th className="w-9" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-border align-top">
                          <Td>
                            <Cell
                              value={r.full_name}
                              onChange={(v) => updateRow(i, { full_name: v })}
                              invalid={!r.full_name.trim()}
                            />
                          </Td>
                          <Td>
                            <Cell value={r.phone ?? ''} onChange={(v) => updateRow(i, { phone: v || null })} dir="ltr" />
                          </Td>
                          <Td>
                            <Cell value={r.email ?? ''} onChange={(v) => updateRow(i, { email: v || null })} dir="ltr" />
                          </Td>
                          <Td>
                            <Cell
                              type="date"
                              value={r.date_of_birth ?? ''}
                              onChange={(v) => updateRow(i, { date_of_birth: v || null })}
                            />
                          </Td>
                          <Td>
                            <select
                              value={r.gender ?? ''}
                              onChange={(e) => updateRow(i, { gender: e.target.value || null })}
                              className="w-full h-9 rounded-md bg-bg-deeper border border-border px-2 text-sm text-fg-1 focus:outline-none focus:border-primary"
                            >
                              <option value="">—</option>
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="other">Other</option>
                            </select>
                          </Td>
                          <Td>
                            <Cell value={r.notes ?? ''} onChange={(v) => updateRow(i, { notes: v || null })} />
                          </Td>
                          <td className="px-1 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              aria-label="Remove row"
                              className="w-8 h-8 rounded-md inline-flex items-center justify-center text-rose-400 hover:bg-rose-400/10"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <footer className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-4 border-t border-border">
            <fieldset className="flex items-center gap-3 text-xs text-fg-2">
              <span className="font-semibold text-fg-3 uppercase tracking-eyebrow text-[10px]">
                On import
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'add'}
                  onChange={() => setMode('add')}
                  className="accent-lime-500"
                />
                Add as new
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="accent-lime-500"
                />
                Replace by phone
              </label>
            </fieldset>
            <div className="flex items-center gap-2 ms-auto">
              <button
                type="button"
                onClick={() => !importing && !working && onClose()}
                disabled={importing}
                className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doImport()}
                disabled={importing || validCount === 0}
                className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} />
                ) : (
                  <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
                )}
                {importing ? 'Importing…' : `Import ${validCount || ''}`.trim()}
              </button>
            </div>
          </footer>
        )}
        {result && (
          <footer className="flex items-center justify-end gap-2 px-5 md:px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-5 text-xs shadow-lime-glow border border-lime-600/60"
            >
              Done
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start font-semibold px-2 py-2">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-1.5">{children}</td>
}

function Cell({
  value,
  onChange,
  type = 'text',
  dir,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  dir?: 'ltr' | 'rtl'
  invalid?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md bg-bg-deeper border px-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
      style={{ borderColor: invalid ? 'rgba(244,63,94,0.6)' : 'var(--gf-border)', minWidth: type === 'date' ? 130 : 90 }}
    />
  )
}
