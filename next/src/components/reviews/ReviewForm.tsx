'use client'

import { useRef, useState } from 'react'
import { Star, X, Image as ImageIcon, Upload } from 'lucide-react'

interface UploadedPhoto {
  path: string
  url: string
}

interface Props {
  isAr: boolean
  onClose: () => void
  onSubmitted: () => void
}

const MAX_PHOTOS = 5

export function ReviewForm({ isAr, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: FileList) {
    if (uploading) return
    if (photos.length >= MAX_PHOTOS) {
      setError(
        isAr
          ? `الحد الأقصى ${MAX_PHOTOS} صور`
          : `Up to ${MAX_PHOTOS} photos`,
      )
      return
    }
    setUploading(true)
    setError('')
    const newPhotos: UploadedPhoto[] = []
    for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/reviews/upload-photo', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? 'Upload failed')
        }
        const j = (await res.json()) as UploadedPhoto
        newPhotos.push(j)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
        break
      }
    }
    setPhotos((p) => [...p, ...newPhotos])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (rating < 1 || rating > 5) {
      setError(isAr ? 'اختر تقييماً من 1 إلى 5' : 'Pick a 1-5 star rating')
      return
    }
    if (body.trim().length < 10) {
      setError(
        isAr
          ? 'مراجعتك يجب أن تكون 10 أحرف على الأقل'
          : 'Your review must be at least 10 characters',
      )
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          body: body.trim(),
          photoPaths: photos.map((p) => p.path),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Could not submit review')
      }
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const activeRating = hoverRating || rating

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl p-6 max-w-3xl mx-auto"
      style={{
        background: 'rgba(8, 20, 10, 0.55)',
        border: '1px solid rgba(163,230,53,0.35)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-fg-1">
            {isAr ? 'شارك تجربتك' : 'Share your experience'}
          </h2>
          <p className="text-sm text-fg-3 mt-0.5">
            {isAr
              ? 'مراجعتك تساعد آخرين على اتخاذ قرار جيد.'
              : 'Your review helps other members make a good call.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-3 hover:text-fg-1 transition-colors"
          aria-label={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Star rating */}
      <div className="mb-5">
        <label className="block text-xs uppercase tracking-eyebrow text-fg-3 mb-2">
          {isAr ? 'تقييمك' : 'Your rating'} *
        </label>
        <div
          className="inline-flex items-center gap-1"
          onMouseLeave={() => setHoverRating(0)}
          dir="ltr"
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= activeRating
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >
                <Star
                  width={28}
                  height={28}
                  fill={filled ? 'var(--gf-amber)' : 'transparent'}
                  stroke={filled ? 'var(--gf-amber)' : 'rgba(255,255,255,0.35)'}
                  strokeWidth={1.5}
                />
              </button>
            )
          })}
          <span className="ml-2 text-sm text-fg-2 font-mono">
            {activeRating ? `${activeRating}/5` : ''}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-xs uppercase tracking-eyebrow text-fg-3 mb-1.5">
          {isAr ? 'عنوان (اختياري)' : 'Title (optional)'}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder={
            isAr
              ? 'مثلاً: غيّرت طريقة تفكيري في الطعام'
              : 'e.g. Changed how I think about food'
          }
          className="w-full h-11 rounded-lg px-3 text-sm"
          style={{
            background: 'rgba(8, 20, 10, 0.45)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#f3f4f6',
          }}
        />
      </div>

      {/* Body */}
      <div className="mb-4">
        <label className="block text-xs uppercase tracking-eyebrow text-fg-3 mb-1.5">
          {isAr ? 'مراجعتك' : 'Your review'} *
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          placeholder={
            isAr
              ? 'ما الذي نجح؟ ما الذي تعلمته؟ هل تنصح به آخرين؟'
              : 'What worked? What did you learn? Would you recommend it?'
          }
          className="w-full rounded-lg p-3 text-sm leading-relaxed"
          style={{
            background: 'rgba(8, 20, 10, 0.45)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#f3f4f6',
          }}
        />
        <p className="mt-1 text-[11px] text-fg-3">
          {body.trim().length}/4000
        </p>
      </div>

      {/* Photos */}
      <div className="mb-5">
        <label className="block text-xs uppercase tracking-eyebrow text-fg-3 mb-2">
          {isAr ? `صور (اختياري — حتى ${MAX_PHOTOS})` : `Photos (optional — up to ${MAX_PHOTOS})`}
        </label>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div
              key={p.path}
              className="relative w-20 h-20 rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--gf-border)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((arr) => arr.filter((x) => x.path !== p.path))}
                className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                aria-label="Remove"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-lg inline-flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.20)',
                color: 'var(--gf-fg-3)',
              }}
            >
              {uploading ? (
                <span className="text-[10px]">{isAr ? 'جارٍ الرفع' : 'Uploading'}</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" strokeWidth={1.75} />
                  <span className="text-[10px]">{isAr ? 'إضافة' : 'Add'}</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void uploadFiles(e.target.files)
              }
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-3 inline-flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {isAr
            ? 'JPEG / PNG / WebP — حتى 5 ميغابايت لكل صورة'
            : 'JPEG / PNG / WebP — up to 5 MB each'}
        </p>
      </div>

      {error && (
        <p className="text-sm mb-3" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="text-xs inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="btn-primary inline-flex"
          style={{ height: 44, padding: '0 24px', fontSize: 14, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting
            ? isAr
              ? 'جارٍ النشر…'
              : 'Posting…'
            : isAr
              ? 'انشر المراجعة'
              : 'Post review'}
        </button>
      </div>
    </form>
  )
}
