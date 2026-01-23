// vite.config.ts
import { defineConfig } from "file:///C:/Users/imeep/Desktop/shopify/weibo-pro/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.30_lightningcss@1.30.2_sass@1.51.0_terser@5.46.0/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/imeep/Desktop/shopify/weibo-pro/node_modules/.pnpm/@vitejs+plugin-react-swc@4.2.2_@swc+helpers@0.5.18_vite@5.4.21_@types+node@20.19.30_lightning_kfpql37zogdzjgfr4b45njgw44/node_modules/@vitejs/plugin-react-swc/index.js";
import tailwindcss from "file:///C:/Users/imeep/Desktop/shopify/weibo-pro/node_modules/.pnpm/@tailwindcss+vite@4.1.18_vite@5.4.21_@types+node@20.19.30_lightningcss@1.30.2_sass@1.51.0_terser@5.46.0_/node_modules/@tailwindcss/vite/dist/index.mjs";
import swc from "file:///C:/Users/imeep/Desktop/shopify/weibo-pro/node_modules/.pnpm/vite-plugin-swc-transform@1.1.1_@swc+helpers@0.5.18_rollup@4.55.3_vite@5.4.21_@types+node@20._42uncoprah4swfgcaw2gbxwdu4/node_modules/vite-plugin-swc-transform/dist/esm/index.js";
import path, { join, resolve } from "path";
import { homedir } from "os";
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
var __vite_injected_original_dirname = "C:\\Users\\imeep\\Desktop\\shopify\\weibo-pro\\apps\\bigscreen";
function fixThreeJsPlugin() {
  return {
    name: "fix-three-js",
    enforce: "pre",
    resolveId(id, importer, options) {
      return null;
    }
  };
}
var vite_config_default = defineConfig(({ command }) => {
  const projectOutDir = resolve(__vite_injected_original_dirname, "dist");
  const deployOutDir = join(homedir(), "sker/nginx/html");
  const isBuild = command === "build";
  const mirrorOutputPlugin = {
    name: "mirror-output-to-nginx",
    closeBundle() {
      if (!existsSync(projectOutDir)) return;
      if (existsSync(deployOutDir)) {
        rmSync(deployOutDir, { recursive: true, force: true });
      }
      mkdirSync(deployOutDir, { recursive: true });
      cpSync(projectOutDir, deployOutDir, { recursive: true });
    }
  };
  return {
    plugins: [
      fixThreeJsPlugin(),
      react(),
      tailwindcss(),
      swc({
        swcOptions: {
          jsc: {
            target: "es2022",
            parser: {
              syntax: "typescript",
              tsx: true,
              decorators: true
            },
            transform: {
              legacyDecorator: true,
              decoratorMetadata: true,
              useDefineForClassFields: false
            }
          }
        }
      }),
      ...isBuild ? [mirrorOutputPlugin] : []
    ],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      },
      // 确保所有模块使用同一个 React 实例，避免 "Cannot access 'React' before initialization" 错误
      dedupe: ["react", "react-dom"]
    },
    server: {
      host: true,
      // SharedArrayBuffer 支持所需的安全头
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      },
      proxy: {
        // SSE 专用代理配置 - 必须在普通 API 之前
        "/api/sse": {
          target: "http://localhost:8089",
          changeOrigin: true,
          secure: false,
          // SSE 关键配置：禁用响应缓冲，允许流式传输
          configure: (proxy, options) => {
            proxy.on("proxyReq", (proxyReq, req, res) => {
              proxyReq.setHeader("Accept", "text/event-stream");
              proxyReq.setHeader("Cache-Control", "no-cache");
              proxyReq.setHeader("Connection", "keep-alive");
            });
            proxy.on("proxyRes", (proxyRes, req, res) => {
              proxyRes.headers["content-type"] = "text/event-stream";
              proxyRes.headers["cache-control"] = "no-cache";
              proxyRes.headers["connection"] = "keep-alive";
            });
          }
        },
        // 普通 API 代理
        "/api": {
          target: "http://localhost:8089",
          changeOrigin: true,
          secure: false
        },
        // WebSocket 代理
        "/ws": {
          target: "ws://localhost:8089",
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    },
    build: {
      outDir: projectOutDir,
      target: "es2020",
      sourcemap: true,
      // 启用 sourcemap 用于调试
      cssCodeSplit: true,
      // 启用CSS代码分割
      assetsInlineLimit: 4096,
      // 小于4KB的资源内联
      // 压缩配置 - 启用以减小生产包体积
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: false,
          // 保留 console 用于生产调试
          drop_debugger: true,
          reduce_vars: true,
          reduce_funcs: true,
          passes: 2
          // 多次压缩以获得更好的效果
        },
        mangle: {
          safari10: true,
          toplevel: true
          // 顶级作用域变量名混淆
        },
        format: {
          comments: false
        }
      },
      chunkSizeWarningLimit: 1e3,
      // 提高警告阈值到 1MB
      rollupOptions: {
        output: {
          // 简化代码分割策略 - 只分离真正独立的大型库
          // 避免复杂的 chunk 分割导致的循环依赖问题
          manualChunks(id) {
            if (id.includes("@sker/")) {
              return void 0;
            }
            if (id.includes("better-auth")) {
              return void 0;
            }
            if (id.includes("node_modules")) {
              if (id.includes("echarts") || id.includes("zrender")) {
                return "vendor-echarts";
              }
              if (id.includes("/three/") || id.includes("three-") || id.includes("d3-force") || id.includes("force-graph") || id.includes("react-force-graph")) {
                return "vendor-3d";
              }
            }
            return void 0;
          },
          // 文件命名优化
          chunkFileNames: "assets/js/[name]-[hash:8].js",
          entryFileNames: "assets/js/[name]-[hash:8].js",
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const extType = info[info.length - 1];
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || "")) {
              return `assets/media/[name]-[hash:8][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test(assetInfo.name || "")) {
              return `assets/images/[name]-[hash:8][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || "")) {
              return `assets/fonts/[name]-[hash:8][extname]`;
            }
            if (/\.css$/i.test(assetInfo.name || "")) {
              return `assets/css/[name]-[hash:8][extname]`;
            }
            return `assets/misc/[name]-[hash:8][extname]`;
          }
        },
        // Tree shaking优化
        treeshake: {
          moduleSideEffects: (id) => {
            if (id.includes(".test.") || id.includes(".spec.")) return false;
            return true;
          },
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        }
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      force: true,
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "axios",
        "dayjs",
        "clsx",
        "tailwind-merge",
        "zustand",
        "lucide-react",
        "rxjs",
        "rxjs/operators",
        "better-auth/client"
        // 强制预构建 better-auth
      ],
      exclude: ["echarts", "web-vitals", "@sker/core", "@sker/workflow", "@sker/workflow-ui", "three"],
      esbuildOptions: {
        target: "es2020"
      }
    },
    // SSR 配置 - 强制 three.js 使用 ESM
    ssr: {
      noExternal: ["three"]
    },
    // Web Worker 支持
    worker: {
      format: "es",
      plugins: () => [
        react(),
        swc({
          swcOptions: {
            jsc: {
              target: "es2022",
              parser: {
                syntax: "typescript",
                tsx: false
                // Worker 中不使用 TSX
              }
            }
          }
        })
      ],
      rollupOptions: {
        output: {
          format: "es"
        }
      }
    },
    // CSS优化
    css: {
      devSourcemap: false,
      modules: {
        generateScopedName: command === "build" ? "[hash:base64:5]" : "[local]_[hash:base64:5]"
      }
    },
    // 预加载优化
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        return { relative: true };
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxpbWVlcFxcXFxEZXNrdG9wXFxcXHNob3BpZnlcXFxcd2VpYm8tcHJvXFxcXGFwcHNcXFxcYmlnc2NyZWVuXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxpbWVlcFxcXFxEZXNrdG9wXFxcXHNob3BpZnlcXFxcd2VpYm8tcHJvXFxcXGFwcHNcXFxcYmlnc2NyZWVuXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9pbWVlcC9EZXNrdG9wL3Nob3BpZnkvd2VpYm8tcHJvL2FwcHMvYmlnc2NyZWVuL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0eXBlIFBsdWdpbk9wdGlvbiwgdHlwZSBQbHVnaW4gfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJ1xyXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXHJcbmltcG9ydCBzd2MgZnJvbSAndml0ZS1wbHVnaW4tc3djLXRyYW5zZm9ybSdcclxuaW1wb3J0IHBhdGgsIHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXHJcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdvcydcclxuaW1wb3J0IHsgY3BTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJtU3luYyB9IGZyb20gJ2ZzJ1xyXG5cclxuLy8gXHU0RkVFXHU1OTBEIHRocmVlLmpzIFx1ODlFM1x1Njc5MFx1OTVFRVx1OTg5OFx1NzY4NFx1NjNEMlx1NEVGNlxyXG5mdW5jdGlvbiBmaXhUaHJlZUpzUGx1Z2luKCk6IFBsdWdpbiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICdmaXgtdGhyZWUtanMnLFxyXG4gICAgZW5mb3JjZTogJ3ByZScsXHJcbiAgICByZXNvbHZlSWQoaWQsIGltcG9ydGVyLCBvcHRpb25zKSB7XHJcbiAgICAgIC8vIFx1OEJBOSBWaXRlIFx1ODFFQVx1NzEzNlx1ODlFM1x1Njc5MCB0aHJlZVx1RkYwQ1x1NEUwRFx1OTcwMFx1ODk4MVx1NjI0Qlx1NTJBOFx1NUU3Mlx1OTg4NFxyXG4gICAgICAvLyBcdTU2RTBcdTRFM0EgcGFja2FnZS5qc29uIFx1NzY4NCBleHBvcnRzIFx1NUI1N1x1NkJCNVx1NEYxQVx1NkI2M1x1Nzg2RVx1NjMwN1x1NTQxMVx1NTE2NVx1NTNFM1xyXG4gICAgICByZXR1cm4gbnVsbFxyXG4gICAgfSxcclxuICB9XHJcbn1cclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+IHtcclxuICBjb25zdCBwcm9qZWN0T3V0RGlyID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdkaXN0JylcclxuICBjb25zdCBkZXBsb3lPdXREaXIgPSBqb2luKGhvbWVkaXIoKSwgJ3NrZXIvbmdpbngvaHRtbCcpXHJcbiAgY29uc3QgaXNCdWlsZCA9IGNvbW1hbmQgPT09ICdidWlsZCdcclxuXHJcbiAgY29uc3QgbWlycm9yT3V0cHV0UGx1Z2luID0ge1xyXG4gICAgbmFtZTogJ21pcnJvci1vdXRwdXQtdG8tbmdpbngnLFxyXG4gICAgY2xvc2VCdW5kbGUoKSB7XHJcbiAgICAgIGlmICghZXhpc3RzU3luYyhwcm9qZWN0T3V0RGlyKSkgcmV0dXJuXHJcblxyXG4gICAgICBpZiAoZXhpc3RzU3luYyhkZXBsb3lPdXREaXIpKSB7XHJcbiAgICAgICAgcm1TeW5jKGRlcGxveU91dERpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIG1rZGlyU3luYyhkZXBsb3lPdXREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXHJcbiAgICAgIGNwU3luYyhwcm9qZWN0T3V0RGlyLCBkZXBsb3lPdXREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXHJcbiAgICB9LFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgZml4VGhyZWVKc1BsdWdpbigpLFxyXG4gICAgICByZWFjdCgpIGFzIFBsdWdpbk9wdGlvbixcclxuICAgICAgdGFpbHdpbmRjc3MoKSBhcyBQbHVnaW5PcHRpb24sXHJcbiAgICAgIHN3Yyh7XHJcbiAgICAgICAgc3djT3B0aW9uczoge1xyXG4gICAgICAgICAganNjOiB7XHJcbiAgICAgICAgICAgIHRhcmdldDogJ2VzMjAyMicsXHJcbiAgICAgICAgICAgIHBhcnNlcjoge1xyXG4gICAgICAgICAgICAgIHN5bnRheDogJ3R5cGVzY3JpcHQnLFxyXG4gICAgICAgICAgICAgIHRzeDogdHJ1ZSxcclxuICAgICAgICAgICAgICBkZWNvcmF0b3JzOiB0cnVlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm06IHtcclxuICAgICAgICAgICAgICBsZWdhY3lEZWNvcmF0b3I6IHRydWUsXHJcbiAgICAgICAgICAgICAgZGVjb3JhdG9yTWV0YWRhdGE6IHRydWUsXHJcbiAgICAgICAgICAgICAgdXNlRGVmaW5lRm9yQ2xhc3NGaWVsZHM6IGZhbHNlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSBhcyBQbHVnaW5PcHRpb24sXHJcbiAgICAgIC4uLihpc0J1aWxkID8gW21pcnJvck91dHB1dFBsdWdpbl0gOiBbXSksXHJcbiAgICBdLFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIFx1Nzg2RVx1NEZERFx1NjI0MFx1NjcwOVx1NkEyMVx1NTc1N1x1NEY3Rlx1NzUyOFx1NTQwQ1x1NEUwMFx1NEUyQSBSZWFjdCBcdTVCOUVcdTRGOEJcdUZGMENcdTkwN0ZcdTUxNEQgXCJDYW5ub3QgYWNjZXNzICdSZWFjdCcgYmVmb3JlIGluaXRpYWxpemF0aW9uXCIgXHU5NTE5XHU4QkVGXHJcbiAgICAgIGRlZHVwZTogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuICAgICAgLy8gU2hhcmVkQXJyYXlCdWZmZXIgXHU2NTJGXHU2MzAxXHU2MjQwXHU5NzAwXHU3Njg0XHU1Qjg5XHU1MTY4XHU1OTM0XHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3knOiAnc2FtZS1vcmlnaW4nLFxyXG4gICAgICAgICdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JzogJ3JlcXVpcmUtY29ycCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb3h5OiB7XHJcbiAgICAgICAgLy8gU1NFIFx1NEUxM1x1NzUyOFx1NEVFM1x1NzQwNlx1OTE0RFx1N0Y2RSAtIFx1NUZDNVx1OTg3Qlx1NTcyOFx1NjY2RVx1OTAxQSBBUEkgXHU0RTRCXHU1MjREXHJcbiAgICAgICAgJy9hcGkvc3NlJzoge1xyXG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDg5JyxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgICAvLyBTU0UgXHU1MTczXHU5NTJFXHU5MTREXHU3RjZFXHVGRjFBXHU3OTgxXHU3NTI4XHU1NENEXHU1RTk0XHU3RjEzXHU1MUIyXHVGRjBDXHU1MTQxXHU4QkI4XHU2RDQxXHU1RjBGXHU0RjIwXHU4RjkzXHJcbiAgICAgICAgICBjb25maWd1cmU6IChwcm94eSwgb3B0aW9ucykgPT4ge1xyXG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgICAgLy8gXHU4QkJFXHU3RjZFXHU2QjYzXHU3ODZFXHU3Njg0IFNTRSBcdThCRjdcdTZDNDJcdTU5MzRcclxuICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0FjY2VwdCcsICd0ZXh0L2V2ZW50LXN0cmVhbScpO1xyXG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICduby1jYWNoZScpO1xyXG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignQ29ubmVjdGlvbicsICdrZWVwLWFsaXZlJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgICAgLy8gXHU3ODZFXHU0RkREXHU1NENEXHU1RTk0XHU1OTM0XHU2NTJGXHU2MzAxIFNTRVxyXG4gICAgICAgICAgICAgIHByb3h5UmVzLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gJ3RleHQvZXZlbnQtc3RyZWFtJztcclxuICAgICAgICAgICAgICBwcm94eVJlcy5oZWFkZXJzWydjYWNoZS1jb250cm9sJ10gPSAnbm8tY2FjaGUnO1xyXG4gICAgICAgICAgICAgIHByb3h5UmVzLmhlYWRlcnNbJ2Nvbm5lY3Rpb24nXSA9ICdrZWVwLWFsaXZlJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBcdTY2NkVcdTkwMUEgQVBJIFx1NEVFM1x1NzQwNlxyXG4gICAgICAgICcvYXBpJzoge1xyXG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDg5JyxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIHNlY3VyZTogZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIFdlYlNvY2tldCBcdTRFRTNcdTc0MDZcclxuICAgICAgICAnL3dzJzoge1xyXG4gICAgICAgICAgdGFyZ2V0OiAnd3M6Ly9sb2NhbGhvc3Q6ODA4OScsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgICAgd3M6IHRydWUsXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgb3V0RGlyOiBwcm9qZWN0T3V0RGlyLFxyXG4gICAgICB0YXJnZXQ6ICdlczIwMjAnLFxyXG4gICAgICBzb3VyY2VtYXA6IHRydWUsIC8vIFx1NTQyRlx1NzUyOCBzb3VyY2VtYXAgXHU3NTI4XHU0RThFXHU4QzAzXHU4QkQ1XHJcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSwgLy8gXHU1NDJGXHU3NTI4Q1NTXHU0RUUzXHU3ODAxXHU1MjA2XHU1MjcyXHJcbiAgICAgIGFzc2V0c0lubGluZUxpbWl0OiA0MDk2LCAvLyBcdTVDMEZcdTRFOEU0S0JcdTc2ODRcdThENDRcdTZFOTBcdTUxODVcdTgwNTRcclxuXHJcbiAgICAgIC8vIFx1NTM4Qlx1N0YyOVx1OTE0RFx1N0Y2RSAtIFx1NTQyRlx1NzUyOFx1NEVFNVx1NTFDRlx1NUMwRlx1NzUxRlx1NEVBN1x1NTMwNVx1NEY1M1x1NzlFRlxyXG4gICAgICBtaW5pZnk6ICd0ZXJzZXInLFxyXG4gICAgICB0ZXJzZXJPcHRpb25zOiB7XHJcbiAgICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsIC8vIFx1NEZERFx1NzU1OSBjb25zb2xlIFx1NzUyOFx1NEU4RVx1NzUxRlx1NEVBN1x1OEMwM1x1OEJENVxyXG4gICAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcclxuICAgICAgICAgIHJlZHVjZV92YXJzOiB0cnVlLFxyXG4gICAgICAgICAgcmVkdWNlX2Z1bmNzOiB0cnVlLFxyXG4gICAgICAgICAgcGFzc2VzOiAyLCAvLyBcdTU5MUFcdTZCMjFcdTUzOEJcdTdGMjlcdTRFRTVcdTgzQjdcdTVGOTdcdTY2RjRcdTU5N0RcdTc2ODRcdTY1NDhcdTY3OUNcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmdsZToge1xyXG4gICAgICAgICAgc2FmYXJpMTA6IHRydWUsXHJcbiAgICAgICAgICB0b3BsZXZlbDogdHJ1ZSwgLy8gXHU5ODc2XHU3RUE3XHU0RjVDXHU3NTI4XHU1N0RGXHU1M0Q4XHU5MUNGXHU1NDBEXHU2REY3XHU2REM2XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgIGNvbW1lbnRzOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLCAvLyBcdTYzRDBcdTlBRDhcdThCNjZcdTU0NEFcdTk2MDhcdTUwM0NcdTUyMzAgMU1CXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIC8vIFx1N0I4MFx1NTMxNlx1NEVFM1x1NzgwMVx1NTIwNlx1NTI3Mlx1N0I1Nlx1NzU2NSAtIFx1NTNFQVx1NTIwNlx1NzlCQlx1NzcxRlx1NkI2M1x1NzJFQ1x1N0FDQlx1NzY4NFx1NTkyN1x1NTc4Qlx1NUU5M1xyXG4gICAgICAgICAgLy8gXHU5MDdGXHU1MTREXHU1OTBEXHU2NzQyXHU3Njg0IGNodW5rIFx1NTIwNlx1NTI3Mlx1NUJGQ1x1ODFGNFx1NzY4NFx1NUZBQVx1NzNBRlx1NEY5RFx1OEQ1Nlx1OTVFRVx1OTg5OFxyXG4gICAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICAgIC8vIEBza2VyLyogXHU1MzA1XHU0RTBEXHU1MjA2XHU1MjcyXHVGRjBDXHU0RkREXHU2MzAxXHU1NzI4XHU0RTNCIGJ1bmRsZSBcdTRFMkRcdTRFRTVcdTc4NkVcdTRGRERcdTZCNjNcdTc4NkVcdTc2ODRcdTUyMURcdTU5Q0JcdTUzMTZcdTk4N0FcdTVFOEZcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAc2tlci8nKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIFx1NEUwRFx1NTIwNlx1NTI3MlxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBiZXR0ZXItYXV0aCBcdTRFNUZcdTRFMERcdTUyMDZcdTUyNzJcdUZGMENcdTkwN0ZcdTUxNERcdTUyMURcdTU5Q0JcdTUzMTZcdTk4N0FcdTVFOEZcdTk1RUVcdTk4OThcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdiZXR0ZXItYXV0aCcpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDsgLy8gXHU0RTBEXHU1MjA2XHU1MjcyXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFx1NTNFQVx1NTIwNlx1NzlCQlx1NzcxRlx1NkI2M1x1NzJFQ1x1N0FDQlx1NzY4NFx1NTkyN1x1NTc4Qlx1NUU5M1xyXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XHJcbiAgICAgICAgICAgICAgLy8gRUNoYXJ0cyAtIFx1NUI4Q1x1NTE2OFx1NzJFQ1x1N0FDQlx1NzY4NFx1NTZGRVx1ODg2OFx1NUU5M1xyXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZWNoYXJ0cycpIHx8IGlkLmluY2x1ZGVzKCd6cmVuZGVyJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWVjaGFydHMnXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIC8vIFRocmVlLmpzIFx1NzZGOFx1NTE3MyAtIFx1NUI4Q1x1NTE2OFx1NzJFQ1x1N0FDQlx1NzY4NCAzRCBcdTVFOTNcclxuICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnL3RocmVlLycpIHx8XHJcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygndGhyZWUtJykgfHxcclxuICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdkMy1mb3JjZScpIHx8XHJcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnZm9yY2UtZ3JhcGgnKSB8fFxyXG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlYWN0LWZvcmNlLWdyYXBoJylcclxuICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLTNkJ1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBcdTUxNzZcdTRFRDZcdTYyNDBcdTY3MDlcdTRGOURcdThENTZcdTRGRERcdTYzMDFcdTU3MjhcdTRFM0IgYnVuZGxlIFx1NEUyRFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NUZBQVx1NzNBRlx1NEY5RFx1OEQ1NlxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAvLyBcdTY1ODdcdTRFRjZcdTU0N0RcdTU0MERcdTRGMThcdTUzMTZcclxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaDo4XS5qcycsXHJcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0tW2hhc2g6OF0uanMnLFxyXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGFzc2V0SW5mby5uYW1lPy5zcGxpdCgnLicpIHx8IFtdXHJcbiAgICAgICAgICAgIGNvbnN0IGV4dFR5cGUgPSBpbmZvW2luZm8ubGVuZ3RoIC0gMV1cclxuXHJcbiAgICAgICAgICAgIC8vIFx1NjgzOVx1NjM2RVx1OEQ0NFx1NkU5MFx1N0M3Qlx1NTc4Qlx1NTIwNlx1NzZFRVx1NUY1NVxyXG4gICAgICAgICAgICBpZiAoL1xcLihtcDR8d2VibXxvZ2d8bXAzfHdhdnxmbGFjfGFhYykoXFw/LiopPyQvaS50ZXN0KGFzc2V0SW5mby5uYW1lIHx8ICcnKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL21lZGlhL1tuYW1lXS1baGFzaDo4XVtleHRuYW1lXWBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoL1xcLihwbmd8anBlP2d8Z2lmfHN2Z3x3ZWJwfGF2aWYpKFxcPy4qKT8kL2kudGVzdChhc3NldEluZm8ubmFtZSB8fCAnJykpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9pbWFnZXMvW25hbWVdLVtoYXNoOjhdW2V4dG5hbWVdYFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICgvXFwuKHdvZmYyP3xlb3R8dHRmfG90ZikoXFw/LiopPyQvaS50ZXN0KGFzc2V0SW5mby5uYW1lIHx8ICcnKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2ZvbnRzL1tuYW1lXS1baGFzaDo4XVtleHRuYW1lXWBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoL1xcLmNzcyQvaS50ZXN0KGFzc2V0SW5mby5uYW1lIHx8ICcnKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2Nzcy9bbmFtZV0tW2hhc2g6OF1bZXh0bmFtZV1gXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL21pc2MvW25hbWVdLVtoYXNoOjhdW2V4dG5hbWVdYFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBUcmVlIHNoYWtpbmdcdTRGMThcdTUzMTZcclxuICAgICAgICB0cmVlc2hha2U6IHtcclxuICAgICAgICAgIG1vZHVsZVNpZGVFZmZlY3RzOiAoaWQpID0+IHtcclxuICAgICAgICAgICAgLy8gXHU2MzkyXHU5NjY0XHU2RDRCXHU4QkQ1XHU2NTg3XHU0RUY2XHU3Njg0XHU1MjZGXHU0RjVDXHU3NTI4XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnLnRlc3QuJykgfHwgaWQuaW5jbHVkZXMoJy5zcGVjLicpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIC8vIFx1NTE3Nlx1NEVENlx1NjI0MFx1NjcwOVx1NkEyMVx1NTc1N1x1NEZERFx1NzU1OVx1NTI2Rlx1NEY1Q1x1NzUyOFx1RkYwOFx1OUVEOFx1OEJBNFx1ODg0Q1x1NEUzQVx1RkYwOVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBwcm9wZXJ0eVJlYWRTaWRlRWZmZWN0czogZmFsc2UsXHJcbiAgICAgICAgICB0cnlDYXRjaERlb3B0aW1pemF0aW9uOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcdTRGMThcdTUzMTZcdTRGOURcdThENTZcdTk4ODRcdTY3ODRcdTVFRkFcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICBmb3JjZTogdHJ1ZSxcclxuICAgICAgaW5jbHVkZTogW1xyXG4gICAgICAgICdyZWFjdCcsXHJcbiAgICAgICAgJ3JlYWN0LWRvbScsXHJcbiAgICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxyXG4gICAgICAgICdheGlvcycsXHJcbiAgICAgICAgJ2RheWpzJyxcclxuICAgICAgICAnY2xzeCcsXHJcbiAgICAgICAgJ3RhaWx3aW5kLW1lcmdlJyxcclxuICAgICAgICAnenVzdGFuZCcsXHJcbiAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXHJcbiAgICAgICAgJ3J4anMnLFxyXG4gICAgICAgICdyeGpzL29wZXJhdG9ycycsXHJcbiAgICAgICAgJ2JldHRlci1hdXRoL2NsaWVudCcgIC8vIFx1NUYzQVx1NTIzNlx1OTg4NFx1Njc4NFx1NUVGQSBiZXR0ZXItYXV0aFxyXG4gICAgICBdLFxyXG4gICAgICBleGNsdWRlOiBbJ2VjaGFydHMnLCAnd2ViLXZpdGFscycsICdAc2tlci9jb3JlJywgJ0Bza2VyL3dvcmtmbG93JywgJ0Bza2VyL3dvcmtmbG93LXVpJywgJ3RocmVlJ10sXHJcbiAgICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcclxuICAgICAgfSxcclxuICAgIH0sXHJcblxyXG4gICAgLy8gU1NSIFx1OTE0RFx1N0Y2RSAtIFx1NUYzQVx1NTIzNiB0aHJlZS5qcyBcdTRGN0ZcdTc1MjggRVNNXHJcbiAgICBzc3I6IHtcclxuICAgICAgbm9FeHRlcm5hbDogWyd0aHJlZSddLFxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBXZWIgV29ya2VyIFx1NjUyRlx1NjMwMVxyXG4gICAgd29ya2VyOiB7XHJcbiAgICAgIGZvcm1hdDogJ2VzJyxcclxuICAgICAgcGx1Z2luczogKCkgPT4gW1xyXG4gICAgICAgIHJlYWN0KCkgYXMgUGx1Z2luT3B0aW9uLFxyXG4gICAgICAgIHN3Yyh7XHJcbiAgICAgICAgICBzd2NPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIGpzYzoge1xyXG4gICAgICAgICAgICAgIHRhcmdldDogJ2VzMjAyMicsXHJcbiAgICAgICAgICAgICAgcGFyc2VyOiB7XHJcbiAgICAgICAgICAgICAgICBzeW50YXg6ICd0eXBlc2NyaXB0JyxcclxuICAgICAgICAgICAgICAgIHRzeDogZmFsc2UsIC8vIFdvcmtlciBcdTRFMkRcdTRFMERcdTRGN0ZcdTc1MjggVFNYXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSkgYXMgUGx1Z2luT3B0aW9uLFxyXG4gICAgICBdLFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBmb3JtYXQ6ICdlcycsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ1NTXHU0RjE4XHU1MzE2XHJcbiAgICBjc3M6IHtcclxuICAgICAgZGV2U291cmNlbWFwOiBmYWxzZSxcclxuICAgICAgbW9kdWxlczoge1xyXG4gICAgICAgIGdlbmVyYXRlU2NvcGVkTmFtZTogY29tbWFuZCA9PT0gJ2J1aWxkJyA/ICdbaGFzaDpiYXNlNjQ6NV0nIDogJ1tsb2NhbF1fW2hhc2g6YmFzZTY0OjVdJyxcclxuICAgICAgfSxcclxuICAgIH0sXHJcblxyXG4gICAgLy8gXHU5ODg0XHU1MkEwXHU4RjdEXHU0RjE4XHU1MzE2XHJcbiAgICBleHBlcmltZW50YWw6IHtcclxuICAgICAgcmVuZGVyQnVpbHRVcmwoZmlsZW5hbWU6IHN0cmluZywgeyBob3N0VHlwZSB9OiB7IGhvc3RUeXBlOiAnanMnIHwgJ2NzcycgfCAnaHRtbCcgfSkge1xyXG4gICAgICAgIC8vIFx1NTNFRlx1NEVFNVx1OTE0RFx1N0Y2RUNETlx1NTczMFx1NTc0MFxyXG4gICAgICAgIHJldHVybiB7IHJlbGF0aXZlOiB0cnVlIH1cclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfVxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVXLFNBQVMsb0JBQW9EO0FBQ3BhLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxRQUFRLE1BQU0sZUFBZTtBQUNwQyxTQUFTLGVBQWU7QUFDeEIsU0FBUyxRQUFRLFlBQVksV0FBVyxjQUFjO0FBTnRELElBQU0sbUNBQW1DO0FBU3pDLFNBQVMsbUJBQTJCO0FBQ2xDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxJQUNULFVBQVUsSUFBSSxVQUFVLFNBQVM7QUFHL0IsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFFBQVEsTUFBTTtBQUMzQyxRQUFNLGdCQUFn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
