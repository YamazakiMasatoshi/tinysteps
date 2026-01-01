import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fast Refreshを明示的に有効化
  reactStrictMode: true,
  
  // 注: webpack設定を削除しました
  // - パスエイリアス（@/*）はtsconfig.jsonのpaths設定で自動的に動作します
  // - VercelビルドでTurbopackが使用されるため、webpack設定があるとエラーになります
  // - 開発環境でのポーリング設定は失われますが、通常のホットリロードは動作します
};

export default nextConfig;
