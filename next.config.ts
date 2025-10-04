import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用生产优化
  compress: true,
  reactStrictMode: true,

  // 优化图片
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/7.x/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 生产环境移除 console.log
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 实验性功能
  experimental: {
    // optimizePackageImports: ['lucide-react'], // 优化包导入
  },

  // 禁用 x-powered-by 头
  poweredByHeader: false,

  // 页面扩展名
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;
