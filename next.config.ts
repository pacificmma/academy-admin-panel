// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Strict Mode'u kapatın - React 19 ile uyumluluk sorunu olabilir
  reactStrictMode: false,
  
  // CSS optimizasyonları
  experimental: {
    // CSS chunking'i devre dışı bırak - styled component çakışmalarını önler
    cssChunking: false,
    
    // ESM externals'ı etkinleştir - MUI optimizasyonu için
    esmExternals: true,
    
    // Hydration hata ayıklama - MUI paketlerini optimize et
    optimizePackageImports: ['@mui/material', '@mui/icons-material']
  },
  
  // Compiler optimizasyonları
  compiler: {
    // styled-jsx'i tamamen devre dışı bırak
    styledComponents: false,
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Webpack konfigürasyonu
  webpack: (config, { dev, isServer }) => {
    // CSS injection order düzeltmesi
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration - mevcut ayarınızı koruyorum
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;