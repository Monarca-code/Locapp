"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const config = window.LOCAPP_CONFIG || {};
  const endpoint = config.catalogEndpoint || "https://locapp-ruby.vercel.app/api/catalog";
  const profile = document.getElementById("company-profile");
  const productsContainer = document.getElementById("company-products");
  const count = document.getElementById("company-product-count");
  const vendorId = new URLSearchParams(window.location.search).get("id");

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };
  const money = (value, currency) => value === null || value === undefined
    ? "Preço não indicado"
    : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value) + " " + (currency || "Kz");

  function showError(title, message) {
    profile.replaceChildren();
    const box = el("div", "empty-state wide");
    box.append(el("span", "", "ⓘ"), el("h2", "", title), el("p", "", message));
    profile.appendChild(box);
    productsContainer.replaceChildren();
    const empty = el("div", "empty-state wide");
    empty.append(el("h2", "", "Produtos indisponíveis"), el("p", "", "Não foi possível carregar os produtos desta empresa."));
    productsContainer.appendChild(empty);
  }

  function renderVendor(vendor, items) {
    profile.replaceChildren();
    const card = el("article", "company-hero");
    const top = el("div", "company-identity");
    if (vendor.imageUrl) {
      const image = el("img", "company-logo");
      image.src = vendor.imageUrl;
      image.alt = "Logótipo de " + vendor.name;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      top.appendChild(image);
    } else {
      top.appendChild(el("div", "company-logo-placeholder", "🏪"));
    }
    const heading = el("div", "company-heading");
    heading.append(el("span", "eyebrow", "PERFIL DA EMPRESA"), el("h1", "", vendor.name || "Empresa registada"));
    if (vendor.type) heading.appendChild(el("p", "company-type", vendor.type));
    top.appendChild(heading);
    card.appendChild(top);

    const details = el("div", "company-details");
    const address = [vendor.address, vendor.municipality, vendor.province].filter(Boolean).join(", ");
    if (address) details.appendChild(detail("📍", "Morada", address));
    if (vendor.phone) details.appendChild(detail("☎", "Telefone", vendor.phone));
    if (vendor.whatsapp) details.appendChild(detail("◉", "WhatsApp", vendor.whatsapp));
    if (vendor.verificationStatus) {
      const status = vendor.verificationStatus.toLowerCase();
      details.appendChild(detail("●", "Estado", status === "verified" || status === "approved" ? "Verificada" : "Registo não verificado"));
    }
    if (details.childElementCount) card.appendChild(details);

    if (vendor.phone || vendor.whatsapp) {
      const actions = el("div", "company-actions");
      const number = String(vendor.whatsapp || vendor.phone).replace(/[^\d+]/g, "").replace(/^\+/, "");
      if (number) {
        const contact = el("a", "btn btn-blue", vendor.whatsapp ? "Contactar pelo WhatsApp" : "Contactar empresa");
        contact.href = vendor.whatsapp
          ? "https://wa.me/" + number
          : "tel:" + String(vendor.phone).replace(/[^\d+]/g, "");
        if (vendor.whatsapp) { contact.target = "_blank"; contact.rel = "noopener noreferrer"; }
        actions.appendChild(contact);
      }
      card.appendChild(actions);
    }
    profile.appendChild(card);
    document.title = (vendor.name || "Empresa") + " | Locapp";
    count.textContent = items.length + (items.length === 1 ? " produto" : " produtos");
  }

  function detail(icon, label, value) {
    const row = el("div", "company-detail");
    row.append(el("span", "company-detail-icon", icon));
    const text = el("div", "");
    text.append(el("small", "", label), el("strong", "", value));
    row.appendChild(text);
    return row;
  }

  function renderProducts(items) {
    productsContainer.replaceChildren();
    if (!items.length) {
      const empty = el("div", "empty-state wide");
      empty.append(el("h2", "", "Ainda não há produtos publicados"), el("p", "", "Esta empresa ainda não tem produtos publicados disponíveis no catálogo."));
      productsContainer.appendChild(empty);
      return;
    }
    items.forEach(item => {
      const card = el("article", "content-card catalog-product company-product");
      if (item.imageUrl) {
        const image = el("img", "");
        image.src = item.imageUrl;
        image.alt = item.name;
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        card.appendChild(image);
      }
      card.appendChild(el("h3", "", item.name));
      card.appendChild(el("p", "comparison-price", money(item.price, item.currency)));
      if (item.category) card.appendChild(el("p", "company-product-meta", "Categoria: " + item.category));
      if (item.description) card.appendChild(el("p", "", item.description));
      if (item.stockQuantity !== null && item.stockQuantity !== undefined) {
        card.appendChild(el("p", "company-product-meta", item.stockQuantity > 0 ? "Stock registado: " + item.stockQuantity : "Sem stock registado"));
      } else {
        card.appendChild(el("p", "company-product-meta", "Stock não indicado"));
      }
      productsContainer.appendChild(card);
    });
  }

  if (!vendorId) {
    showError("Perfil não identificado", "Abre o perfil através de um botão de empresa nos resultados da pesquisa.");
    return;
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set("vendor", vendorId);
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível consultar a empresa.");
    if (!data.vendor) {
      showError("Empresa não encontrada", "Esta empresa não tem produtos publicados disponíveis ou o perfil já não está acessível.");
      return;
    }
    const items = Array.isArray(data.items) ? data.items : [];
    renderVendor(data.vendor, items);
    renderProducts(items);
  } catch (error) {
    console.error("Locapp perfil da empresa:", error);
    showError("Perfil temporariamente indisponível", error.message || "Verifica a ligação e tenta novamente.");
  }
});