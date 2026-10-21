import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // O Tailwind 4 é processado pelo loader do Turbopack (@tailwindcss/turbopack),
  // como o create-next-app 16.4 cria; por isso não existe postcss.config.mjs.
  // Consequência: um build com webpack (next build --webpack) não processaria o Tailwind.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
