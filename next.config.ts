import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Windows環境でのホットリロードを有効にするための設定
  webpack: (config, { dev }) => {
    if (dev) {
      // クライアント側とサーバー側の両方でポーリングを有効化
      config.watchOptions = {
        poll: 500, // 0.5秒ごとにファイル変更をチェック（より頻繁にチェック）
        aggregateTimeout: 200, // 変更をまとめて処理するまでの待機時間（ミリ秒）
        ignored: /node_modules/, // node_modulesは監視対象外
      };
    }
    
    // パスエイリアスの設定（@/* を src/* にマッピング）
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
      };
    }
    
    return config;
  },
  // Fast Refreshを明示的に有効化
  reactStrictMode: true,
};

export default nextConfig;