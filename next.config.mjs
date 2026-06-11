/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.leaguestat.com' },
      { protocol: 'https', hostname: 'lscluster.hockeytech.com' },
    ],
  },
}

export default nextConfig
