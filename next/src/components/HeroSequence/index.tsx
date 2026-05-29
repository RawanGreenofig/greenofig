/**
 * HeroSequence has been replaced by the cinematic <VideoHero>.
 *
 * This file is now a thin re-export so any lingering `{ HeroSequence }`
 * imports keep working. The old scroll-scrub implementation
 * (FrameCanvas / WordReveal / useScrollFrames and the 40 /frames/*.jpg)
 * is intentionally left in this folder so we can revert if needed.
 */
export { VideoHero as HeroSequence, VideoHero, default } from '@/components/VideoHero'
