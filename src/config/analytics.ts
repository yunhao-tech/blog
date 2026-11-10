/**
 * 访客统计接口地址（analytics/ 目录下的 Cloudflare Worker）。
 *
 * 部署 Worker 后，二选一把地址填进来：
 *   1. 直接改下面的 FALLBACK_ENDPOINT；
 *   2. 在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables
 *      里添加 ANALYTICS_ENDPOINT，部署时由 Actions 注入。
 *
 * 留空时页面上不会出现任何访客数字，也不会发起任何请求。
 */
const FALLBACK_ENDPOINT = 'https://blog-visitors.unehao.workers.dev';

export const ANALYTICS_ENDPOINT = (
  import.meta.env.PUBLIC_ANALYTICS_ENDPOINT || FALLBACK_ENDPOINT
).trim().replace(/\/+$/, '');

export const ANALYTICS_ENABLED = ANALYTICS_ENDPOINT !== '';
