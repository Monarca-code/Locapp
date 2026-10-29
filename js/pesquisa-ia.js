
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  // Substitui pelo domínio real do teu projeto Vercel.
  const API_URL = "https://locapp-ruby.vercel.app/api/search";

  const form = document.getElementById("ai-search-form");
  const input = document.getElementById("ai-query");
  const submitButton = document.getElementById("ai-submit");
  const results = document.getElementById("ai-results");
  const charCount = document.getElementById("ai-char-count");
  const suggestions = document.querySelectorAll(".ai-suggestion");
  const copyAnswerButton = document.getElementById("ai-copy-answer");

  if (copyAnswerButton) {
    copyAnswerButton.addEventListener("click", async function () {
      const answer = document.querySelector(".ai-answer-body");
      const text = answer ? answer.innerText.trim() : "";
      if (!text) {
        copyAnswerButton.title = "Ainda não há resposta para copiar";
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        copyAnswerButton.title = "Resposta copiada";
        copyAnswerButton.textContent = "✓";
        window.setTimeout(() => {
          copyAnswerButton.title = "Copiar resposta";
          copyAnswerButton.textContent = "▢";
        }, 1600);
      } catch (_) {
        copyAnswerButton.title = "Não foi possível copiar neste navegador";
      }
    });
  }

  const mapScreen = document.getElementById("ai-map-screen");
  const mapClose = document.getElementById("ai-map-close");
  const mapElement = document.getElementById("ai-result-map");
  const mapCaption = document.getElementById("ai-map-caption");
  let resultMap = null;
  let resultMarker = null;
  let mapReturnFocus = null;

  function openResultMap(details, trigger) {
    if (!mapScreen || !mapElement) return;
    mapReturnFocus = trigger || null;
    mapCaption.textContent = details.address
      ? details.name + " · " + details.address
      : details.name || "Localização do resultado";
    mapScreen.classList.add("is-active");
    mapScreen.setAttribute("aria-hidden", "false");
    document.body.classList.add("ai-map-open");

    const hasCoordinates = Number.isFinite(details.lat) && Number.isFinite(details.lon);
    const fallback = [-8.8383, 13.2344]; // Luanda, Angola

    function showMap(lat, lon, zoom) {
      if (typeof L === "undefined") {
        mapCaption.textContent = "Não foi possível carregar o mapa. Verifica a ligação à Internet.";
        return;
      }
      const center = [lat, lon];
      if (!resultMap) {
        resultMap = L.map(mapElement, { zoomControl: true }).setView(center, zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(resultMap);
      } else {
        resultMap.setView(center, zoom);
      }
      if (resultMarker) resultMap.removeLayer(resultMarker);
      resultMarker = L.marker(center).addTo(resultMap).bindPopup(details.name || "Localização do resultado").openPopup();
      window.setTimeout(() => resultMap && resultMap.invalidateSize(true), 420);
    }

    if (hasCoordinates) {
      showMap(details.lat, details.lon, 16);
    } else if (details.address) {
      mapCaption.textContent = "A localizar " + details.address + "…";
      fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent([details.name, details.address].filter(Boolean).join(", ")))
        .then(response => response.ok ? response.json() : [])
        .then(items => {
          if (!mapScreen.classList.contains("is-active")) return;
          if (items && items[0]) {
            showMap(Number(items[0].lat), Number(items[0].lon), 16);
            mapCaption.textContent = (details.name || "Local") + " · " + details.address;
          } else {
            showMap(fallback[0], fallback[1], 12);
            mapCaption.textContent = "Não foi possível localizar a morada com precisão. O mapa mostra Luanda como referência.";
          }
        })
        .catch(() => {
          showMap(fallback[0], fallback[1], 12);
          mapCaption.textContent = "Não foi possível localizar a morada. O mapa mostra Luanda como referência.";
        });
    } else {
      showMap(fallback[0], fallback[1], 12);
      mapCaption.textContent = "Este registo não contém coordenadas nem morada. O mapa mostra Luanda como referência.";
    }
    if (mapClose) mapClose.focus({ preventScroll: true });
  }

  function closeResultMap() {
    if (!mapScreen) return;
    mapScreen.classList.remove("is-active");
    mapScreen.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ai-map-open");
    if (mapReturnFocus) mapReturnFocus.focus({ preventScroll: true });
  }

  if (mapClose) mapClose.addEventListener("click", closeResultMap);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && mapScreen && mapScreen.classList.contains("is-active")) {
      closeResultMap();
    }
  });

  if (!form || !input || !submitButton || !results) return;

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  // Formata negrito/itálico simples sem interpretar HTML gerado pela IA.
  function appendFormattedText(container, text) {
    const pattern = /\\*\\*(.+?)\\*\\*|\\*(.+?)\\*/g;
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const formatted = document.createElement(match[1] ? "strong" : "em");
      formatted.textContent = match[1] || match[2];
      container.appendChild(formatted);
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function renderLoading() {
    results.replaceChildren();

    const panel = makeElement("div", "ai-loading");
    panel.appendChild(makeElement("div", "ai-loading-dot"));
    panel.appendChild(makeElement("h2", "", "A pesquisar na Locapp…"));
    panel.appendChild(
      makeElement(
        "p",
        "",
        "Estamos a consultar os conteúdos disponíveis e a preparar a resposta."
      )
    );

    results.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add("is-visible"));
  }

  function getReadableError(value) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      if (typeof value.message === "string" && value.message.trim()) return value.message.trim();
      if (typeof value.error === "string" && value.error.trim()) return value.error.trim();
      if (typeof value.details === "string" && value.details.trim()) return value.details.trim();
      if (typeof value.error_description === "string" && value.error_description.trim()) return value.error_description.trim();
      try {
        const serialized = JSON.stringify(value);
        if (serialized && serialized !== "{}") return serialized.slice(0, 700);
      } catch (_) {}
    }
    return "O servidor devolveu um erro sem detalhes legíveis. Verifica os registos da Vercel.";
  }

  function renderError(message) {
    results.replaceChildren();

    const panel = makeElement("div", "ai-error");
    panel.appendChild(makeElement("h2", "", "Não foi possível concluir a pesquisa."));
    panel.appendChild(makeElement("p", "", message));

    results.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add("is-visible"));
  }

  function renderAnswer(data) {
    results.replaceChildren();

    const article = makeElement("article", "ai-answer");
    const header = makeElement("div", "ai-answer-header");

    header.appendChild(makeElement("h2", "", "Resultado da pesquisa"));
    header.appendChild(makeElement("span", "ai-answer-badge", "LOCAPP IA"));
    article.appendChild(header);

    const body = makeElement("div", "ai-answer-body");
    const answerText = String(data.answer || "").trim();

    // Texto simples com parágrafos; não executa HTML vindo da IA.
    answerText.split(/\n{2,}/).forEach(function (paragraph) {
      const cleanParagraph = paragraph.trim();

      if (cleanParagraph) {
        const paragraphElement = makeElement("p");
        appendFormattedText(paragraphElement, cleanParagraph);
        body.appendChild(paragraphElement);
      }
    });

    if (!answerText) {
      body.appendChild(
        makeElement("p", "", "Não foi devolvida uma resposta. Tenta reformular a pergunta.")
      );
    }

    article.appendChild(body);

    // Botões das empresas reais associadas aos produtos encontrados.
    const companies = Array.isArray(data.companies) ? data.companies : [];
    if (companies.length) {
      const companySection = makeElement("div", "ai-company-results");
      companySection.appendChild(makeElement("p", "ai-company-results-title", "Empresas que publicaram estes produtos"));
      const companyButtons = makeElement("div", "ai-company-buttons");
      companies.forEach(function (company) {
        const name = String(company && company.name || "").trim();
        if (!name) return;
        const link = makeElement("a", "ai-company-button", "Ver empresa · " + name);
        link.href = "../pages/produtos.html?q=" + encodeURIComponent(name);
        link.setAttribute("aria-label", "Ver produtos publicados por " + name);
        companyButtons.appendChild(link);
      });
      companySection.appendChild(companyButtons);
      article.appendChild(companySection);
    }

    const sources = Array.isArray(data.sources) ? data.sources : [];

    // As fontes internas da Locapp ficam recolhidas para manter a resposta limpa.
    // Mostra no máximo três referências curtas; a IA continua a usar todos os dados no backend.
    if (sources.length > 0) {
      const sourceSection = makeElement("details", "ai-sources ai-sources-collapsed");
      const sourceSummary = makeElement(
        "summary",
        "ai-sources-summary",
        "Ver fontes (" + sources.length + ")"
      );
      sourceSection.appendChild(sourceSummary);

      const sourceList = makeElement("div", "ai-sources-list");
      sources.slice(0, 3).forEach(function (source, index) {
        const item = makeElement("div", "ai-source-item ai-source-compact");
        const title = String(source.title || "Fonte " + (index + 1));
        item.appendChild(makeElement("strong", "", title));

        const details = [];
        if (source.sourceType === "produto") {
          if (source.price !== null && source.price !== undefined) {
            details.push(
              new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(Number(source.price)) +
              " " + String(source.currency || "Kz")
            );
          }
          if (source.brand) details.push(String(source.brand));
          if (source.store || source.vendor) details.push(String(source.store || source.vendor));
          if (source.category) details.push(String(source.category));
        } else if (source.sourceType === "web") {
          details.push("Fonte pública");
        } else {
          details.push("Conteúdo da Locapp");
        }

        if (details.length) {
          item.appendChild(makeElement("p", "ai-source-meta", details.join(" · ")));
        }

        if (source.url) {
          try {
            const url = new URL(source.url);
            if (url.protocol === "https:" || url.protocol === "http:") {
              const link = makeElement("a", "ai-source-link", "Abrir fonte ↗");
              link.href = url.href;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              item.appendChild(link);
            }
          } catch (_) {
            // Ignora URLs inválidos.
          }
        }

        sourceList.appendChild(item);
      });

      if (sources.length > 3) {
        sourceList.appendChild(makeElement(
          "p",
          "ai-sources-more",
          "Mais " + (sources.length - 3) + " fontes foram usadas na análise e estão ocultas para manter a tela simples."
        ));
      }

      sourceSection.appendChild(sourceList);
      article.appendChild(sourceSection);
    }

    results.appendChild(article);
    requestAnimationFrame(() => article.classList.add("is-visible"));
  }

  async function search(query) {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      input.focus();
      return;
    }

    if (cleanQuery.length > 1000) {
      renderError("A pergunta ultrapassa o limite de 1.000 caracteres.");
      return;
    }

    submitButton.disabled = true;
    input.disabled = true;
    submitButton.querySelector("span").textContent = "A pesquisar…";

    renderLoading();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ query: cleanQuery }),
        cache: "no-store"
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        const detail = getReadableError(data.error || data.message || data);
        throw new Error("HTTP " + response.status + ": " + detail);
      }

      if (!data || typeof data !== "object" || typeof data.answer !== "string") {
        throw new Error("A API respondeu, mas não devolveu o campo 'answer'. Verifica os registos da Vercel.");
      }

      renderAnswer(data);
    } catch (error) {
      console.error("Locapp pesquisa IA:", error);

      renderError(
        getReadableError(error && error.message ? error.message : error)
      );
    } finally {
      submitButton.disabled = false;
      input.disabled = false;
      submitButton.querySelector("span").textContent = "Pesquisar";
    }
  }

  input.addEventListener("input", function () {
    charCount.textContent = input.value.length + "/1000";
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    search(input.value);
  });

  suggestions.forEach(function (button) {
    button.addEventListener("click", function () {
      input.value = button.textContent.trim();
      charCount.textContent = input.value.length + "/1000";
      search(input.value);
    });
  });

  // Recebe a pesquisa enviada pela página inicial através de ?q=...
  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    input.value = initialQuery.slice(0, 1000);
    charCount.textContent = input.value.length + "/1000";
    search(input.value);
  }

  console.log("Locapp: página de pesquisa IA inicializada.");
});
