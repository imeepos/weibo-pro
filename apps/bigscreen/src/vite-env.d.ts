/// <reference types="vite/client" />

// `@sker/workflow-ui/styles` resolves to a CSS file via package exports, so the
// `*.css` wildcard from `vite/client` does not match this aliased subpath.
declare module '@sker/workflow-ui/styles';

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_MAP_API_KEY: string
  // 添加更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}