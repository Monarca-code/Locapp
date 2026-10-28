"use strict";

const clean = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const json = (res, status, body) => res.status(status).json(body);

function allowedOrigin(req, res) {
  const origin = clean(req.headers.origin, 500).replace(/\/+$/, "");
  const allowed = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
    .split(",").map(v => v.trim().replace(/\/+$/, "")).filter(Boolean);
  const host = clean(req.headers.host, 300).toLowerCase();
  const sameDeploymentOrigin = host === "locapp-ruby.vercel.app" && (!origin || origin === "https://locapp-ruby.vercel.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Appwrite-JWT");
  res.setHeader("Access-Control-Max-Age", "86400");
  if ((allowed.includes(origin) || sameDeploymentOrigin) && origin) res.setHeader("Access-Control-Allow-Origin", origin);
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
  const headers = { "X-Appwrite-Project": c.project, "X-Appwrite-Key": c.key, "Accept": "application/json" };
  if (jwt) headers["X-Appwrite-JWT"] = jwt;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(c.endpoint + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000), cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Appwrite request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

function coll(c, collection) {
  return "/databases/" + encodeURIComponent(c.database) + "/collections/" +
    encodeURIComponent(collection) + "/documents";
}
function validateProduct(body) {
  const name = clean(body.name, 160);
  const category = clean(body.category, 100);
  const description = clean(body.description, 1000);
  const price = Number(body.price);
  if (!name || !category || !Number.isFinite(price) || price <= 0) {
    const e = new Error("Indica o nome, a categoria e um preço válido maior que zero.");
    e.status = 400; throw e;
  }
  return { name, category, description, price, currency: "Kz", status: "published" };
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
    // Valida o JWT junto do Appwrite; nunca confiamos no userId enviado pelo browser.
    const user = await aw(c, "/account", { jwt });
    const userId = clean(user.$id, 200);
    if (!userId) return json(res, 401, { error: "Sessão inválida. Entra novamente." });

    const productPath = coll(c, c.products);
    const vendorPath = coll(c, c.vendors);
    const params = new URLSearchParams();
    params.append("queries[]", JSON.stringify({ method: "equal", attribute: "vendor_id", values: [userId] }));
    params.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));

    if (req.method === "GET") {
      const data = await aw(c, productPath + "?" + params.toString());
      return json(res, 200, { items: data.documents || [] });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const product = validateProduct(body);
    const businessName = clean(body.business_name, 160);
    const address = clean(body.address, 200);
    const municipality = clean(body.municipality, 100);
    const province = clean(body.province, 100);
    if (!businessName || !address || !municipality || !province) {
      return json(res, 400, { error: "Preenche o nome da empresa, endereço, município e província." });
    }

    // O documento comercial usa o ID do utilizador; cada conta só pode gerir o seu perfil.
    const vendor = {
      user_id: userId, business_name: businessName, business_type: "farmacia",
      address, municipality, province, phone: clean(body.phone, 50),
      whatsapp: clean(body.whatsapp, 50)
    };
    const vendorDocumentPath = vendorPath + "/" + encodeURIComponent(userId);
    if (req.method === "POST") {
      try {
        await aw(c, vendorDocumentPath, { method: "GET" });
        await aw(c, vendorDocumentPath, { method: "PATCH", body: { data: vendor } });
      } catch (e) {
        if (e.status !== 404) throw e;
        await aw(c, vendorPath, { method: "POST", body: { documentId: userId, data: vendor } });
      }
    } else {
      const id = clean(new URL(req.url, "https://locapp.invalid").searchParams.get("id"), 200);
      if (!id) return json(res, 400, { error: "Falta o ID do produto a editar." });
      const existing = await aw(c, productPath + "/" + encodeURIComponent(id));
      if (clean(existing.vendor_id, 200) !== userId) return json(res, 403, { error: "Só podes editar os teus próprios produtos." });
      await aw(c, productPath + "/" + encodeURIComponent(id), { method: "PATCH", body: { data: { ...product, vendor_id: userId, updated_at: new Date().toISOString() } } });
      return json(res, 200, { message: "Produto atualizado.", id });
    }

    const saved = await aw(c, productPath, { method: "POST", body: {
      documentId: "unique()",
      data: { ...product, vendor_id: userId, updated_at: new Date().toISOString() }
    } });
    return json(res, 201, { message: "Produto publicado na Locapp.", id: saved.$id });
  } catch (error) {
    console.error("Locapp products API:", error.status || "", error.message);
    if (error.status === 401) return json(res, 401, { error: "Sessão inválida ou expirada. Entra novamente." });
    if (error.status === 404) return json(res, 502, { error: "Não encontrei a coleção ou o perfil comercial. Confirma os IDs no Appwrite." });
    if (error.status === 400) return json(res, 400, { error: error.message });
    return json(res, 503, { error: "Não foi possível guardar o produto. Confirma os atributos e permissões das coleções no Appwrite." });
  }
}
