import * as XLSX from 'xlsx'

/**
 * Shared helpers for the clinic-client bulk importer. A "parsed client"
 * is the normalized shape we feed into the review table and the import
 * API — it mirrors the columns of public.clinic_clients (minus
 * coach_id / id / timestamps, which the server fills in).
 *
 * Spreadsheets (.xlsx/.xls/.csv) are parsed in the browser with xlsx.
 * Images and PDFs go to /api/nutritionist/clinic-clients/extract, which
 * runs Gemini vision and returns this same shape.
 */
export interface ParsedClient {
  full_name: string
  phone: string | null
  email: string | null
  date_of_birth: string | null // YYYY-MM-DD
  start_date: string | null // YYYY-MM-DD — when they started at the clinic
  end_date: string | null // YYYY-MM-DD — when their program ends
  insured: boolean
  insurance_provider: string | null
  gender: string | null // 'female' | 'male' | 'other' | null
  notes: string | null
}

export const EMPTY_PARSED: ParsedClient = {
  full_name: '',
  phone: null,
  email: null,
  date_of_birth: null,
  start_date: null,
  end_date: null,
  insured: false,
  insurance_provider: null,
  gender: null,
  notes: null,
}

export type FileKind = 'spreadsheet' | 'image' | 'pdf' | 'unknown'

export function fileKind(file: File): FileKind {
  const n = file.name.toLowerCase()
  const t = file.type
  if (t.includes('sheet') || t === 'text/csv' || /\.(xlsx?|csv)$/.test(n)) return 'spreadsheet'
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (t.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/.test(n)) return 'image'
  return 'unknown'
}

/** Normalize a header cell to a comparable key (lowercase, letters only). */
function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z]/g, '')
}

// Maps normalized spreadsheet headers → our fields. Covers common
// English/Arabic-transliterated variants people actually use.
const HEADER_TO_FIELD: Record<string, keyof ParsedClient> = {
  fullname: 'full_name',
  name: 'full_name',
  clientname: 'full_name',
  patientname: 'full_name',
  client: 'full_name',
  patient: 'full_name',
  customer: 'full_name',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  mobilenumber: 'phone',
  tel: 'phone',
  telephone: 'phone',
  contact: 'phone',
  contactnumber: 'phone',
  whatsapp: 'phone',
  email: 'email',
  emailaddress: 'email',
  mail: 'email',
  dob: 'date_of_birth',
  dateofbirth: 'date_of_birth',
  birthdate: 'date_of_birth',
  birthday: 'date_of_birth',
  born: 'date_of_birth',
  startdate: 'start_date',
  start: 'start_date',
  datestarted: 'start_date',
  joindate: 'start_date',
  joined: 'start_date',
  joiningdate: 'start_date',
  since: 'start_date',
  firstvisit: 'start_date',
  membersince: 'start_date',
  enrolled: 'start_date',
  enddate: 'end_date',
  end: 'end_date',
  finishdate: 'end_date',
  completiondate: 'end_date',
  expiry: 'end_date',
  expirydate: 'end_date',
  insured: 'insured',
  insurance: 'insured',
  hasinsurance: 'insured',
  covered: 'insured',
  insuranceprovider: 'insurance_provider',
  insurer: 'insurance_provider',
  insurancecompany: 'insurance_provider',
  provider: 'insurance_provider',
  gender: 'gender',
  sex: 'gender',
  notes: 'notes',
  note: 'notes',
  comment: 'notes',
  comments: 'notes',
  remarks: 'notes',
  remark: 'notes',
  description: 'notes',
}

function normalizeGender(v: string): string | null {
  const s = v.trim().toLowerCase()
  if (!s) return null
  if (['f', 'female', 'woman', 'w', 'انثى', 'أنثى'].includes(s)) return 'female'
  if (['m', 'male', 'man', 'ذكر'].includes(s)) return 'male'
  return 'other'
}

/** Coerce a cell (string, number, or Excel Date) into a YYYY-MM-DD string. */
function normalizeDate(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (!s) return null
  // already ISO-ish
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // dd/mm/yyyy or mm/dd/yyyy — ambiguous; assume day-first when >12
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (dmy) {
    const [, a, b, rawY] = dmy
    const y = rawY.length === 2 ? `20${rawY}` : rawY
    // Default to day-first (dd/mm); swap only when the 2nd part can't be a month.
    let day = a, mon = b
    if (Number(b) > 12 && Number(a) <= 12) { day = b; mon = a }
    return `${y}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const parsed = new Date(s)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

function normalizeBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'insured', 'covered', 'نعم', 'مؤمن'].includes(s)
}

/** Map one raw spreadsheet row (header→value) into a ParsedClient. */
export function mapRow(row: Record<string, unknown>): ParsedClient {
  const out: ParsedClient = { ...EMPTY_PARSED }
  for (const [header, value] of Object.entries(row)) {
    const field = HEADER_TO_FIELD[normKey(header)]
    if (!field || value == null || value === '') continue
    if (field === 'date_of_birth') out.date_of_birth = normalizeDate(value)
    else if (field === 'start_date') out.start_date = normalizeDate(value)
    else if (field === 'end_date') out.end_date = normalizeDate(value)
    else if (field === 'insured') out.insured = normalizeBool(value)
    else if (field === 'insurance_provider') out.insurance_provider = str(value) || null
    else if (field === 'gender') out.gender = normalizeGender(str(value))
    else if (field === 'full_name') out.full_name = str(value)
    else if (field === 'phone') out.phone = str(value) || null
    else if (field === 'email') out.email = str(value) || null
  }
  return out
}

/** Parse a spreadsheet/CSV File in the browser into ParsedClient rows. */
export async function parseSpreadsheet(file: File): Promise<ParsedClient[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  })
  return rows.map(mapRow).filter((c) => c.full_name.trim().length > 0)
}

/**
 * Flatten a spreadsheet/CSV File to plain CSV text (all sheets) so it
 * can be handed to the AI extractor as a text part. Robust to any
 * column names / layout — the model reads the literal cells. Capped so
 * a huge sheet can't blow the request size.
 */
export async function spreadsheetToCsv(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  return wb.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false })
    return wb.SheetNames.length > 1 ? `# Sheet: ${name}\n${csv}` : csv
  })
    .join('\n\n')
    .slice(0, 200000)
}

/** Server-side sanitizer — clamp lengths, coerce shape, drop empty names. */
export function sanitizeParsed(input: unknown): ParsedClient[] {
  if (!Array.isArray(input)) return []
  const clamp = (s: unknown, n: number): string | null => {
    if (s == null) return null
    const t = String(s).trim()
    return t ? t.slice(0, n) : null
  }
  const out: ParsedClient[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const full_name = (clamp(r.full_name, 200) ?? '').trim()
    if (!full_name) continue
    const gender = r.gender ? normalizeGender(String(r.gender)) : null
    out.push({
      full_name,
      phone: clamp(r.phone, 40),
      email: clamp(r.email, 200),
      date_of_birth: normalizeDate(r.date_of_birth),
      start_date: normalizeDate(r.start_date),
      end_date: normalizeDate(r.end_date),
      insured: normalizeBool(r.insured),
      insurance_provider: clamp(r.insurance_provider, 120),
      gender,
      notes: clamp(r.notes, 2000),
    })
    if (out.length >= 1000) break
  }
  return out
}
