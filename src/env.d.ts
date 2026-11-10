/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** 访客统计 Worker 地址，构建时由 PUBLIC_ANALYTICS_ENDPOINT 注入。 */
  readonly PUBLIC_ANALYTICS_ENDPOINT?: string;
}
