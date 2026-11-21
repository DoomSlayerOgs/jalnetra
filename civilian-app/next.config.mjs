// All /api/* calls (SOS, tracking, alerts, shelters...) are forwarded to the command-centre app,
// which owns the data. Set COMMAND_CENTER_URL to wherever the command centre is running.
const target = (
  process.env.COMMAND_CENTER_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
).replace(/\/$/, '')

if (!target) throw new Error('COMMAND_CENTER_URL is required in production (URL of the command-centre app).')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  async rewrites() {
    return { beforeFiles: [{ source: '/api/:path*', destination: `${target}/api/:path*` }] }
  },
}

export default nextConfig
