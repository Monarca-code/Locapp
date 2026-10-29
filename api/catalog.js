"use strict";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function getAllowedOrigins() {
  return (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
    .split(",").map((value) => value.trim().replace(/\/+$/, "")).filter(Boolean);
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function safeImage(value) {
  const candidate = clean(value, 1000);
  try {
    const parsed = new URL(candidate);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

async function appwriteRequest(path, { endpoint, projectId, apiKey } = {}) {
  const response = await fetch(endpoint + path, {
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Locapp catalog TablesDB error:", response.status, path, detail.slice(0, 300));
    throw new Error("APPWRITE_QUERY_FAILED");
  }
  return response.json();
}

async function resolveTableId({ endpoint, projectId, apiKey, databaseId, configuredId, fallbackName }) {
  const params = new URLSearchParams();
  params.append("queries[]", JSON.stringify({ method: "limit", values: [500] }));
  const data = await appwriteRequest(
    "/tablesdb/" + encodeURIComponent(databaseId) + "/tables?" + params.toString(),
    { endpoint, projectId, apiKey }
  );
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const configured = String(configuredId || "").trim();
  const found = tables.find((table) =>
    (configured && (String(table.$id) === configured || String(table.name) === configured)) ||
    String(table.name) === fallbackName
  );
  return found ? String(found.$id) : null;
}

function normalizeRow(row) {
  return { ...(row && typeof row.data === "object" ? row.data : {}), ...(row || {}) };
}

async function loadTableRows({ endpoint, projectId, apiKey, databaseId, configuredId, tableName }) {
  const tableId = await resolveTableId({
    endpoint, projectId, apiKey, databaseId, configuredId, fallbackName: tableName
  });
  if (!tableId) {
    console.warn("Locapp catalog: tabela não encontrada:", tableName);
    return [];
  }
  const params = new URLSearchParams();
  params.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));
  const data = await appwriteRequest(
    "/tablesdb/" + encodeURIComponent(databaseId) + "/tables/" +
      encodeURIComponent(tableId) + "/rows?" + params.toString(),
    { endpoint, projectId, apiKey }
  );
  return (Array.isArray(data.rows) ? data.rows : []).map(normalizeRow);
}

async function appwriteGetRow({ endpoint, databaseId, tableId, rowId, projectId, apiKey }) {
  try {
    const row = await appwriteRequest(
      "/tablesdb/" + encodeURIComponent(databaseId) + "/tables/" +
        encodeURIComponent(tableId) + "/rows/" + encodeURIComponent(rowId),
      { endpoint, projectId, apiKey }
    );
    return normalizeRow(row);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const origin = clean(req.headers.origin, 500).replace(/\/+$/, "");
  const allowedOrigins = getAllowedOrigins();
  const host = clean(req.headers.host, 300).toLowerCase();
  const sameDeploymentOrigin = host === "locapp-ruby.vercel.app" && (!origin || origin === "https://locapp-ruby.vercel.app");
  const originAllowed = allowedOrigins.includes(origin) || sameDeploymentOrigin;
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (originAllowed && origin) res.setHeader("Access-Control-Allow-Origin", origin);

  if (req.method === "OPTIONS") {
    if (!originAllowed) return json(res, 403, { error: "Origem não autorizada." });
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return json(res, 405, { error: "Método não permitido." });
  }
  if (!originAllowed) return json(res, 403, { error: "Origem não autorizada." });

  const endpoint = clean(process.env.APPWRITE_ENDPOINT, 300).replace(/\/+$/, "");
  const projectId = clean(process.env.APPWRITE_PROJECT_ID, 200);
  const apiKey = process.env.APPWRITE_API_KEY || "";
  const databaseId = clean(process.env.APPWRITE_DATABASE_ID, 200);
  const productsTableConfiguredId = clean(process.env.APPWRITE_PRODUCTS_COLLECTION_ID, 200);
  const vendorsTableConfiguredId = clean(process.env.APPWRITE_VENDORS_COLLECTION_ID, 200);

  if (![endpoint, projectId, apiKey, databaseId].every(Boolean)) {
    return json(res, 500, { error: "Catálogo ainda não configurado. Confirma as variáveis de ambiente do Appwrite na Vercel." });
  }

  const searchParams = new URL(req.url, "https://locapp.invalid").searchParams;
  const search = clean(searchParams.get("q"), 100).toLocaleLowerCase("pt");
  const category = clean(searchParams.get("category"), 80);
  const sort = searchParams.get("sort") === "price" ? "price" : "name";

  try {
    const docs = (await loadTableRows({
      endpoint, projectId, apiKey, databaseId,
      configuredId: productsTableConfiguredId, tableName: "products"
    })).filter((doc) => String(doc.status || doc.publication_status || "").toLowerCase() === "published")
      .filter((doc) => !category || clean(doc.category, 100).toLocaleLowerCase("pt") === category.toLocaleLowerCase("pt"));

    const vendorIds = [...new Set(docs.map((doc) => clean(doc.vendor_id || doc.vendorId, 200)).filter(Boolean))];
    let vendorTableId = null;
    if (vendorIds.length) {
      vendorTableId = await resolveTableId({
        endpoint, projectId, apiKey, databaseId,
        configuredId: vendorsTableConfiguredId, fallbackName: "vendors"
      });
    }
    const vendorEntries = await Promise.all(vendorIds.map(async (vendorId) => {
      const vendor = vendorTableId ? await appwriteGetRow({
        endpoint, databaseId, tableId: vendorTableId, rowId: vendorId, projectId, apiKey
      }) : null;
      return [vendorId, vendor || {}];
    }));
    const vendors = new Map(vendorEntries);

    let items = docs.map((doc) => {
      const vendor = vendors.get(clean(doc.vendor_id || doc.vendorId, 200)) || {};
      const imageValue = Array.isArray(doc.image_urls) ? doc.image_urls[0] : (doc.image_url || doc.image || doc.photo_url);
      const price = Number(doc.price);
      return {
        id: clean(doc.$id || doc.id, 200),
        name: clean(doc.name || doc.title, 160) || "Produto sem nome",
        description: clean(doc.description, 600),
        category: clean(doc.category, 100),
        brand: clean(doc.brand, 100),
        price: doc.price !== undefined && doc.price !== null && doc.price !== "" && Number.isFinite(price) && price >= 0 ? price : null,
        currency: clean(doc.currency, 8) || "Kz",
        condition: clean(doc.condition, 50),
        stockQuantity: doc.stock_quantity !== undefined && doc.stock_quantity !== null && doc.stock_quantity !== "" && Number.isFinite(Number(doc.stock_quantity)) ? Number(doc.stock_quantity) : null,
        updatedAt: clean(doc.updated_at || doc.$updatedAt, 80) || null,
        imageUrl: safeImage(imageValue),
        vendor: {
          id: clean(vendor.$id || vendor.$rowId || vendor.id, 200),
          name: clean(vendor.business_name || vendor.name || vendor.title, 160) || "Vendedor registado",
          type: clean(vendor.business_type, 80),
          phone: clean(vendor.phone, 50),
          whatsapp: clean(vendor.whatsapp, 50),
          address: clean(vendor.address, 200),
          municipality: clean(vendor.municipality, 100),
          province: clean(vendor.province, 100),
          latitude: vendor.latitude !== null && vendor.latitude !== undefined && vendor.latitude !== "" && Number.isFinite(Number(vendor.latitude)) ? Number(vendor.latitude) : null,
          longitude: vendor.longitude !== null && vendor.longitude !== undefined && vendor.longitude !== "" && Number.isFinite(Number(vendor.longitude)) ? Number(vendor.longitude) : null,
          verificationStatus: clean(vendor.verification_status, 50),
          status: clean(vendor.status || vendor.publication_status, 50),
          imageUrl: safeImage(vendor.image_url || vendor.logo_url || vendor.image || vendor.photo_url)
        }
      };
    });

    if (search) {
      items = items.filter((item) => [
        item.name, item.description, item.category, item.brand,
        item.vendor.name, item.vendor.address, item.vendor.municipality, item.vendor.province
      ].join(" ").toLocaleLowerCase("pt").includes(search));
    }

    items.sort((a, b) => {
      if (sort === "price") {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      }
      return a.name.localeCompare(b.name, "pt");
    });

    return json(res, 200, { items, count: items.length, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Locapp catalog error:", error.message);
    return json(res, 503, { error: "O catálogo está temporariamente indisponível. Tenta novamente mais tarde." });
  }
}
