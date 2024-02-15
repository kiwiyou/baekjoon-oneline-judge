import { defineConfig, type UserConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig((): UserConfig => {
  return {
    plugins: [qwikCity(), qwikVite(), tsconfigPaths()],
    server: {
      headers: {
        "Cache-Control": "public, max-age=0",
      },
    },
    preview: {
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
    resolve: {
      alias: [
        {
          find: "crypto",
          replacement: "node:crypto",
        },
        {
          find: "events",
          replacement: "node:events",
        },
        {
          find: "url",
          replacement: "node:url",
        },
        {
          find: "util",
          replacement: "node:util",
        },
        {
          find: "net",
          replacement: "node:net",
        },
        {
          find: "tls",
          replacement: "node:tls",
        },
        {
          find: "string_decoder",
          replacement: "node:string_decoder",
        },
      ],
    },
    ssr: {
      external: [
        "node:crypto",
        "node:events",
        "node:url",
        "node:util",
        "node:net",
        "node:tls",
        "node:string_decoder",
      ],
    },
  };
});
