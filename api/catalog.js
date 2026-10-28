"use strict";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function getAllowedOrigins() {
  return (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
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

async function appwriteGetDocument({ endpoint, databaseId, collectionId, documentId, projectId, apiKey }) {
  const url = `${endpoint}/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(documentId)}`;
  const response = await fetch(url, {
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  });
  if (!response.ok) return null;
  return response.json();
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

  if (originAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

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
  const productsCollectionId = clean(process.env.APPWRITE_PRODUCTS_COLLECTION_ID, 200);
  const vendorsCollectionId = clean(process.env.APPWRITE_VENDORS_COLLECTION_ID, 200);

  if (![endpoint, projectId, apiKey, databaseId, productsCollectionId, vendorsCollectionId].every(Boolean)) {
    return json(res, 500, {
      error: "Catálogo ainda não configurado. Define as variáveis APPWRITE_PRODUCTS_COLLECTION_ID e APPWRITE_VENDORS_COLLECTION_ID na Vercel."
    });
  }

  const searchParams = new URL(req.url, "https://locapp.invalid").searchParams;
  const search = clean(searchParams.get("q"), 100).toLocaleLowerCase("pt");
  const category = clean(searchParams.get("category"), 80);
  const sort = searchParams.get("sort") === "price" ? "price" : "name";
  const query = new URLSearchParams();
  query.append("queries[]", JSON.stringify({ method: "equal", attribute: "status", values: ["published"] }));
  if (category) query.append("queries[]", JSON.stringify({ method: "equal", attribute: "category", values: [category] }));
  query.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));

  try {
    const url = `${endpoint}/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(productsCollectionId)}/documents?${query.toString()}`;
    const response = await fetch(url, {
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
      console.error("Locapp catalog Appwrite error:", response.status, detail.slice(0, 300));
      return json(res, 502, { error: "Não foi possível consultar o catálogo. Confirma os IDs e os atributos da coleção products." });
    }

    const data = await response.json();
    const docs = Array.isArray(data.documents) ? data.documents : [];
    const vendorIds = [...new Set(docs.map((doc) => clean(doc.vendor_id, 200)).filter(Boolean))];
    const vendorEntries = await Promise.all(vendorIds.map(async (vendorId) => {
      const vendor = await appwriteGetDocument({
        endpoint, databaseId, collectionId: vendorsCollectionId, documentId: vendorId, projectId, apiKey
      });
      return [vendorId, vendor];
    }));
    const vendors = new Map(vendorEntries);

    let items = docs.map((doc) => {
      const vendor = vendors.get(clean(doc.vendor_id, 200)) || {};
      const imageValue = Array.isArray(doc.image_urls) ? doc.image_urls[0] : doc.image_url;
      const price = Number(doc.price);
      return {
        id: clean(doc.$id, 200),
        name: clean(doc.name || doc.title, 160) || "Produto sem nome",
        description: clean(doc.description, 600),
        category: clean(doc.category, 100),
        brand: clean(doc.brand, 100),
        price: Number.isFinite(price) && price >= 0 ? price : null,
        currency: clean(doc.currency, 8) || "Kz",
        condition: clean(doc.condition, 50),
        stockQuantity: Number.isFinite(Number(doc.stock_quantity)) ? Number(doc.stock_quantity) : null,
        updatedAt: clean(doc.updated_at || doc.$updatedAt, 80) || null,
        imageUrl: safeImage(imageValue),
        vendor: {
          id: clean(vendor.$id, 200),
          name: clean(vendor.business_name || vendor.name || vendor.title, 160) || "Vendedor registado",
          type: clean(vendor.business_type, 80),
          phone: clean(vendor.phone, 50),
          whatsapp: clean(vendor.whatsapp, 50),
          address: clean(vendor.address, 200),
          municipality: clean(vendor.municipality, 100),
          province: clean(vendor.province, 100),
          latitude: Number.isFinite(Number(vendor.latitude)) ? Number(vendor.latitude) : null,
          longitude: Number.isFinite(Number(vendor.longitude)) ? Number(vendor.longitude) : null,
          verificationStatus: clean(vendor.verification_status, 50)
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
