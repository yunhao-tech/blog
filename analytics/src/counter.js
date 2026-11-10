/**
 * 访客计数的纯数据逻辑。
 *
 * 这里只依赖一个「像 Durable Object 的 SQL API」的对象：
 *   sql.exec(query, ...bindings) -> { one(): row, toArray(): row[] }
 * 因此它既能跑在 Worker 的 Durable Object 里，也能在 Node 的 node:sqlite 里做测试。
 *
 * 去重靠主键，不靠计数器自增：
 *   visits(path, vid)          —— 同一路径下同一个访客只留一行，重复访问 INSERT OR IGNORE 直接丢弃
 *   visitors(vid)              —— 全站访客集合，用于算全站人数
 *   visitor_days(vid, day)     —— 全站每日访客集合
 *   visits_by_day(path, vid, day) —— 单页每日访客集合，用于算「本页今日」
 */

export function ensureSchema(sql) {
  sql.exec(
    'CREATE TABLE IF NOT EXISTS visitors (vid TEXT PRIMARY KEY NOT NULL, first_seen INTEGER NOT NULL)'
  );
  sql.exec(
    'CREATE TABLE IF NOT EXISTS visits (path TEXT NOT NULL, vid TEXT NOT NULL, day TEXT NOT NULL, first_seen INTEGER NOT NULL, PRIMARY KEY (path, vid))'
  );
  sql.exec(
    'CREATE TABLE IF NOT EXISTS visitor_days (vid TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (vid, day))'
  );
  sql.exec(
    'CREATE TABLE IF NOT EXISTS visits_by_day (path TEXT NOT NULL, vid TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (path, vid, day))'
  );
}

export function readStats(sql, { path, day }) {
  const page = sql.exec('SELECT COUNT(*) AS n FROM visits WHERE path = ?', path).one().n;
  const site = sql.exec('SELECT COUNT(*) AS n FROM visitors').one().n;
  const today = sql
    .exec('SELECT COUNT(*) AS n FROM visits_by_day WHERE path = ? AND day = ?', path, day)
    .one().n;
  const todaySite = sql.exec('SELECT COUNT(*) AS n FROM visitor_days WHERE day = ?', day).one().n;
  return { page, site, today, todaySite };
}

export function recordVisit(sql, { path, vid, day, now = Date.now() }) {
  // 每一步都是「已存在就忽略」，所以同一个访客反复刷新不会把数字刷上去。
  sql.exec('INSERT OR IGNORE INTO visitors (vid, first_seen) VALUES (?, ?)', vid, now);
  sql.exec(
    'INSERT OR IGNORE INTO visits (path, vid, day, first_seen) VALUES (?, ?, ?, ?)',
    path,
    vid,
    day,
    now
  );
  sql.exec('INSERT OR IGNORE INTO visitor_days (vid, day) VALUES (?, ?)', vid, day);
  sql.exec(
    'INSERT OR IGNORE INTO visits_by_day (path, vid, day) VALUES (?, ?, ?)',
    path,
    vid,
    day
  );
  return readStats(sql, { path, day });
}
