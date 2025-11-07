/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'res.cloudinary.com',
      'supabasekong-ekkowggsogww84gwgsowccso.31.97.34.56.sslip.io'
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'supabasekong-ekkowggsogww84gwgsowccso.31.97.34.56.sslip.io',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig