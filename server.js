const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const ROOT = __dirname;
const ICON_CACHE_DIR = path.join(ROOT, ".icon-cache");
const DATA_DIR = path.join(ROOT, "data");
const USERS_DIR = path.join(DATA_DIR, "users");
const USERS_INDEX_PATH = path.join(USERS_DIR, "users.json");
const ICON_CACHE_TTL = 1000 * 60 * 60 * 12;
const ICON_MISS_TTL = 1000 * 60 * 30;
const ICON_TOTAL_TIMEOUT_MS = 5000;
const ICON_PAGE_FETCH_TIMEOUT_MS = 1800;
const ICON_IMAGE_FETCH_TIMEOUT_MS = 2200;
const ICON_BATCH_SIZE = 4;
const MAX_CACHE_ITEMS = 300;
const MAX_JSON_BODY_BYTES = 1024 * 1024 * 2;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 32;
const PASSWORD_MIN_LENGTH = 6;
const SESSION_COOKIE_NAME = "zmnav_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ALLOW_PUBLIC_REGISTRATION = process.env.ALLOW_PUBLIC_REGISTRATION === "true";
const INIT_ADMIN_USERNAME = process.env.INIT_ADMIN_USERNAME || "";
const INIT_ADMIN_PASSWORD = process.env.INIT_ADMIN_PASSWORD || "";

const STATIC_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

const iconCache = new Map();
const DEFAULT_USER_STATE = {
  items: [
    { id: 1, name: "OpenAI", url: "https://openai.com", category: "AI", description: "模型与产品入口", isFavorite: true, clickCount: 0 },
    { id: 2, name: "Perplexity", url: "https://www.perplexity.ai", category: "AI", description: "研究与检索", isFavorite: true, clickCount: 0 },
    { id: 3, name: "GitHub", url: "https://github.com", category: "开发", description: "代码托管与协作", isFavorite: true, clickCount: 0 },
    { id: 4, name: "MDN", url: "https://developer.mozilla.org", category: "开发", description: "Web 文档", isFavorite: true, clickCount: 0 },
    { id: 5, name: "Vercel", url: "https://vercel.com", category: "开发", description: "前端部署平台", isFavorite: true, clickCount: 0 },
    { id: 6, name: "Figma", url: "https://www.figma.com", category: "设计", description: "设计协作", isFavorite: true, clickCount: 0 },
    { id: 7, name: "Behance", url: "https://www.behance.net", category: "设计", description: "灵感案例", isFavorite: true, clickCount: 0 },
    { id: 8, name: "Dribbble", url: "https://dribbble.com", category: "设计", description: "视觉灵感", isFavorite: true, clickCount: 0 },
    { id: 9, name: "Notion", url: "https://www.notion.so", category: "效率", description: "文档与知识库", isFavorite: false, clickCount: 0 },
    { id: 10, name: "Linear", url: "https://linear.app", category: "效率", description: "任务协作", isFavorite: false, clickCount: 0 },
    { id: 11, name: "掘金", url: "https://juejin.cn", category: "资讯", description: "中文技术内容", isFavorite: false, clickCount: 0 },
    { id: 12, name: "少数派", url: "https://sspai.com", category: "资讯", description: "效率工具与产品内容", isFavorite: false, clickCount: 0 },
  ],
  categories: ["AI", "开发", "设计", "效率", "资讯"],
  settings: {
    siteTitle: "逆羽导航页",
    siteSubtitle: "把常用网址放在眼前，打开更快一点。",
    avatarImage: "",
    icpCode: "",
    backgroundMode: "argon",
    backgroundImage: "",
  },
};

function createServer() {
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

    try {
      if (requestUrl.pathname === "/health") {
        sendJson(res, 200, { ok: true, host: HOST, port: PORT });
        return;
      }

      if (requestUrl.pathname === "/api/auth/session") {
        await handleAuthSessionRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/auth/register") {
        await handleAuthRegisterRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/auth/login") {
        await handleAuthLoginRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/auth/logout") {
        await handleAuthLogoutRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/auth/change-password") {
        await handleAuthChangePasswordRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/admin/users") {
        await handleAdminUsersRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/state") {
        await handleStateRequest(req, res);
        return;
      }

      if (requestUrl.pathname === "/api/icon") {
        await handleIconRequest(requestUrl, res);
        return;
      }

      if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method Not Allowed");
        return;
      }

      await serveStatic(requestUrl.pathname, res);
    } catch (error) {
      console.error(error);
      sendText(res, 500, "Internal Server Error");
    }
  });
}

async function serveStatic(pathname, res) {
  let relativePath = pathname === "/" ? "/index.html" : pathname;
  relativePath = decodeURIComponent(relativePath);

  const resolvedPath = path.resolve(ROOT, `.${relativePath}`);
  if (!resolvedPath.startsWith(ROOT)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let stats;
  try {
    stats = await fs.promises.stat(resolvedPath);
  } catch {
    sendText(res, 404, "Not Found");
    return;
  }

  if (stats.isDirectory()) {
    sendText(res, 403, "Forbidden");
    return;
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  const contentType = STATIC_TYPES[extension] || "application/octet-stream";
  const content = await fs.promises.readFile(resolvedPath);

  res.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": contentType,
  });
  res.end(content);
}

async function handleIconRequest(requestUrl, res) {
  const rawUrl = requestUrl.searchParams.get("url");
  const targetUrl = normalizeExternalUrl(rawUrl);
  const cacheKey = getIconCacheKey(targetUrl);

  if (!targetUrl) {
    sendJson(res, 400, { error: "Invalid url parameter" });
    return;
  }

  const cached = iconCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.status === "miss") {
      sendIconMiss(res);
      return;
    }
    sendBuffer(res, 200, cached.buffer, cached.contentType);
    return;
  }

  const stored = await readStoredIcon(cacheKey);
  if (stored) {
    rememberIcon(cacheKey, stored);
    if (stored.status === "miss") {
      sendIconMiss(res);
      return;
    }
    sendBuffer(res, 200, stored.buffer, stored.contentType);
    return;
  }

  try {
    const icon = await fetchBestIcon(targetUrl);
    if (!icon) {
      const miss = rememberMissingIcon(cacheKey);
      await persistIcon(cacheKey, miss);
      sendIconMiss(res);
      return;
    }

    const cachedIcon = rememberIcon(cacheKey, icon);
    await persistIcon(cacheKey, cachedIcon);
    sendBuffer(res, 200, cachedIcon.buffer, cachedIcon.contentType);
  } catch (error) {
    console.error(`Icon proxy failed for ${targetUrl}`, error);
    sendJson(res, 502, { error: "Icon proxy failed" });
  }
}

async function handleAuthSessionRequest(req, res) {
  if (req.method !== "GET") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  const users = await readUsersIndex();
  const user = await authenticateRequest(req, users);
  if (!user) {
    sendJson(res, 200, {
      authenticated: false,
      authConfig: getAuthConfig(users),
    });
    return;
  }

  sendJson(res, 200, {
    authenticated: true,
    user: publicUser(user),
    authConfig: getAuthConfig(users),
  });
}

async function handleAuthRegisterRequest(req, res) {
  if (req.method !== "POST") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request body" });
    return;
  }

  const username = normalizeUsername(body?.username);
  const password = normalizePassword(body?.password);

  if (!ALLOW_PUBLIC_REGISTRATION) {
    const users = await readUsersIndex();
    sendJson(res, 403, {
      error: "当前站点已关闭公开注册，请联系管理员创建账号",
      authConfig: getAuthConfig(users),
    });
    return;
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    sendJson(res, 400, { error: `用户名至少 ${USERNAME_MIN_LENGTH} 位` });
    return;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    sendJson(res, 400, { error: `密码至少 ${PASSWORD_MIN_LENGTH} 位` });
    return;
  }

  try {
    const users = await readUsersIndex();
    if (users.some((item) => item.usernameKey === normalizeUsernameKey(username))) {
      sendJson(res, 409, { error: "用户名已存在" });
      return;
    }

    const user = createUserRecord(username, password, "user");

    const { user: sessionUser, token, expiresAt } = issueSession(user);
    users.push(sessionUser);
    await writeUsersIndex(users);
    await writeUserState(sessionUser.id, createDefaultUserState());

    res.setHeader("Set-Cookie", serializeSessionCookie(req, sessionUser.id, token, expiresAt));
    sendJson(res, 201, {
      ok: true,
      user: publicUser(sessionUser),
      authConfig: getAuthConfig(users),
    });
  } catch (error) {
    console.error("Register failed", error);
    sendJson(res, 500, { error: "注册失败" });
  }
}

async function handleAuthLoginRequest(req, res) {
  if (req.method !== "POST") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request body" });
    return;
  }

  const username = normalizeUsername(body?.username);
  const password = normalizePassword(body?.password);

  if (username.length < USERNAME_MIN_LENGTH || password.length < PASSWORD_MIN_LENGTH) {
    sendJson(res, 400, { error: "用户名或密码格式不正确" });
    return;
  }

  try {
    const users = await readUsersIndex();
    const index = users.findIndex((item) => item.usernameKey === normalizeUsernameKey(username));
    if (index < 0) {
      sendJson(res, 401, { error: "用户名或密码错误" });
      return;
    }

    const currentUser = users[index];
    if (!verifyPassword(password, currentUser.passwordSalt, currentUser.passwordHash)) {
      sendJson(res, 401, { error: "用户名或密码错误" });
      return;
    }

    const { user: sessionUser, token, expiresAt } = issueSession(currentUser);
    users.splice(index, 1, sessionUser);
    await writeUsersIndex(users);

    res.setHeader("Set-Cookie", serializeSessionCookie(req, sessionUser.id, token, expiresAt));
    sendJson(res, 200, {
      ok: true,
      user: publicUser(sessionUser),
      authConfig: getAuthConfig(users),
    });
  } catch (error) {
    console.error("Login failed", error);
    sendJson(res, 500, { error: "登录失败" });
  }
}

async function handleAuthLogoutRequest(req, res) {
  if (req.method !== "POST") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  try {
    const user = await authenticateRequest(req);
    if (user) {
      await clearSessionForUser(user.id);
    }
  } catch (error) {
    console.error("Logout failed", error);
  }

  res.setHeader("Set-Cookie", serializeClearedSessionCookie(req));
  sendJson(res, 200, { ok: true });
}

async function handleAuthChangePasswordRequest(req, res) {
  if (req.method !== "POST") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  const users = await readUsersIndex();
  const user = await authenticateRequest(req, users);
  if (!user) {
    sendJson(res, 401, { error: "未登录" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request body" });
    return;
  }

  const currentPassword = normalizePassword(body?.currentPassword);
  const newPassword = normalizePassword(body?.newPassword);

  if (!verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
    sendJson(res, 400, { error: "当前密码不正确" });
    return;
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    sendJson(res, 400, { error: `新密码至少 ${PASSWORD_MIN_LENGTH} 位` });
    return;
  }

  try {
    const passwordSalt = crypto.randomBytes(16).toString("base64");
    const refreshed = issueSession({
      ...user,
      passwordSalt,
      passwordHash: hashPassword(newPassword, passwordSalt),
    });

    await updateUserRecord(user.id, () => refreshed.user);
    res.setHeader("Set-Cookie", serializeSessionCookie(req, user.id, refreshed.token, refreshed.expiresAt));
    sendJson(res, 200, {
      ok: true,
      user: publicUser(refreshed.user),
    });
  } catch (error) {
    console.error("Change password failed", error);
    sendJson(res, 500, { error: "修改密码失败" });
  }
}

async function handleAdminUsersRequest(req, res) {
  if (req.method !== "POST") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  const users = await readUsersIndex();
  const adminUser = await authenticateRequest(req, users);
  if (!adminUser) {
    sendJson(res, 401, { error: "未登录" });
    return;
  }

  if (adminUser.role !== "admin") {
    sendJson(res, 403, { error: "只有管理员可以创建账号" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request body" });
    return;
  }

  const username = normalizeUsername(body?.username);
  const password = normalizePassword(body?.password);

  if (username.length < USERNAME_MIN_LENGTH) {
    sendJson(res, 400, { error: `用户名至少 ${USERNAME_MIN_LENGTH} 位` });
    return;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    sendJson(res, 400, { error: `密码至少 ${PASSWORD_MIN_LENGTH} 位` });
    return;
  }

  if (users.some((item) => item.usernameKey === normalizeUsernameKey(username))) {
    sendJson(res, 409, { error: "用户名已存在" });
    return;
  }

  try {
    const nextUser = createUserRecord(username, password, "user");

    users.push(nextUser);
    await writeUsersIndex(users);
    await writeUserState(nextUser.id, createDefaultUserState());

    sendJson(res, 201, {
      ok: true,
      user: publicUser(nextUser),
    });
  } catch (error) {
    console.error("Admin create user failed", error);
    sendJson(res, 500, { error: "创建账号失败" });
  }
}

async function handleStateRequest(req, res) {
  const user = await authenticateRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "未登录" });
    return;
  }

  if (req.method === "GET") {
    try {
      const state = await readUserState(user.id);
      sendJson(res, 200, {
        ok: true,
        updatedAt: state.lastUpdatedAt || null,
        state,
        user: publicUser(user),
      });
    } catch (error) {
      console.error("Read state failed", error);
      sendJson(res, 500, { error: "读取导航数据失败" });
    }
    return;
  }

  if (req.method === "PUT") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request body" });
      return;
    }

    try {
      const state = sanitizeStatePayload(body?.state);
      const savedState = await writeUserState(user.id, state);
      sendJson(res, 200, {
        ok: true,
        updatedAt: savedState.lastUpdatedAt,
      });
    } catch (error) {
      console.error("Write state failed", error);
      sendJson(res, 400, { error: error.message || "保存导航数据失败" });
    }
    return;
  }

  sendText(res, 405, "Method Not Allowed");
}

async function fetchBestIcon(targetUrl) {
  const deadline = Date.now() + ICON_TOTAL_TIMEOUT_MS;
  let pageUrl = targetUrl;
  let html = "";

  try {
    const pageResponse = await fetch(targetUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(getRequestTimeout(deadline, ICON_PAGE_FETCH_TIMEOUT_MS)),
    });

    if (pageResponse.ok) {
      pageUrl = pageResponse.url || targetUrl;
      const contentType = (pageResponse.headers.get("content-type") || "").toLowerCase();

      if (contentType.startsWith("image/")) {
        return {
          buffer: Buffer.from(await pageResponse.arrayBuffer()),
          contentType,
        };
      }

      if (contentType.includes("html")) {
        html = await pageResponse.text();
      }
    }
  } catch {
    pageUrl = targetUrl;
  }

  const candidates = unique([
    ...extractIconCandidates(html, pageUrl),
    ...buildFallbackIconCandidates(pageUrl),
  ]);

  return fetchImageBatch(candidates, deadline);
}

async function fetchImageBatch(candidates, deadline) {
  for (let index = 0; index < candidates.length; index += ICON_BATCH_SIZE) {
    if (getRemainingTime(deadline) <= 0) {
      return null;
    }

    const batch = candidates.slice(index, index + ICON_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((candidate) => fetchImage(candidate, deadline)),
    );
    const match = results.find(Boolean);
    if (match) {
      return match;
    }
  }

  return null;
}

async function fetchImage(url, deadline) {
  try {
    const response = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(getRequestTimeout(deadline, ICON_IMAGE_FETCH_TIMEOUT_MS)),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = normalizeContentType(response.headers.get("content-type"), url);
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return null;
    }

    return { buffer, contentType };
  } catch {
    return null;
  }
}

function extractIconCandidates(html, baseUrl) {
  if (!html) {
    return [];
  }

  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const candidates = [];

  for (const tag of linkTags) {
    const attrs = parseAttributes(tag);
    const rel = (attrs.rel || "").toLowerCase();
    const href = attrs.href;

    if (!href || !isIconRel(rel)) {
      continue;
    }

    const resolved = safeResolveUrl(href, baseUrl);
    if (!resolved) {
      continue;
    }

    candidates.push({
      url: resolved,
      score: scoreIcon(rel, attrs.sizes),
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.url);
}

function buildFallbackIconCandidates(baseUrl) {
  const origin = safeOrigin(baseUrl);
  const hostname = safeHostname(baseUrl);
  if (!origin) {
    return [];
  }

  return unique([
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    hostname ? `https://icon.horse/icon/${hostname}` : "",
    hostname ? `https://icons.duckduckgo.com/ip3/${hostname}.ico` : "",
    hostname ? `https://www.google.com/s2/favicons?sz=128&domain=${hostname}` : "",
  ]);
}

function parseAttributes(tag) {
  const body = tag.replace(/^<link\b/i, "").replace(/\/?>$/i, "");
  const attrPattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const attrs = {};

  for (const match of body.matchAll(attrPattern)) {
    const name = match[1].toLowerCase();
    const value = match[2] || match[3] || match[4] || "";
    attrs[name] = value;
  }

  return attrs;
}

function isIconRel(rel) {
  return rel.includes("icon");
}

function scoreIcon(rel, sizes) {
  let score = 0;

  if (rel.includes("apple-touch-icon")) {
    score += 60;
  }
  if (rel.includes("shortcut")) {
    score += 40;
  }
  if (rel.includes("icon")) {
    score += 30;
  }

  const sizeScore = parseSizeValue(sizes);
  return score + sizeScore;
}

function parseSizeValue(sizes) {
  if (!sizes || sizes === "any") {
    return 8;
  }

  const match = sizes.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) {
    return 0;
  }

  return Number(match[1]) + Number(match[2]);
}

function safeResolveUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function safeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function safeHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeExternalUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!/^https?:$/.test(parsed.protocol)) {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

function normalizeContentType(contentType, url) {
  const normalized = (contentType || "").split(";")[0].trim().toLowerCase();
  if (normalized) {
    return normalized;
  }

  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return STATIC_TYPES[extension] || "application/octet-stream";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BODY_BYTES) {
      throw new Error("请求体过大");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("JSON 格式不正确");
  }
}

function normalizeUsername(value) {
  return String(value || "").trim().slice(0, USERNAME_MAX_LENGTH);
}

function normalizeUsernameKey(value) {
  return normalizeUsername(value).toLowerCase();
}

function normalizePassword(value) {
  return String(value || "").slice(0, 72);
}

function getConfiguredAdminSeed() {
  const username = normalizeUsername(INIT_ADMIN_USERNAME);
  const password = normalizePassword(INIT_ADMIN_PASSWORD);

  if (username.length < USERNAME_MIN_LENGTH || password.length < PASSWORD_MIN_LENGTH) {
    return null;
  }

  return { username, password };
}

function getAuthConfig(users) {
  const normalizedUsers = Array.isArray(users) ? users : [];
  const hasUsers = normalizedUsers.length > 0;
  const hasAdmin = normalizedUsers.some((user) => user.role === "admin");

  return {
    allowPublicRegistration: ALLOW_PUBLIC_REGISTRATION,
    hasUsers,
    hasAdmin,
    needsSetup: !ALLOW_PUBLIC_REGISTRATION && !hasUsers && !getConfiguredAdminSeed(),
  };
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, Buffer.from(String(salt || ""), "base64"), 32).toString("base64");
}

function verifyPassword(password, salt, expectedHash) {
  const actual = hashPassword(password, salt);
  const actualBuffer = Buffer.from(actual, "base64");
  const expectedBuffer = Buffer.from(String(expectedHash || ""), "base64");
  if (!actualBuffer.length || actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function issueSession(user) {
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  return {
    token,
    expiresAt,
    user: {
      ...user,
      sessionTokenHash: hashSessionToken(token),
      sessionExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    },
  };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role === "admin" ? "admin" : "user",
    isAdmin: user.role === "admin",
  };
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const splitIndex = entry.indexOf("=");
      const key = splitIndex >= 0 ? entry.slice(0, splitIndex) : entry;
      const value = splitIndex >= 0 ? entry.slice(splitIndex + 1) : "";
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function isSecureRequest(req) {
  return req.headers["x-forwarded-proto"] === "https";
}

function serializeSessionCookie(req, userId, token, expiresAt) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(`${userId}:${token}`)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];

  if (isSecureRequest(req)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function serializeClearedSessionCookie(req) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (isSecureRequest(req)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

async function readUsersIndex() {
  await fs.promises.mkdir(USERS_DIR, { recursive: true });

  let users = [];
  try {
    const raw = await fs.promises.readFile(USERS_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      users = parsed;
    } else if (Array.isArray(parsed?.users)) {
      users = parsed.users;
    }
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.warn("Failed to read users index", error);
    }
  }

  const normalizedUsers = users.map(normalizeStoredUser).filter(Boolean);
  let changed = normalizedUsers.length !== users.length;

  if (!normalizedUsers.length) {
    const adminSeed = getConfiguredAdminSeed();
    if (adminSeed) {
      normalizedUsers.push(createUserRecord(adminSeed.username, adminSeed.password, "admin"));
      changed = true;
    }
  }

  if (normalizedUsers.length && !normalizedUsers.some((user) => user.role === "admin")) {
    normalizedUsers[0] = {
      ...normalizedUsers[0],
      role: "admin",
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }

  if (changed) {
    await writeUsersIndex(normalizedUsers);
  }

  return normalizedUsers;
}

async function writeUsersIndex(users) {
  await fs.promises.mkdir(USERS_DIR, { recursive: true });
  await fs.promises.writeFile(
    USERS_INDEX_PATH,
    JSON.stringify({ users }, null, 2),
    "utf8",
  );
}

async function updateUserRecord(userId, updater) {
  const users = await readUsersIndex();
  const index = users.findIndex((item) => item.id === userId);
  if (index < 0) {
    return null;
  }

  const updatedUser = updater(users[index]);
  users.splice(index, 1, updatedUser);
  await writeUsersIndex(users);
  return updatedUser;
}

async function clearSessionForUser(userId) {
  await updateUserRecord(userId, (user) => ({
    ...user,
    sessionTokenHash: "",
    sessionExpiresAt: "",
    updatedAt: new Date().toISOString(),
  }));
}

async function authenticateRequest(req, existingUsers = null) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionValue = cookies[SESSION_COOKIE_NAME];
  if (!sessionValue) {
    return null;
  }

  const splitIndex = sessionValue.indexOf(":");
  if (splitIndex <= 0) {
    return null;
  }

  const userId = sessionValue.slice(0, splitIndex);
  const token = sessionValue.slice(splitIndex + 1);
  if (!userId || !token) {
    return null;
  }

  const users = Array.isArray(existingUsers) ? existingUsers : await readUsersIndex();
  const user = users.find((item) => item.id === userId);
  if (!user || !user.sessionTokenHash || !user.sessionExpiresAt) {
    return null;
  }

  const expiresAt = Date.parse(user.sessionExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const actualHash = hashSessionToken(token);
  const actualBuffer = Buffer.from(actualHash, "hex");
  const expectedBuffer = Buffer.from(String(user.sessionTokenHash || ""), "hex");
  if (!actualBuffer.length || actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  return user;
}

function normalizeStoredUser(user) {
  if (!user || typeof user !== "object" || !user.id) {
    return null;
  }

  return {
    id: String(user.id),
    username: normalizeUsername(user.username),
    usernameKey: normalizeUsernameKey(user.usernameKey || user.username),
    passwordSalt: String(user.passwordSalt || ""),
    passwordHash: String(user.passwordHash || ""),
    sessionTokenHash: String(user.sessionTokenHash || ""),
    sessionExpiresAt: String(user.sessionExpiresAt || ""),
    role: user.role === "admin" ? "admin" : "user",
    createdAt: typeof user.createdAt === "string" ? user.createdAt : new Date().toISOString(),
    updatedAt: typeof user.updatedAt === "string" ? user.updatedAt : new Date().toISOString(),
  };
}

function createUserRecord(username, password, role = "user") {
  const passwordSalt = crypto.randomBytes(16).toString("base64");

  return {
    id: `u_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`,
    username,
    usernameKey: normalizeUsernameKey(username),
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
    sessionTokenHash: "",
    sessionExpiresAt: "",
    role: role === "admin" ? "admin" : "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultUserState() {
  return {
    items: clone(DEFAULT_USER_STATE.items),
    categories: clone(DEFAULT_USER_STATE.categories),
    settings: clone(DEFAULT_USER_STATE.settings),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function sanitizeStatePayload(value) {
  if (!value || typeof value !== "object") {
    throw new Error("无效的导航数据");
  }

  return {
    items: Array.isArray(value.items) ? value.items : [],
    categories: Array.isArray(value.categories) ? value.categories : [],
    settings: value.settings && typeof value.settings === "object" ? value.settings : {},
    lastUpdatedAt:
      typeof value.lastUpdatedAt === "string" ? value.lastUpdatedAt : new Date().toISOString(),
  };
}

function getUserStatePath(userId) {
  return path.join(USERS_DIR, userId, "state.json");
}

async function readUserState(userId) {
  const statePath = getUserStatePath(userId);

  try {
    const raw = await fs.promises.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return sanitizeStatePayload(parsed);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const fallback = createDefaultUserState();
  await writeUserState(userId, fallback);
  return fallback;
}

async function writeUserState(userId, state) {
  const statePath = getUserStatePath(userId);
  const safeState = sanitizeStatePayload(state);

  await fs.promises.mkdir(path.dirname(statePath), { recursive: true });
  await fs.promises.writeFile(statePath, JSON.stringify(safeState, null, 2), "utf8");

  return safeState;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getIconCacheKey(targetUrl) {
  return safeOrigin(targetUrl) || targetUrl;
}

function getRemainingTime(deadline) {
  return deadline - Date.now();
}

function getRequestTimeout(deadline, maxDuration) {
  const remaining = getRemainingTime(deadline);
  if (remaining <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(maxDuration, remaining));
}

function getIconCachePaths(cacheKey) {
  const hash = crypto.createHash("sha1").update(cacheKey).digest("hex");
  return {
    bufferPath: path.join(ICON_CACHE_DIR, `${hash}.bin`),
    metaPath: path.join(ICON_CACHE_DIR, `${hash}.json`),
  };
}

async function readStoredIcon(cacheKey) {
  const { bufferPath, metaPath } = getIconCachePaths(cacheKey);

  try {
    const metaRaw = await fs.promises.readFile(metaPath, "utf8");
    const meta = JSON.parse(metaRaw);

    if (!meta?.expiresAt || meta.expiresAt <= Date.now()) {
      await deleteStoredIcon(cacheKey);
      return null;
    }

    if (meta.status === "miss") {
      return {
        status: "miss",
        expiresAt: meta.expiresAt,
      };
    }

    const buffer = await fs.promises.readFile(bufferPath);
    if (!buffer.length) {
      await deleteStoredIcon(cacheKey);
      return null;
    }

    return {
      status: "hit",
      buffer,
      contentType: meta.contentType || "image/png",
      expiresAt: meta.expiresAt,
    };
  } catch {
    return null;
  }
}

async function persistIcon(cacheKey, icon) {
  const { bufferPath, metaPath } = getIconCachePaths(cacheKey);

  try {
    await fs.promises.mkdir(ICON_CACHE_DIR, { recursive: true });

    if (icon.status === "miss") {
      await fs.promises.unlink(bufferPath).catch(() => undefined);
    } else {
      await fs.promises.writeFile(bufferPath, icon.buffer);
    }

    await fs.promises.writeFile(
      metaPath,
      JSON.stringify(
        {
          status: icon.status,
          contentType: icon.contentType,
          expiresAt: icon.expiresAt,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    console.warn(`Failed to persist icon cache for ${cacheKey}`, error);
  }
}

async function deleteStoredIcon(cacheKey) {
  const { bufferPath, metaPath } = getIconCachePaths(cacheKey);
  await Promise.allSettled([
    fs.promises.unlink(bufferPath),
    fs.promises.unlink(metaPath),
  ]);
}

function rememberIcon(cacheKey, icon) {
  if (icon.status === "miss") {
    return rememberMissingIcon(cacheKey, icon.expiresAt);
  }

  const cachedIcon = {
    status: "hit",
    buffer: icon.buffer,
    contentType: icon.contentType,
    expiresAt: icon.expiresAt || Date.now() + ICON_CACHE_TTL,
  };

  iconCache.set(cacheKey, cachedIcon);

  if (iconCache.size <= MAX_CACHE_ITEMS) {
    return cachedIcon;
  }

  const firstKey = iconCache.keys().next().value;
  if (firstKey) {
    iconCache.delete(firstKey);
  }

  return cachedIcon;
}

function rememberMissingIcon(cacheKey, expiresAt = Date.now() + ICON_MISS_TTL) {
  const miss = {
    status: "miss",
    expiresAt,
  };

  iconCache.set(cacheKey, miss);

  if (iconCache.size <= MAX_CACHE_ITEMS) {
    return miss;
  }

  const firstKey = iconCache.keys().next().value;
  if (firstKey) {
    iconCache.delete(firstKey);
  }

  return miss;
}

function sendBuffer(res, status, buffer, contentType) {
  res.writeHead(status, {
    "cache-control": "public, max-age=31536000, immutable",
    "content-length": buffer.length,
    "content-type": contentType,
  });
  res.end(buffer);
}

function sendJson(res, status, payload) {
  const buffer = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "cache-control": "no-cache",
    "content-length": buffer.length,
    "content-type": "application/json; charset=utf-8",
  });
  res.end(buffer);
}

function sendIconMiss(res) {
  const buffer = Buffer.from(JSON.stringify({ error: "Icon not found" }));
  res.writeHead(404, {
    "cache-control": `public, max-age=${Math.floor(ICON_MISS_TTL / 1000)}`,
    "content-length": buffer.length,
    "content-type": "application/json; charset=utf-8",
  });
  res.end(buffer);
}

function sendText(res, status, text) {
  const buffer = Buffer.from(String(text));
  res.writeHead(status, {
    "cache-control": "no-cache",
    "content-length": buffer.length,
    "content-type": "text/plain; charset=utf-8",
  });
  res.end(buffer);
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`Argon Nav is running at http://${HOST}:${PORT}`);
  });
}

module.exports = {
  createServer,
  fetchBestIcon,
};
