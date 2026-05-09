'use client'

import { useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Bucket = 'avatars' | 'posts' | 'recipes' | 'product-photos' | 'research-docs'

/**
 * Lightweight file picker that uploads straight to Supabase Storage and
 * hands back the public URL (or storage path for private buckets).
 *
 * The button itself is rendered by `children` so each call site keeps its
 * own visual treatment — pass the existing pill/button JSX in.
 */
export function UploadButton({
  bucket,
  pathPrefix,
  accept,
  onUploaded,
  children,
  className,
  disabled,
  /** When true, returns the storage path instead of public URL — for
   *  private buckets like research-docs. */
  privateBucket,
}: {
  bucket: Bucket
  /** Path prefix inside the bucket. The final object key is
   *  `${pathPrefix}/${timestamp}-${original-name}`. Trailing slash optional. */
  pathPrefix: string
  /** Accept attribute for the file input — e.g. "image/*" or ".pdf". */
  accept: string
  onUploaded: (urlOrPath: string, file: File) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  privateBucket?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so the same file can be picked twice
    if (!file) return

    const supabase = getBrowserSupabase()
    if (!supabase) {
      toast.error('Storage unavailable')
      return
    }
    setBusy(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
      const key = `${pathPrefix.replace(/\/$/, '')}/${Date.now()}-${safe}`
      const { error } = await supabase.storage
        .from(bucket)
        .upload(key, file, { contentType: file.type, upsert: false })
      if (error) {
        toast.error(error.message || 'Upload failed')
        return
      }
      let result: string
      if (privateBucket) {
        result = key
      } else {
        const { data } = supabase.storage.from(bucket).getPublicUrl(key)
        result = data.publicUrl
      }
      onUploaded(result, file)
      toast.success('Uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className={className}
      >
        {busy ? 'Uploading…' : children}
      </button>
    </>
  )
}
