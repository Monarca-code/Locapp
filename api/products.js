"use strict";

const clean = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const json = (res, status, body) => res.status(status).json(body);

function allowedOrigin(req, res) {
  const origin = clean(req.headers.origin, 500).replace(/\/+$/, "");
  const allowed = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
    .split(",").map(v => v.trim().replace(/\/+$/, "")).filter(Boolean);
  const host = clean(req.headers.host, 300).toLowerCase();
  const sameDeploymentOrigin = host === "locapp-ruby.vercel.app" &&
    (!origin || origin === "https://locapp-ruby.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Appwrite-JWT");
  res.setHeader("Access-Control-Max-Age", "86400");
  if ((allowed.includes(origin) || sameDeploymentOrigin) && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  return allowed.includes(origin) || sameDeploymentOrigin;
}

function config() {
  const c = {
    endpoint: clean(process.env.APPWRITE_ENDPOINT, 300).replace(/\/+$/, ""),
    project: clean(process.env.APPWRITE_PROJECT_ID, 200),
    key: process.env.APPWRITE_API_KEY || "",
    database: clean(process.env.APPWRITE_DATABASE_ID, 200),
    products: clean(process.env.APPWRITE_PRODUCTS_COLLECTION_ID, 200),
    vendors: clean(process.env.APPWRITE_VENDORS_COLLECTION_ID, 200)
  };
  if (Object.values(c).some(v => !v)) throw new Error("APPWRITE_CONFIG_MISSING");
  return c;
}

async function aw(c, path, { method = "GET", jwt, body } = {}) {
  const headers = {
    "X-Appwrite-Project": c.project,
    "X-Appwrite-Key": c.key,
    "Accept": "application/json"
  };
  if (jwt) headers["X-Appwrite-JWT"] = jwt;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(c.endpoint + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Appwrite request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function resolveTable(c, configuredId, fallbackName) {
  const params = new URLSearchParams();
  params.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));
  const data = await aw(c, "/tablesdb/" + encodeURIComponent(c.database) +
    "/tables?" + params.toString());
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const configured = String(configuredId || "").trim();
  const table = tables.find(t =>
    (configured && (String(t.$id) === configured || String(t.name) === configured)) ||
    String(t.name) === fallbackName
  );
  if (!table) {
    const error = new Error("Não encontrei a tabela " + fallbackName + " no Appwrite.");
    error.status = 404;
    throw error;
  }
  return String(table.$id);
}

function rowPath(c, tableId, rowId = "") {
  return "/tablesdb/" + encodeURIComponent(c.database) + "/tables/" +
    encodeURIComponent(tableId) + "/rows" + (rowId ? "/" + encodeURIComponent(rowId) : "");
}

function normalizeRow(row) {
  return { ...(row && typeof row.data === "object" ? row.data : {}), ...(row || {}) };
}

function validateProduct(body) {
  const name = clean(body.name, 160);
  const category = clean(body.category, 100);
  const description = clean(body.description, 1000);
  const price = Number(body.price);
  if (!name || !category || !description || !Number.isFinite(price) || price <= 0) {
    const e = new Error("Indica nome, descrição, categoria e preço válido maior que zero.");
    e.status = 400;
    throw e;
  }
  return {
    name, category, description, price,
    brand: clean(body.brand, 100),
    model: clean(body.model, 100),
    condition: clean(body.condition, 50) || "novo",
    stock_quantity: Number.isFinite(Number(body.stock_quantity)) ? Math.max(0, Number(body.stock_quantity)) : 1,
    image_urls: Array.isArray(body.image_urls) ? body.image_urls.map(v => clean(v, 1000)).filter(Boolean).slice(0, 5) : [],
    status: "published",
    created_at: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  if (!allowedOrigin(req, res)) return json(res, 403, { error: "Origem não autorizada." });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH, OPTIONS");
    return json(res, 405, { error: "Método não permitido." });
  }

  const jwt = clean(req.headers["x-appwrite-jwt"], 4000);
  if (!jwt) return json(res, 401, { error: "Inicia sessão na Locapp para continuar." });

  try {
    const c = config();
    const user = await aw(c, "/account", { jwt });
    const userId = clean(user.$id, 200);
    if (!userId) return json(res, 401, { error: "Sessão inválida. Entra novamente." });

    const productsTable = await resolveTable(c, c.products, "products");
    const vendorsTable = await resolveTable(c, c.vendors, "vendors");
    const params = new URLSearchParams();
    params.append("queries[]", JSON.stringify({ method: "equal", attribute: "vendor_id", values: [userId] }));
    params.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));

    if (req.method === "GET") {
      const data = await aw(c, rowPath(c, productsTable) + "?" + params.toString());
      return json(res, 200, { items: (data.rows || []).map(normalizeRow) });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const product = validateProduct(body);

    if (req.method === "PATCH") {
      const id = clean(new URL(req.url, "https://locapp.invalid").searchParams.get("id"), 36);
      if (!id) return json(res, 400, { error: "Falta o ID do produto a editar." });
      const existing = normalizeRow(await aw(c, rowPath(c, productsTable, id)));
      if (clean(existing.vendor_id, 200) !== userId) {
        return json(res, 403, { error: "Só podes editar os teus próprios produtos." });
      }
      delete product.created_at;
      await aw(c, rowPath(c, productsTable, id), {
        method: "PATCH",
        body: { data: { ...product, vendor_id: userId, updated_at: new Date().toISOString() } }
      });
      return json(res, 200, { message: "Produto atualizado.", id });
    }

    const businessName = clean(body.business_name, 160);
    const address = clean(body.address, 200);
    const municipality = clean(body.municipality, 100);
    const province = clean(body.province, 100);
    const phone = clean(body.phone, 50);
    if (!businessName || !address || !municipality || !province || !phone) {
      return json(res, 400, { error: "Preenche nome da empresa, telefone, endereço, município e província." });
    }

    const vendor = {
      owner_id: userId,
      business_name: businessName,
      business_type: clean(body.business_type, 100) || "comercio",
      description: clean(body.business_description || businessName, 1000),
      phone,
      whatsapp: clean(body.whatsapp, 50),
      address,
      province,
      municipality,
      latitude: Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : 0,
      longitude: Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : 0,
      verification_status: "pending",
      created_at: new Date().toISOString()
    };

    try {
      await aw(c, rowPath(c, vendorsTable, userId));
      const { created_at, ...vendorUpdate } = vendor;
      await aw(c, rowPath(c, vendorsTable, userId), {
        method: "PATCH",
        body: { data: vendorUpdate }
      });
    } catch (e) {
      if (e.status !== 404) throw e;
      await aw(c, rowPath(c, vendorsTable), {
        method: "POST",
        body: { rowId: userId, data: vendor }
      });
    }

    const productId = "p-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 10);
    const saved = await aw(c, rowPath(c, productsTable), {
      method: "POST",
      body: {
        rowId: productId,
        data: {
          ...product,
          vendor_id: userId,
          status: "published",
          updated_at: new Date().toISOString()
        }
      }
    });
    return json(res, 201, { message: "Produto publicado na Locapp.", id: saved.$id || saved.$rowId || productId });
  } catch (error) {
    console.error("Locapp products API:", error.status || "", error.message);
    if (error.message === "APPWRITE_CONFIG_MISSING") {
      return json(res, 500, { error: "Configuração do Appwrite incompleta no servidor." });
    }
    if (error.status === 401) return json(res, 401, { error: "Sessão inválida ou expirada. Entra novamente." });
    if (error.status === 404) return json(res, 502, { error: "Não encontrei uma tabela ou registo no Appwrite. Confirma os IDs e dados." });
    if (error.status === 400) return json(res, 400, { error: error.message });
    return json(res, 503, { error: "Não foi possível guardar o produto. Confirma os atributos e permissões das tabelas no Appwrite." });
  }
}
