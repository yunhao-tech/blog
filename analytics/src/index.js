/**
 * 博客访客统计 Worker。
 *
 * 只统计「去重后的人」，不统计点击次数：
 *   - 访客指纹 = SHA-256(IP 归一化 + User-Agent + Accept-Language + 盐)
 *   - 同一路径下同一个指纹只记一次，所以刷新多少次数字都不变
 *   - 全站人数按人去重，同一个人看十篇文章也只算一个人
 *
 * 接口：
 *   POST /hit   { path }  -> { page, site, today, todaySite, recorded }
 *   GET  /stats ?path=/x  -> { page, site, today, todaySite, recorded: false }
 *   GET  /health          -> { ok: true }
 */
import { ensureSchema, readStats, recordVisit } from './counter.js';

const BOT_RE =
  /bot|crawler|spider|crawling|slurp|scrap|facebookexternalhit|embedly|preview|headless|phantom|curl|wget|python-requests|python-urllib|httpclient|go-http-client|java\/|okhttp|monitor|uptime|pingdom|ahrefs|semrush|screaming/i;

export class VisitorCounter {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    ensureSchema(this.sql);
  }

  async fetch(request) {
    const url = new URL(request.url);
    let payload = {};
    if (request.method === 'POST') {
      payload = await request.json().catch(() => ({}));
    } else {
      payload = Object.fromEntries(url.searchParams);
    }
    const day = typeof payload.day === 'string' ? payload.day : utcDay();
    if (url.pathname === '/record') {
      const stats = recordVisit(this.sql, { path: payload.path, vid: payload.vid, day });
      return Response.json({ ...stats, recorded: true });
    }
    return Response.json({ ...readStats(this.sql, { path: payload.path, day }), recorded: false });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === '/health') {
      return json({ ok: true }, cors);
    }

    // 只给自己的站点用，别处嵌不了这个计数器。
    if (originFrom(request) && !originAllowed(request, env)) {
      return json({ error: 'origin not allowed' }, cors, 403);
    }

    if (url.pathname === '/hit' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const path = normalizePath(body && body.path);
      if (!path) return json({ error: 'invalid path' }, cors, 400);

      const day = today(env);
      const stub = env.VISITS.get(env.VISITS.idFromName('global'));

      // 爬虫/预渲染也照常返回数字，但不写入，避免把机器算成人。
      if (isBot(request)) {
        const result = await callCounter(stub, '/stats', { path, day });
        return json({ ...result.data, recorded: false }, cors, result.status);
      }

      const vid = await visitorId(request, env);
      const result = await callCounter(stub, '/record', { path, vid, day });
      return json(result.data, cors, result.status);
    }

    if (url.pathname === '/stats') {
      const path = normalizePath(url.searchParams.get('path'));
      if (!path) return json({ error: 'invalid path' }, cors, 400);
      const stub = env.VISITS.get(env.VISITS.idFromName('global'));
      const result = await callCounter(stub, '/stats', { path, day: today(env) });
      return json(result.data, cors, result.status);
    }

    return json({ error: 'not found' }, cors, 404);
  },
};

/** Durable Object 只会把这几种情况吐出来，坏掉时给前端一个能看懂的 JSON。 */
async function callCounter(stub, route, payload) {
  try {
    const response = await stub.fetch(`https://counter${route}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`counter responded ${response.status}`);
    return { data: await response.json(), status: 200 };
  } catch (error) {
    console.error('counter failed', route, error);
    return { data: { error: 'counter unavailable' }, status: 503 };
  }
}

function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function originFrom(request) {
  return request.headers.get('Origin') || '';
}

function originAllowed(request, env) {
  const allowed = allowedOrigins(env);
  const origin = originFrom(request);
  return allowed.length === 0 || allowed.includes('*') || allowed.includes(origin);
}

function corsHeaders(request, env) {
  const origin = originFrom(request);
  const allowed = allowedOrigins(env);
  const ok = originAllowed(request, env);
  const headers = {
    Vary: 'Origin',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
  if (ok && origin) headers['access-control-allow-origin'] = allowed.includes('*') ? '*' : origin;
  return headers;
}

/** 只保留路径部分，去掉查询串/锚点，限制长度，防止被塞进奇怪的 key。 */
function normalizePath(input) {
  if (typeof input !== 'string') return null;
  let path = input.trim();
  if (!path) return null;
  path = path.split('#')[0].split('?')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 200) path = path.slice(0, 200);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(path)) return null;
  return path;
}

function isBot(request) {
  const ua = request.headers.get('User-Agent') || '';
  if (!ua) return true;
  if (BOT_RE.test(ua)) return true;
  const botManagement = request.cf && request.cf.botManagement;
  if (botManagement && botManagement.verifiedBot) return true;
  return false;
}

async function visitorId(request, env) {
  const ip = normalizeIp(request.headers.get('CF-Connecting-IP') || '');
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const salt = env.VISITOR_SALT || 'unehao-visitor-salt-please-change';
  const material = `${ip}|${ua}|${lang}|${salt}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * IPv6 隐私地址会周期性轮换，直接哈希会把同一个人算成很多个人。
 * 统一收敛到 /64 网段，IPv4 保持原样。
 */
function normalizeIp(ip) {
  let value = ip.trim().toLowerCase();
  if (!value) return '';
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value.includes(':')) {
    const [head] = value.split('::');
    const groups = head ? head.split(':').filter(Boolean) : [];
    return `${groups.slice(0, 4).join(':')}::/64`;
  }
  return value;
}

function today(env) {
  const timeZone = env.VISITOR_TZ || 'Asia/Shanghai';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}
