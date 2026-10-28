
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

  if (!form || !input || !submitButton || !results) return;

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
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
  }

  function renderError(message) {
    results.replaceChildren();

    const panel = makeElement("div", "ai-error");
    panel.appendChild(makeElement("h2", "", "Não foi possível concluir a pesquisa."));
    panel.appendChild(makeElement("p", "", message));

    results.appendChild(panel);
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
        body.appendChild(makeElement("p", "", cleanParagraph));
      }
    });

    if (!answerText) {
      body.appendChild(
        makeElement("p", "", "Não foi devolvida uma resposta. Tenta reformular a pergunta.")
      );
    }

    article.appendChild(body);

    const sources = Array.isArray(data.sources) ? data.sources : [];

    if (sources.length > 0) {
      const sourceSection = makeElement("section", "ai-sources");
      sourceSection.appendChild(makeElement("h3", "", "Fontes consultadas"));

      sources.forEach(function (source, index) {
        const item = makeElement("div", "ai-source-item");
        const title = String(source.title || "Fonte " + (index + 1));

        item.appendChild(makeElement("strong", "", title));

        if (source.summary) {
          item.appendChild(makeElement("p", "", String(source.summary)));
        }

        const storeName = String(source.store || source.title || "").trim();
        const storeAddress = String(source.address || source.location || "").trim();

        if (source.store || source.address || source.location) {
          const storePanel = makeElement("div", "ai-store-details");
          storePanel.appendChild(makeElement("span", "ai-store-label", "LOJA / LOCALIZAÇÃO"));
          storePanel.appendChild(makeElement("strong", "ai-store-name", storeName || "Loja registada"));
          if (storeAddress) {
            storePanel.appendChild(makeElement("p", "ai-source-location", "📍 " + storeAddress));
          }

          const hasCoordinates =
            Number.isFinite(Number(source.latitude)) &&
            Number.isFinite(Number(source.longitude)) &&
            source.latitude !== null && source.longitude !== null &&
            source.latitude !== "" && source.longitude !== "";

          let mapUrl = "";
          if (hasCoordinates) {
            mapUrl = "https://www.openstreetmap.org/?mlat=" +
              encodeURIComponent(String(source.latitude)) +
              "&mlon=" + encodeURIComponent(String(source.longitude)) +
              "#map=17/" + encodeURIComponent(String(source.latitude)) +
              "/" + encodeURIComponent(String(source.longitude));
          } else if (storeAddress) {
            mapUrl = "https://www.openstreetmap.org/search?query=" +
              encodeURIComponent([storeName, storeAddress].filter(Boolean).join(", "));
          }

          if (mapUrl) {
            const mapLink = makeElement("a", "ai-map-link", "⌖ Ver loja no mapa");
            mapLink.href = mapUrl;
            mapLink.target = "_blank";
            mapLink.rel = "noopener noreferrer";
            storePanel.appendChild(mapLink);
          } else {
            storePanel.appendChild(makeElement("p", "ai-map-unavailable",
              "O registo ainda não tem morada ou coordenadas suficientes para abrir o mapa."));
          }
          item.appendChild(storePanel);
        }

        if (source.url) {
          try {
            const url = new URL(source.url);

            if (url.protocol === "https:" || url.protocol === "http:") {
              const link = makeElement("a", "ai-source-link", "Consultar fonte ↗");
              link.href = url.href;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              item.appendChild(link);
            }
          } catch {
            // Ignora endereços inválidos.
          }
        }

        if (source.updatedAt) {
          item.appendChild(
            makeElement(
              "p",
              "",
              "Atualização registada: " + String(source.updatedAt)
            )
          );
        }

        sourceSection.appendChild(item);
      });

      article.appendChild(sourceSection);
    } else {
      const note = makeElement(
        "p",
        "ai-disclaimer",
        "Não foram devolvidas fontes específicas para esta pesquisa. Confirma a informação antes de tomar decisões."
      );
      article.appendChild(note);
    }

    results.appendChild(article);
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
        throw new Error(
          data.error ||
          "O serviço de pesquisa está temporariamente indisponível."
        );
      }

      renderAnswer(data);
    } catch (error) {
      console.error("Locapp pesquisa IA:", error);

      renderError(
        error.message ||
        "Não foi possível contactar o serviço. Verifica a ligação à Internet e tenta novamente."
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

  console.log("Locapp: página de pesquisa IA inicializada.");
});
