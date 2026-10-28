"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const config = window.LOCAPP_CONFIG || {};
  const endpoint = config.catalogEndpoint || "https://locapp-ruby.vercel.app/api/catalog";
  const form = document.getElementById("product-search");
  const queryInput = document.getElementById("product-query");
  const sortSelect = document.getElementById("product-sort");
  const results = document.getElementById("product-results");
  if (!results) return;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  const money = (value, currency) => value === null
    ? "Preço não indicado"
    : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value) + " " + escapeHtml(currency || "Kz");

  function renderEmpty(title, message) {
    results.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "empty-state wide";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    panel.append(heading, paragraph);
    results.appendChild(panel);
  }

  function renderItems(items) {
    results.replaceChildren();
    if (!items.length) {
      renderEmpty("Nenhum produto encontrado", "Experimenta outro nome ou confirma mais tarde. Só são apresentados registos publicados.");
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "content-card catalog-product";
      if (item.imageUrl) {
        const image = document.createElement("img");
        image.src = item.imageUrl;
        image.alt = item.name;
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        card.appendChild(image);
      }
      const heading = document.createElement("h2");
      heading.textContent = item.name;
      card.appendChild(heading);
      const price = document.createElement("p");
      price.className = "comparison-price";
      price.textContent = money(item.price, item.currency);
      card.appendChild(price);
      if (item.description) {
        const description = document.createElement("p");
        description.textContent = item.description;
        card.appendChild(description);
      }
      const seller = document.createElement("p");
      seller.className = "catalog-vendor";
      seller.textContent = "🏪 " + item.vendor.name;
      card.appendChild(seller);
      const locationText = [item.vendor.address, item.vendor.municipality, item.vendor.province].filter(Boolean).join(", ");
      const location = document.createElement("p");
      location.className = "catalog-location";
      location.textContent = locationText ? "📍 " + locationText : "📍 Localização ainda não indicada pelo vendedor";
      card.appendChild(location);
      if (item.updatedAt) {
        const updated = document.createElement("small");
        updated.textContent = "Atualizado: " + item.updatedAt;
        card.appendChild(updated);
      }
      results.appendChild(card);
    });
  }

  let demoMode = false;

  async function loadDemoCatalog() {
    demoMode = true;
    renderEmpty("A carregar demonstração…", "A preparar os registos fictícios.");
    try {
      const response = await fetch("../data/demo-catalog.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar o catálogo de demonstração.");
      const data = await response.json();
      let items = Array.isArray(data.items) ? data.items : [];
      const q = queryInput ? queryInput.value.trim().toLocaleLowerCase("pt") : "";
      if (q) items = items.filter(item => [item.name,item.description,item.category,item.brand,item.vendor?.name,item.vendor?.address,item.vendor?.municipality].join(" ").toLocaleLowerCase("pt").includes(q));
      if (sortSelect && sortSelect.value === "price") items.sort((a,b) => a.price-b.price);
      else items.sort((a,b) => a.name.localeCompare(b.name,"pt"));
      const notice = document.getElementById("demo-catalog-notice");
      if (notice) notice.textContent = data.notice + " Empresas: " + data.companies.length + " · Produtos: " + data.items.length + ".";
      renderItems(items);
      results.querySelectorAll(".catalog-product").forEach(card => {
        const badge = document.createElement("span");
        badge.className = "demo-data-badge";
        badge.textContent = "FICTÍCIO · DEMO";
        card.prepend(badge);
      });
    } catch (error) {
      renderEmpty("Demonstração indisponível", error.message);
    }
  }

  async function loadProducts() {
    if (demoMode) { await loadDemoCatalog(); return; }
    const query = queryInput ? queryInput.value.trim() : "";
    const sort = sortSelect ? sortSelect.value : "name";
    const url = new URL(endpoint);
    if (query) url.searchParams.set("q", query);
    if (sort) url.searchParams.set("sort", sort);

    renderEmpty("A carregar catálogo…", "A consultar os produtos publicados na Locapp.");
    try {
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o catálogo.");
      renderItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Locapp catálogo:", error);
      renderEmpty("Catálogo indisponível", error.message || "Verifica a ligação e tenta novamente.");
    }
  }

  if (form) form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadProducts();
  });
  if (sortSelect) sortSelect.addEventListener("change", loadProducts);
  const demoButton = document.getElementById("show-demo-catalog");
  if (demoButton) demoButton.addEventListener("click", loadDemoCatalog);
  const realButton = document.getElementById("show-real-catalog");
  if (realButton) realButton.addEventListener("click", () => {
    demoMode = false;
    const notice = document.getElementById("demo-catalog-notice");
    if (notice) notice.textContent = "";
    loadProducts();
  });

  const params = new URLSearchParams(window.location.search);
  if (queryInput && params.has("q")) queryInput.value = params.get("q");
  loadProducts();
});
