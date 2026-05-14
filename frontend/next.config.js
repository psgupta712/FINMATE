/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NEXT_PUBLIC_* vars are automatically exposed to the browser bundle
  // when set in .env / .env.local — no need to re-declare them here.
};

module.exports = nextConfig;