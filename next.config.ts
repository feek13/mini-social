import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用生产优化
  compress: true,

  // 优化图片
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
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

  // 实验性功能
  // experimental: {
  //   optimizeCss: true, // 暂时禁用，因为 Vercel 构建时缺少 critters 依赖
  // },

  // 禁用 x-powered-by 头
  poweredByHeader: false,
};

export default nextConfig;
