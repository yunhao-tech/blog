# 访客人数统计（Cloudflare Worker + Durable Object）

博客是 GitHub Pages 上的纯静态站，没有后端。所以「访客人数」不是靠页面埋点数点击数，
而是由一个独立的小 Worker 记账：**同一个访客同一篇文章只记一次**，刷新多少次数字都不会动。

## 为什么是人数而不是点击次数

| 做法 | 结果 |
| --- | --- |
| 页面埋点累加（PV） | 刷新一次 +1，一个人看十遍就是 10 |
| 本方案 | 访客指纹 = `SHA-256(IP 网段 + User-Agent + Accept-Language + 盐)`，同路径同指纹只留一行 |

去重发生在 SQLite 的主键上（`PRIMARY KEY (path, vid)` + `INSERT OR IGNORE`），
不是「先查再写」的自增，所以并发也不会把数字写歪。

## 部署（一次性，约 5 分钟）

需要 Cloudflare 账号（免费计划即可，计数器用的是 SQLite 版 Durable Object）。

```bash
cd analytics

# 1. 登录（会打开浏览器）
npx wrangler login

# 2. 设置一个随机盐，避免指纹被反推
npx wrangler secret put VISITOR_SALT
#    输入一长串随机字符，例如 openssl rand -hex 32 的输出

# 3. 部署
npx wrangler deploy
```

部署成功后会打印地址，形如：

```
https://blog-visitors.<你的-subdomain>.workers.dev
```

顺手把 `wrangler.toml` 里的 `ALLOWED_ORIGINS` 改成你的域名（默认已经填了 `https://yunhao-tech.github.io`），
以后换自定义域名记得一起改，否则浏览器会拦掉跨域请求。

## 接到博客

二选一：

**A. 改配置文件**

打开 `src/config/analytics.ts`，把地址填进 `FALLBACK_ENDPOINT`。

**B. 用仓库变量（不用改代码）**

GitHub 仓库 → Settings → Secrets and variables → Actions → Variables →
New repository variable，名字 `ANALYTICS_ENDPOINT`，值是 Worker 地址。
`.github/workflows/deploy.yml` 会把它注入成 `PUBLIC_ANALYTICS_ENDPOINT`。

两种都没配时，页面上不会出现任何访客数字，也不会发出任何请求。

## 数字显示在哪

- 首页：`本页 N 位访客 · 全站 M 位访客`
- 列表页 / Archive：`本页 N 位访客`
- 文章页：正文末尾、`回到目录` 下面一行

每个页面按自己的路径独立计数；全站人数对同一个人做去重，看十篇文章仍算一个人。

## 本地联调

```bash
# 终端 1：起 Worker（默认 8787 端口，本地 SQLite，不花钱）
cd analytics && npx wrangler dev

# 终端 2：带接口地址起博客
PUBLIC_ANALYTICS_ENDPOINT=http://127.0.0.1:8787 pnpm dev
```

## 接口

```bash
# 上报一次访问（浏览器每次打开页面调一次，服务端负责去重）
curl -X POST https://blog-visitors.<sub>.workers.dev/hit \
  -H 'content-type: application/json' \
  -d '{"path":"/read/browser-agent/"}'
# -> {"page":12,"site":345,"today":3,"todaySite":8,"recorded":true}

# 只看数字，不写入
curl 'https://blog-visitors.<sub>.workers.dev/stats?path=/read/browser-agent/'
```

`GET /health` 用来确认服务活着。

## 数据与隐私

- 不存原始 IP，只存 IP 归一化之后的哈希（IPv6 收敛到 /64，避免隐私地址轮换把一个人算成很多人）。
- 不用 cookie，前端不写 localStorage，服务端也不落任何可识别个人的字段。
- 库里只有四张表：`visitors(vid)`、`visits(path, vid)`、`visits_by_day(path, vid, day)`、`visitor_days(vid, day)`；「今日」按 `Asia/Shanghai` 切分。
- 爬虫（UA 命中常见 bot / Cloudflare 标记的 verified bot）只返回数字，不写入。

## 常见问题

**数字比想象中少？** 同一台设备 + 同一个浏览器只算一个人；换浏览器、清 UA、无痕窗口会被算成新访客。
手机和电脑各算一个人——没有登录体系时这是上限。

**Durable Object 要付费吗？** SQLite 版在上免费计划，个人博客的量远到不了限额。
如果 `wrangler deploy` 提示需要付费计划，说明账号或 wrangler 版本太旧，`npx wrangler@latest deploy` 再试。

**想清空重来？** `npx wrangler d1` 不适用，这里是 DO 内部 SQLite：
删掉 `[[migrations]]` 之外的数据需要连上 DO 执行 SQL，最简单的办法是改 `wrangler.toml` 里的 `name` 重新部署一个（旧数据留着不影响）。

**页面路径变了怎么办？** 旧路径的数字会留在库里但不再增长；新路径从 0 开始。文章改名时如果想保留数字，用 `/stats` 查旧值后手动不迁移也可以接受——个人博客通常不值得。
