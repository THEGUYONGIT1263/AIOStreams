import type { NextConfig } from 'next';
import dotenv from 'dotenv';
import path from 'path';

try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch (error) {
  console.error('Error loading .env file:', error);
}

const branding =
  process.env.NEXT_PUBLIC_ELFHOSTED_BRANDING ?? process.env.BRANDING;

if (branding) {
  console.log(`Branding set`);
} else {
  console.log('No branding was set');
}

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BRANDING: branding,
  },
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false, // the solution
    };
    return config;
  },
};

export default nextConfig;
