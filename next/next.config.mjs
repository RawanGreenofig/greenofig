import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: this repo lives inside OneDrive (Desktop\GreenofigV2). OneDrive races
  // with Next's hot-reloader over `.next/` and throws `EINVAL: readlink` errors
  // mid-compile. We can't move `distDir` outside the project (Node would fail
  // to resolve `next/...` from compiled chunks). Instead, `next/.next` is a
  // Windows junction pointing to %LOCALAPPDATA%\greenofig-next-build — OneDrive
  // doesn't sync into junctions, and Node still resolves modules normally
  // because the path is still under the project root.
  images: {
    remotePatterns: [
      // 3D icon set used by the styleguide and product chrome
      {
        protocol: 'https',
        hostname: 'bvconuycpdvgzbvbkijl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
