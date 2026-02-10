import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  loadEnv(mode, ".", ""); // 必要なら読むだけ（キーを埋め込まない）
  return {
    base: "/knee-up-breakout/",

    server: {
      port: 3000,
      host: "0.0.0.0",
    },

    plugins: [react()],

    // ⚠ 公開サイトにAPIキーを埋め込まない（削除）
    // define: {
    //   "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    //   "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    // },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
