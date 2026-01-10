import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 如果你的项目模板里原本有这个，就保留；如果没有，建议删掉这行以防报错
  // cacheComponents: true, 

  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      // ✅ 修复 1: Casdoor 远程服务器 (头像用)
      {
        protocol: "http",
        hostname: "127.0.0.1", // 只能填 IP，不能带 http://
        port: "8000",             // 端口在这里填
      },
      // ✅ 修复 2: 本地调试用
      {
        protocol: "http",
        hostname: "localhost",    // 只能填域名
        port: "8000",
      },
    ],
  },

  // ✅ 修复 3: 验证码必须的代理转发
  async rewrites() {
    return [
      {
        source: '/casdoor-api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;