import { createReadStream } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const runtimeProcess =
  typeof process === "undefined"
    ? { argv: [], env: {}, pid: "runtime", exit: () => {} }
    : process;
const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const distDir = resolve(rootDir, "dist");
const dataDir = runtimeProcess.env.DATA_DIR
  ? resolve(rootDir, runtimeProcess.env.DATA_DIR)
  : resolve(rootDir, "data");
const uploadsDir = resolve(dataDir, "uploads");
const backupsDir = resolve(dataDir, "backups");
const dbFile = resolve(dataDir, "db.json");
const supabaseUrl = String(runtimeProcess.env.SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseServiceRoleKey = String(
  runtimeProcess.env.SUPABASE_SECRET_KEY ||
    runtimeProcess.env.SUPABASE_SERVICE_ROLE_KEY ||
    runtimeProcess.env.SUPABASE_SERVICE_KEY ||
    ""
).trim();
const supabaseStateTable = runtimeProcess.env.SUPABASE_STATE_TABLE || "fibereye_state";
const supabaseBucket = runtimeProcess.env.SUPABASE_BUCKET || "fibereye-products";
const supabaseStateId = runtimeProcess.env.SUPABASE_STATE_ID || "main";
const sessionCookie = "fibereye_session";
const sessionDurationMs = 8 * 60 * 60 * 1000;
const maxLoginAttempts = 5;
const lockDurationMs = 10 * 60 * 1000;
const requestLimitWindowMs = 5 * 60 * 1000;
const uploadLimitWindowMs = 60 * 60 * 1000;

const defaultSettings = {
  brandName: "FIBEREYE CONNECT",
  tagline: "Telecom & CCTV Solutions",
  whatsappNumber: "21694239300",
  whatsappDisplay: "+216 94 239 300",
  instagramUrl: "https://www.instagram.com/fibereyeconnect/",
  facebookUrl:
    "https://www.facebook.com/profile.php?id=61586714528777&ref=PROFILE_EDIT_xav_ig_profile_page_web"
};

const defaultProducts = [
  {
    id: "router-wifi-6",
    name: "Routeur Wi-Fi 6 AX23",
    category: "Internet",
    price: "189 DT",
    stock: "En stock",
    description: "Routeur rapide pour maison fibre, streaming et gaming.",
    icon: "router",
    image: ""
  },
  {
    id: "terminal-gpon-ont",
    name: "Terminal fibre GPON ONT",
    category: "Fibre",
    price: "145 DT",
    stock: "Disponible",
    description: "Terminal compact pour installation fibre propre.",
    icon: "cable",
    image: ""
  },
  {
    id: "camera-ip-2k",
    name: "Caméra IP 2K vision nuit",
    category: "CCTV",
    price: "159 DT",
    stock: "Stock limité",
    description: "Surveillance claire avec accès à distance simple.",
    icon: "camera",
    image: ""
  },
  {
    id: "repeteur-mesh",
    name: "Répéteur Mesh AC1200",
    category: "Signal",
    price: "119 DT",
    stock: "En stock",
    description: "Améliore la couverture Wi-Fi dans toute la maison.",
    icon: "wifi",
    image: ""
  },
  {
    id: "casque-pro",
    name: "Casque sans fil Pro",
    category: "Accessoires",
    price: "89 DT",
    stock: "En stock",
    description: "Audio clair pour appels, support et usage quotidien.",
    icon: "headphones",
    image: ""
  },
  {
    id: "pack-installation-fibre",
    name: "Pack installation fibre",
    category: "Service",
    price: "70 DT",
    stock: "Sur demande",
    description: "Placement routeur, câbles propres et contrôle signal.",
    icon: "map",
    image: ""
  },
  {
    id: "chargeur-vert-10dt",
    name: "Chargeur vert compact",
    category: "Accessoires",
    price: "10 DT",
    stock: "En stock",
    description: "Chargeur pratique pour téléphone et accessoires du quotidien.",
    icon: "charger",
    image: ""
  },
  {
    id: "chargeur-orange-20dt",
    name: "Chargeur orange rapide",
    category: "Accessoires",
    price: "20 DT",
    stock: "En stock",
    description: "Chargeur finition orange, solide et adapté à un usage régulier.",
    icon: "charger",
    image: ""
  },
  {
    id: "repeteur-wifi-70dt",
    name: "Répéteur Wi-Fi",
    category: "Signal",
    price: "70 DT",
    stock: "En stock",
    description: "Répéteur Wi-Fi pour améliorer la couverture internet à la maison.",
    icon: "wifi",
    image: ""
  }
];

const sessions = new Map();
const loginLocks = new Map();
const rateLimits = new Map();
const memoryUploads = new Map();
let databaseCache;
let databaseSource = "local";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

export async function createAppServer() {
  await ensureDatabase();

  return createHttpServer(async (req, res) => {
    setSecurityHeaders(res);

    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (url.pathname.startsWith("/api/")) {
        await routeApi(req, res, url);
        return;
      }

      await serveStatic(req, res, url.pathname);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        const status = error.statusCode || 500;
        sendJson(res, status, {
          message:
            status === 500
              ? "Erreur serveur. Réessayez dans un instant."
              : error.message
        });
      }
    }
  });
}

export async function startServer(options = {}) {
  const port = Number(options.port || runtimeProcess.env.PORT || 5174);
  const host =
    options.host ||
    runtimeProcess.env.HOST ||
    (runtimeProcess.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  const server = await createAppServer();

  await new Promise((resolveListen) => {
    server.listen(port, host, resolveListen);
  });

  console.log(`FIBEREYE CONNECT is running on http://${host}:${port}`);
  return server;
}

async function routeApi(req, res, url) {
  const pathname = url.pathname;

  if (isMutatingRequest(req) && !isSameOriginRequest(req)) {
    sendJson(res, 403, { message: "Origine non autorisée." });
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    const db = await ensureDatabase();
    sendJson(res, 200, {
      ok: true,
      service: "fibereye-connect",
      storage: databaseSource,
      updatedAt: db.updatedAt,
      products: db.products.length,
      requests: db.requests.length
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/public") {
    const db = await ensureDatabase();
    sendJson(res, 200, {
      settings: publicSettings(db.settings),
      products: db.products,
      requestCount: db.requests.length
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/requests") {
    const retryAfter = hitRateLimit(`request:${getClientKey(req)}`, 8, requestLimitWindowMs);
    if (retryAfter) {
      sendJson(res, 429, {
        message: `Trop de demandes. Réessayez dans ${retryAfter} min.`
      });
      return;
    }

    const body = await readJsonBody(req);
    const db = await ensureDatabase();
    const type = body.type === "Réclamation" ? "Réclamation" : "Création ligne";
    const data = cleanRequestData(body.data || {});

    if (!data.name || !data.phone) {
      sendJson(res, 400, { message: "Nom et téléphone sont obligatoires." });
      return;
    }

    const whatsappLink = buildWhatsappLink(type, data, db.settings);
    const request = {
      id: makeId("request"),
      type,
      status: "Nouveau",
      createdAt: new Date().toISOString(),
      data,
      whatsappLink
    };

    db.requests = [request, ...db.requests];
    await saveDatabase(db);
    sendJson(res, 201, { request, whatsappLink });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/login") {
    await handleLogin(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/logout") {
    const cookies = parseCookies(req.headers.cookie || "");
    if (cookies[sessionCookie]) {
      sessions.delete(cookies[sessionCookie]);
    }
    res.setHeader(
      "Set-Cookie",
      buildSessionCookie("", 0)
    );
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/me") {
    if (!(await requireAdmin(req, res))) return;
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname.startsWith("/api/admin/")) {
    if (!(await requireAdmin(req, res))) return;
    await routeAdminApi(req, res, pathname);
    return;
  }

  sendJson(res, 404, { message: "Route introuvable." });
}

async function routeAdminApi(req, res, pathname) {
  const db = await ensureDatabase();

  if (req.method === "GET" && pathname === "/api/admin/data") {
    sendJson(res, 200, {
      settings: publicSettings(db.settings),
      products: db.products,
      requests: db.requests,
      stats: buildAdminStats(db)
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/stats") {
    sendJson(res, 200, { stats: buildAdminStats(db) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/export/requests") {
    sendCsv(res, "fibereye-requests.csv", buildRequestsCsv(db.requests));
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/backups") {
    sendJson(res, 200, { backups: await listBackups() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/backup") {
    const backup = await createBackup(db);
    sendJson(res, 201, { backup, backups: await listBackups() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/maintenance/cleanup-images") {
    const result = await cleanupUnusedImages(db.products);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "PUT" && pathname === "/api/admin/settings") {
    const body = await readJsonBody(req);
    db.settings = cleanSettings({ ...db.settings, ...(body.settings || body) });

    if (typeof body.adminCode === "string" && body.adminCode.trim().length >= 4) {
      db.admin = await hashPassword(body.adminCode.trim());
      const currentToken = parseCookies(req.headers.cookie || "")[sessionCookie];
      for (const token of sessions.keys()) {
        if (token !== currentToken) sessions.delete(token);
      }
    }

    await saveDatabase(db);
    sendJson(res, 200, { settings: publicSettings(db.settings) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/images") {
    const retryAfter = hitRateLimit(`upload:${getClientKey(req)}`, 20, uploadLimitWindowMs);
    if (retryAfter) {
      sendJson(res, 429, {
        message: `Trop d'uploads. Réessayez dans ${retryAfter} min.`
      });
      return;
    }

    const body = await readJsonBody(req, 8 * 1024 * 1024);
    const image = await saveUploadedImage(body.dataUrl);
    sendJson(res, 201, { image });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/products") {
    const body = await readJsonBody(req);
    const product = cleanProduct({ ...body, id: makeId("product") });
    const validation = validateProduct(product);
    if (validation) {
      sendJson(res, 400, { message: validation });
      return;
    }
    db.products = [product, ...db.products];
    await saveDatabase(db);
    sendJson(res, 201, { product, products: db.products, stats: buildAdminStats(db) });
    return;
  }

  const productMatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productMatch) {
    const productId = decodeURIComponent(productMatch[1]);

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const index = db.products.findIndex((product) => product.id === productId);
      if (index === -1) {
        sendJson(res, 404, { message: "Produit introuvable." });
        return;
      }
      const product = cleanProduct({ ...db.products[index], ...body, id: productId });
      const validation = validateProduct(product);
      if (validation) {
        sendJson(res, 400, { message: validation });
        return;
      }
      db.products[index] = product;
      await saveDatabase(db);
      sendJson(res, 200, { product, products: db.products, stats: buildAdminStats(db) });
      return;
    }

    if (req.method === "DELETE") {
      db.products = db.products.filter((product) => product.id !== productId);
      await saveDatabase(db);
      sendJson(res, 200, { products: db.products, stats: buildAdminStats(db) });
      return;
    }
  }

  const requestMatch = pathname.match(/^\/api\/admin\/requests\/([^/]+)$/);
  if (requestMatch) {
    const requestId = decodeURIComponent(requestMatch[1]);

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const request = db.requests.find((item) => item.id === requestId);
      if (!request) {
        sendJson(res, 404, { message: "Demande introuvable." });
        return;
      }
      request.status = cleanStatus(body.status);
      await saveDatabase(db);
      sendJson(res, 200, { request, requests: db.requests, stats: buildAdminStats(db) });
      return;
    }

    if (req.method === "DELETE") {
      db.requests = db.requests.filter((request) => request.id !== requestId);
      await saveDatabase(db);
      sendJson(res, 200, { requests: db.requests, stats: buildAdminStats(db) });
      return;
    }
  }

  sendJson(res, 404, { message: "Route admin introuvable." });
}

async function handleLogin(req, res) {
  const clientKey = getClientKey(req);
  const lock = loginLocks.get(clientKey);
  const now = Date.now();

  if (lock?.lockedUntil && lock.lockedUntil > now) {
    sendJson(res, 429, {
      message: `Accès bloqué temporairement. Réessayez dans ${Math.ceil(
        (lock.lockedUntil - now) / 60000
      )} min.`
    });
    return;
  }

  const body = await readJsonBody(req);
  const db = await ensureDatabase();
  const isValid = await verifyPassword(String(body.code || ""), db.admin);

  if (!isValid) {
    const attempts = (lock?.attempts || 0) + 1;
    if (attempts >= maxLoginAttempts) {
      loginLocks.set(clientKey, { attempts: 0, lockedUntil: now + lockDurationMs });
      sendJson(res, 429, {
        message: "Trop de tentatives. Admin bloqué pendant 10 minutes."
      });
      return;
    }
    loginLocks.set(clientKey, { attempts, lockedUntil: 0 });
    sendJson(res, 401, {
      message: `Code incorrect. Tentatives restantes: ${maxLoginAttempts - attempts}.`
    });
    return;
  }

  loginLocks.delete(clientKey);
  const token = randomBytes(32).toString("hex");
  sessions.set(token, {
    createdAt: now,
    expiresAt: now + sessionDurationMs
  });
  res.setHeader(
    "Set-Cookie",
    buildSessionCookie(token, sessionDurationMs / 1000)
  );
  sendJson(res, 200, { ok: true });
}

async function requireAdmin(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[sessionCookie];
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    sendJson(res, 401, { message: "Session admin requise." });
    return false;
  }

  session.expiresAt = Date.now() + sessionDurationMs;
  return true;
}

async function ensureDatabase() {
  await mkdir(uploadsDir, { recursive: true });

  if (databaseCache) {
    return databaseCache;
  }

  if (isSupabaseEnabled()) {
    try {
      const remoteDatabase = await loadSupabaseDatabase();
      if (remoteDatabase) {
        databaseCache = await normalizeDatabase(remoteDatabase);
        databaseSource = "supabase";
        return databaseCache;
      }

      databaseCache = await normalizeDatabase(await readLocalDatabaseSeed());
      await saveSupabaseDatabase(databaseCache);
      databaseSource = "supabase";
      return databaseCache;
    } catch (error) {
      console.warn(`Supabase database unavailable, using local fallback: ${error.message}`);
      databaseSource = "local";
    }
  }

  try {
    const raw = await readFile(dbFile, "utf8");
    const parsed = JSON.parse(raw);
    databaseCache = await normalizeDatabase(parsed);
    databaseSource = "local";
  } catch {
    databaseCache = await normalizeDatabase({});
    await saveDatabase(databaseCache);
    databaseSource = "local";
  }

  return databaseCache;
}

async function normalizeDatabase(db) {
  const needsAdmin = !db.admin?.salt || !db.admin?.passwordHash;
  const products = mergeDefaultProducts(
    Array.isArray(db.products) && db.products.length
      ? db.products.map((product) => cleanProduct(product))
      : []
  );

  return {
    version: 1,
    createdAt: db.createdAt || new Date().toISOString(),
    updatedAt: db.updatedAt || new Date().toISOString(),
    settings: cleanSettings({ ...defaultSettings, ...(db.settings || {}) }),
    products,
    requests: Array.isArray(db.requests) ? db.requests : [],
    admin: needsAdmin
      ? await hashPassword(runtimeProcess.env.ADMIN_PASSWORD || "94239300")
      : db.admin
  };
}

function mergeDefaultProducts(products) {
  const cleanDefaults = defaultProducts.map((product) => cleanProduct(product));
  if (!products.length) {
    return cleanDefaults;
  }

  const existingIds = new Set(products.map((product) => product.id));
  return [
    ...products,
    ...cleanDefaults.filter((product) => !existingIds.has(product.id))
  ];
}

async function saveDatabase(db) {
  db.updatedAt = new Date().toISOString();
  databaseCache = db;

  if (isSupabaseEnabled()) {
    try {
      await saveSupabaseDatabase(db);
      databaseSource = "supabase";
      return;
    } catch (error) {
      console.warn(`Supabase save failed, using local fallback: ${error.message}`);
      databaseSource = "local";
    }
  }

  await mkdir(dataDir, { recursive: true });
  const tmpFile = `${dbFile}.${runtimeProcess.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tmpFile, JSON.stringify(db, null, 2), "utf8");
    await rename(tmpFile, dbFile);
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      console.warn("Database file is not writable; keeping preview data in memory.");
      return;
    }
    throw error;
  }
}

async function readLocalDatabaseSeed() {
  const raw = await readFile(dbFile, "utf8").catch(() => "");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function isSupabaseEnabled() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

async function loadSupabaseDatabase() {
  const rows = await supabaseFetch(
    `/rest/v1/${encodeURIComponent(supabaseStateTable)}?id=eq.${encodeURIComponent(
      supabaseStateId
    )}&select=data`,
    { method: "GET" }
  );
  return Array.isArray(rows) && rows[0]?.data ? rows[0].data : null;
}

async function saveSupabaseDatabase(db) {
  await supabaseFetch(
    `/rest/v1/${encodeURIComponent(supabaseStateTable)}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        id: supabaseStateId,
        data: db,
        updated_at: db.updatedAt
      })
    }
  );
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = parseOptionalJson(text);

  if (!response.ok) {
    const message = data?.message || data?.hint || data?.details || response.statusText;
    throw new Error(message || `Supabase error ${response.status}`);
  }

  return data;
}

function parseOptionalJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function buildAdminStats(db) {
  const statusCounts = db.requests.reduce(
    (counts, request) => {
      counts[request.status] = (counts[request.status] || 0) + 1;
      return counts;
    },
    { Nouveau: 0, "En cours": 0, Terminé: 0 }
  );
  const typeCounts = db.requests.reduce((counts, request) => {
    counts[request.type] = (counts[request.type] || 0) + 1;
    return counts;
  }, {});
  const latestRequest = db.requests
    .map((request) => request.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    products: db.products.length,
    productsWithImages: db.products.filter((product) => product.image).length,
    requests: db.requests.length,
    newRequests: statusCounts.Nouveau || 0,
    inProgressRequests: statusCounts["En cours"] || 0,
    doneRequests: statusCounts.Terminé || 0,
    typeCounts,
    latestRequestAt: latestRequest || null,
    updatedAt: db.updatedAt
  };
}

function buildRequestsCsv(requests) {
  const columns = [
    "createdAt",
    "status",
    "type",
    "name",
    "phone",
    "provider",
    "zone",
    "issue",
    "need",
    "message"
  ];
  const rows = requests.map((request) => ({
    createdAt: request.createdAt || "",
    status: request.status || "",
    type: request.type || "",
    name: request.data?.name || "",
    phone: request.data?.phone || "",
    provider: request.data?.provider || "",
    zone: request.data?.zone || "",
    issue: request.data?.issue || "",
    need: request.data?.need || "",
    message: request.data?.message || ""
  }));

  return [
    columns.map(escapeCsvValue).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(","))
  ].join("\n");
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

async function createBackup(db) {
  await mkdir(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `fibereye-backup-${stamp}`;
  const backupPath = resolve(backupsDir, backupName);
  await mkdir(backupPath, { recursive: true });
  await writeFile(resolve(backupPath, "db.json"), JSON.stringify(db, null, 2), "utf8");

  const uploadsInfo = await stat(uploadsDir).catch(() => null);
  if (uploadsInfo?.isDirectory()) {
    await cp(uploadsDir, resolve(backupPath, "uploads"), {
      recursive: true,
      errorOnExist: false,
      force: true
    });
  }

  return {
    name: backupName,
    createdAt: new Date().toISOString()
  };
}

async function listBackups() {
  await mkdir(backupsDir, { recursive: true });
  const entries = await readdir(backupsDir, { withFileTypes: true }).catch(() => []);
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const info = await stat(resolve(backupsDir, entry.name)).catch(() => null);
        return {
          name: entry.name,
          createdAt: info?.birthtime?.toISOString?.() || null
        };
      })
  );
  return backups.sort((a, b) => String(b.name).localeCompare(String(a.name)));
}

async function cleanupUnusedImages(products) {
  const usedImages = new Set(
    products
      .map((product) => product.image)
      .filter((image) => typeof image === "string" && image.startsWith("/uploads/"))
      .map((image) => image.replace("/uploads/", ""))
  );
  const entries = await readdir(uploadsDir, { withFileTypes: true }).catch(() => []);
  const deleted = [];

  for (const entry of entries) {
    if (!entry.isFile() || usedImages.has(entry.name)) continue;
    await unlink(resolve(uploadsDir, entry.name)).catch(() => null);
    deleted.push(entry.name);
  }

  for (const filename of [...memoryUploads.keys()]) {
    if (usedImages.has(filename)) continue;
    memoryUploads.delete(filename);
    deleted.push(filename);
  }

  return {
    deletedCount: deleted.length,
    deleted
  };
}

function publicSettings(settings) {
  return cleanSettings(settings);
}

function cleanSettings(settings) {
  return {
    brandName: cleanString(settings.brandName, defaultSettings.brandName, 80),
    tagline: cleanString(settings.tagline, defaultSettings.tagline, 120),
    whatsappNumber: normalizePhone(
      cleanString(settings.whatsappNumber, defaultSettings.whatsappNumber, 30)
    ),
    whatsappDisplay: cleanString(settings.whatsappDisplay, defaultSettings.whatsappDisplay, 40),
    instagramUrl: cleanUrl(settings.instagramUrl, defaultSettings.instagramUrl),
    facebookUrl: cleanUrl(settings.facebookUrl, defaultSettings.facebookUrl)
  };
}

function cleanProduct(product) {
  return {
    id: cleanId(product.id || makeId("product")),
    name: cleanString(product.name, "", 90),
    category: cleanString(product.category, "", 40),
    price: cleanString(product.price, "", 32),
    stock: cleanString(product.stock, "En stock", 40),
    description: cleanString(product.description, "", 220),
    icon: cleanIcon(product.icon),
    image: cleanImageUrl(product.image)
  };
}

function validateProduct(product) {
  if (!product.name) return "Nom produit obligatoire.";
  if (!product.category) return "Catégorie obligatoire.";
  if (!product.price) return "Prix obligatoire.";
  if (!product.description) return "Description obligatoire.";
  return "";
}

function cleanRequestData(data) {
  return {
    name: cleanString(data.name, "", 80),
    phone: cleanString(data.phone, "", 40),
    zone: cleanString(data.zone, "", 120),
    provider: cleanString(data.provider, "", 50),
    need: cleanString(data.need, "", 300),
    issue: cleanString(data.issue, "", 80),
    message: cleanString(data.message, "", 400)
  };
}

function cleanStatus(status) {
  return ["Nouveau", "En cours", "Terminé"].includes(status) ? status : "Nouveau";
}

function getClientKey(req) {
  return req.socket.remoteAddress || "local";
}

function hitRateLimit(key, maxHits, windowMs) {
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { hits: 1, resetAt: now + windowMs });
    return 0;
  }

  current.hits += 1;
  if (current.hits <= maxHits) {
    return 0;
  }

  return Math.ceil((current.resetAt - now) / 60000);
}

function isMutatingRequest(req) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "");
}

function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;

  if (!host || (!origin && !referer)) return true;

  try {
    const expectedHost = host.toLowerCase();
    const source = new URL(origin || referer);
    return source.host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}

function cleanIcon(icon) {
  return ["router", "cable", "camera", "charger", "wifi", "headphones", "map"].includes(icon)
    ? icon
    : "router";
}

function cleanImageUrl(image) {
  if (typeof image !== "string") return "";
  const trimmed = image.trim();
  return trimmed.startsWith("/uploads/") || isAllowedExternalImage(trimmed) ? trimmed : "";
}

function isAllowedExternalImage(value) {
  if (!isSupabaseEnabled()) return false;
  try {
    const url = new URL(value);
    const expected = new URL(supabaseUrl);
    return (
      url.origin === expected.origin &&
      url.pathname.startsWith(`/storage/v1/object/public/${supabaseBucket}/`)
    );
  } catch {
    return false;
  }
}

function cleanId(id) {
  return String(id || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
}

function cleanUrl(value, fallback) {
  try {
    const url = new URL(String(value || fallback).trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function cleanString(value, fallback, maxLength) {
  const normalized = String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || fallback).slice(0, maxLength);
}

function normalizePhone(number) {
  return String(number || "").replace(/[^\d]/g, "");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(5).toString("hex")}`;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return {
    salt,
    passwordHash: derived.toString("hex")
  };
}

async function verifyPassword(password, admin) {
  const derived = await scrypt(password, admin.salt, 64);
  const stored = Buffer.from(admin.passwordHash, "hex");
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

async function saveUploadedImage(dataUrl) {
  if (typeof dataUrl !== "string") {
    throw httpError(400, "Image invalide.");
  }

  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) {
    throw httpError(400, "Format image non supporté. Utilisez PNG, JPG, WEBP ou GIF.");
  }

  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    throw httpError(413, "Image trop grande. Maximum 5 MB.");
  }

  const extension = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : "jpg";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;

  if (isSupabaseEnabled()) {
    try {
      return await saveSupabaseImage(filename, buffer, mime);
    } catch (error) {
      console.warn(`Supabase image upload failed, using local fallback: ${error.message}`);
    }
  }

  const filePath = resolve(uploadsDir, filename);
  try {
    await writeFile(filePath, buffer);
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      memoryUploads.set(filename, { buffer, mime });
      console.warn("Upload folder is not writable; keeping preview image in memory.");
      return `/uploads/${filename}`;
    }
    throw error;
  }
  return `/uploads/${filename}`;
}

async function saveSupabaseImage(filename, buffer, mime) {
  const objectPath = `products/${filename}`;
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(supabaseBucket)}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": mime,
        "cache-control": "31536000",
        "x-upsert": "false"
      },
      body: buffer
    }
  );
  const text = await response.text();
  const data = parseOptionalJson(text);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || response.statusText);
  }

  return `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${objectPath}`;
}

function buildWhatsappLink(type, data, settings) {
  const lines = [
    `Bonjour ${settings.brandName},`,
    `Type: ${type}`,
    `Nom: ${data.name || "-"}`,
    `Téléphone: ${data.phone || "-"}`,
    `Fournisseur: ${data.provider || "-"}`,
    data.zone ? `Adresse/zone: ${data.zone}` : null,
    data.issue ? `Problème: ${data.issue}` : null,
    data.need ? `Besoin: ${data.need}` : null,
    data.message ? `Message: ${data.message}` : null
  ].filter(Boolean);

  return `https://wa.me/${normalizePhone(settings.whatsappNumber)}?text=${encodeURIComponent(
    lines.join("\n")
  )}`;
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const raw = await readBody(req, maxBytes);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw httpError(400, "JSON invalide.");
  }
}

function readBody(req, maxBytes) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        rejectBody(httpError(413, "Requête trop grande."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolveBody(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", rejectBody);
  });
}

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { message: "Méthode non autorisée." });
    return;
  }

  if (pathname.startsWith("/uploads/")) {
    const uploadName = pathname.replace("/uploads/", "");
    try {
      await serveFile(res, safeResolve(uploadsDir, uploadName), true, req.method);
    } catch (error) {
      const memoryUpload = memoryUploads.get(uploadName);
      if (!memoryUpload) throw error;
      sendBuffer(res, memoryUpload.buffer, memoryUpload.mime, req.method);
    }
    return;
  }

  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const extension = extname(requested);

  try {
    await serveFile(res, safeResolve(distDir, requested), true, req.method);
  } catch (error) {
    if (extension) {
      if (!res.headersSent) sendJson(res, 404, { message: "Fichier introuvable." });
      return;
    }
    await serveFile(res, resolve(distDir, "index.html"), false, req.method);
  }
}

async function serveFile(res, filePath, mustExist, method = "GET") {
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    if (mustExist) throw httpError(404, "Fichier introuvable.");
    throw httpError(500, "Build introuvable. Lancez npm run build.");
  }

  const extension = extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=31536000, immutable"
  });

  if (method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
}

function safeResolve(baseDir, requestedPath) {
  const resolved = resolve(baseDir, decodeURIComponent(requestedPath));
  if (resolved !== baseDir && !resolved.startsWith(`${baseDir}${sep}`)) {
    throw httpError(403, "Chemin interdit.");
  }
  return resolved;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendCsv(res, filename, content) {
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store"
  });
  res.end(`\uFEFF${content}`);
}

function sendBuffer(res, buffer, mime, method = "GET") {
  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": buffer.length,
    "Cache-Control": "public, max-age=31536000, immutable"
  });
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(buffer);
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const index = entry.indexOf("=");
        return index === -1
          ? [entry, ""]
          : [entry.slice(0, index), decodeURIComponent(entry.slice(index + 1))];
      })
  );
}

function buildSessionCookie(value, maxAge) {
  const secure =
    runtimeProcess.env.COOKIE_SECURE === "true" ||
    runtimeProcess.env.COOKIE_SECURE === "1";
  const encodedValue = value ? encodeURIComponent(value) : "";
  return [
    `${sessionCookie}=${encodedValue}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${Math.floor(maxAge)}`,
    secure ? "Secure" : null
  ]
    .filter(Boolean)
    .join("; ");
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.supabase.co",
      "connect-src 'self'",
      "font-src 'self' data:",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'"
    ].join("; ")
  );
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const directRunPath = runtimeProcess.argv[1] ? resolve(runtimeProcess.argv[1]) : "";
if (directRunPath && directRunPath === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => {
    console.error(error);
    runtimeProcess.exit(1);
  });
}
