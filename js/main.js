
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  // =========================================
  // 1. MENU MOBILE
  // =========================================
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      const isOpen = navigation.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    navigation.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navigation.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  // =========================================
  // 2. ELEMENTOS DOS MAPAS
  // =========================================
  const initialPosition = [-8.8383, 13.2344];

  const homeMapElement = document.getElementById("hero-map");
  const openMapButton = document.getElementById("show-map");
  const homeLocateButton = document.getElementById("locate-me");

  const mapScreen = document.getElementById("map-screen");
  const closeMapButton = document.getElementById("close-map");
  const fullscreenMapElement = document.getElementById("fullscreen-map");
  const fullscreenLocateButton = document.getElementById("map-locate-me");

  let homeMap = null;
  let fullscreenMap = null;
  let homeUserMarker = null;
  let fullscreenUserMarker = null;

  // =========================================
  // 3. CRIAR UM MAPA LEAFLET
  // =========================================
  function createMap(element, zoom) {
    if (!element) return null;

    if (typeof L === "undefined") {
      console.error("Locapp: Leaflet não foi carregado.");
      element.innerHTML =
        '<p class="map-error">Não foi possível carregar o mapa. Verifica a ligação à Internet.</p>';
      return null;
    }

    const map = L.map(element, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(initialPosition, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    L.marker(initialPosition)
      .addTo(map)
      .bindPopup("Locapp — zona inicial: Aviação, Luanda");

    return map;
  }

  // O mapa da página inicial é criado ao carregar a página.
  if (homeMapElement) {
    homeMap = createMap(homeMapElement, 15);
  }

  // =========================================
  // 4. ABRIR E FECHAR O MAPA EM ECRÃ INTEIRO
  // =========================================
  function openFullscreenMap() {
    if (!mapScreen || !fullscreenMapElement) {
      console.error("Locapp: secção do mapa não encontrada.");
      return;
    }

    mapScreen.classList.add("is-active");
    mapScreen.setAttribute("aria-hidden", "false");

    document.body.classList.add("map-screen-open");
    document.body.style.overflow = "hidden";

    if (!fullscreenMap) {
      fullscreenMap = createMap(fullscreenMapElement, 15);
    }

    // O Leaflet precisa de recalcular as dimensões após a animação.
    window.setTimeout(function () {
      if (fullscreenMap) {
        fullscreenMap.invalidateSize(true);
      }
    }, 400);

    if (closeMapButton) {
      closeMapButton.focus({ preventScroll: true });
    }
  }

  function closeFullscreenMap() {
    if (!mapScreen) return;

    mapScreen.classList.remove("is-active");
    mapScreen.setAttribute("aria-hidden", "true");

    // Espera que a animação termine antes de restaurar a página.
    window.setTimeout(function () {
      if (!mapScreen.classList.contains("is-active")) {
        document.body.classList.remove("map-screen-open");
        document.body.style.overflow = "";

        if (homeMap) {
          homeMap.invalidateSize(true);
        }

        if (openMapButton) {
          openMapButton.focus({ preventScroll: true });
        }
      }
    }, 700);
  }

  if (openMapButton) {
    openMapButton.addEventListener("click", function (event) {
      event.preventDefault();
      openFullscreenMap();
    });
  }

  if (closeMapButton) {
    closeMapButton.addEventListener("click", closeFullscreenMap);
  }

  // A tecla Escape fecha o mapa quando este está aberto.
  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      mapScreen &&
      mapScreen.classList.contains("is-active")
    ) {
      closeFullscreenMap();
    }
  });

  // =========================================
  // 5. LOCALIZAÇÃO GPS
  // =========================================
  function locateUser(mapInstance, markerType, button) {
    if (!button) return;

    if (!mapInstance) {
      alert("O mapa ainda não está disponível. Verifica a ligação à Internet.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Este navegador não suporta a localização GPS.");
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "A localizar…";

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const coordinates = [
          position.coords.latitude,
          position.coords.longitude
        ];

        mapInstance.setView(coordinates, 17);

        if (markerType === "home") {
          if (homeUserMarker) {
            mapInstance.removeLayer(homeUserMarker);
          }

          homeUserMarker = L.marker(coordinates)
            .addTo(mapInstance)
            .bindPopup("A sua localização")
            .openPopup();
        } else {
          if (fullscreenUserMarker) {
            mapInstance.removeLayer(fullscreenUserMarker);
          }

          fullscreenUserMarker = L.marker(coordinates)
            .addTo(mapInstance)
            .bindPopup("A sua localização")
            .openPopup();
        }

        button.textContent = "Localização encontrada";
        button.disabled = false;
      },
      function (error) {
        console.error("Locapp GPS:", error.code, error.message);

        let message =
          "Não foi possível obter a localização. Verifica as permissões do navegador.";

        if (error.code === 1) {
          message = "Permite o acesso à localização nas definições do navegador.";
        } else if (error.code === 2) {
          message = "A localização não está disponível neste momento.";
        } else if (error.code === 3) {
          message = "A localização demorou demasiado tempo. Tenta novamente.";
        }

        button.textContent = originalText;
        button.disabled = false;
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }

  if (homeLocateButton) {
    homeLocateButton.addEventListener("click", function () {
      locateUser(homeMap, "home", homeLocateButton);
    });
  }

  if (fullscreenLocateButton) {
    fullscreenLocateButton.addEventListener("click", function () {
      // Abre o mapa primeiro, se ainda estiver fechado.
      if (mapScreen && !mapScreen.classList.contains("is-active")) {
        openFullscreenMap();
      }

      // Aguarda a inicialização do mapa, se necessária.
      window.setTimeout(function () {
        locateUser(fullscreenMap, "fullscreen", fullscreenLocateButton);
      }, 100);
    });
  }

  // =========================================
  // 6. PESQUISA NA PÁGINA INICIAL
  // =========================================
  const searchForm = document.getElementById("home-search");
  const searchInput = document.getElementById("home-query");

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const query = searchInput.value.trim();

      if (!query) {
        searchInput.focus();
        return;
      }

      openAiModal(query);
    });
  }

  // =========================================

  // =========================================
  // 9. PESQUISA IA EM JANELA SOBRE A PÁGINA
  // =========================================
  const aiModal = document.getElementById("locapp-ai");
  const aiInput = document.getElementById("ai-query");
  const aiForm = document.getElementById("ai-search-form");
  let aiLastFocus = null;

  function openAiModal(query) {
    if (!aiModal) {
      window.location.href = "pages/pesquisa-ia.html" + (query ? "?q=" + encodeURIComponent(query) : "");
      return;
    }
    aiLastFocus = document.activeElement;
    aiModal.classList.add("is-active");
    aiModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("ai-modal-open");
    document.body.style.overflow = "hidden";
    if (query && aiInput) {
      aiInput.value = query;
      aiInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (aiForm) aiForm.requestSubmit();
    } else if (aiInput) {
      window.setTimeout(() => aiInput.focus({ preventScroll: true }), 180);
    }
  }

  function closeAiModal() {
    if (!aiModal) return;
    aiModal.classList.remove("is-active");
    aiModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ai-modal-open");
    document.body.style.overflow = "";
    if (aiLastFocus && typeof aiLastFocus.focus === "function") {
      aiLastFocus.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll("[data-open-ai]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      openAiModal("");
    });
  });
  document.querySelectorAll("[data-close-ai]").forEach(control => {
    control.addEventListener("click", closeAiModal);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && aiModal && aiModal.classList.contains("is-active")) closeAiModal();
  });

  // 7. AJUSTAR OS MAPAS AO REDIMENSIONAR
  // =========================================
  window.addEventListener("resize", function () {
    if (homeMap) {
      homeMap.invalidateSize(true);
    }

    if (
      fullscreenMap &&
      mapScreen &&
      mapScreen.classList.contains("is-active")
    ) {
      fullscreenMap.invalidateSize(true);
    }
  });


  // =========================================
  // 8. CONTEÚDOS PUBLICADOS NO CATÁLOGO
  // =========================================
  const publishedGrid = document.getElementById("published-grid");

  function createPublishedCard(item) {
    const card = document.createElement("article");
    card.className = "published-card";

    if (item.imageUrl) {
      const image = document.createElement("img");
      image.className = "published-image";
      image.src = item.imageUrl;
      image.alt = item.name || "Imagem do produto";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.onerror = function () {
        const placeholder = document.createElement("div");
        placeholder.className = "published-image published-image-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = "◇";
        image.replaceWith(placeholder);
      };
      card.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "published-image published-image-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "◇";
      card.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "published-card-body";

    if (item.category) {
      const category = document.createElement("span");
      category.className = "published-category";
      category.textContent = item.category;
      body.appendChild(category);
    }

    const title = document.createElement("h3");
    title.textContent = item.name || "Produto publicado";
    body.appendChild(title);

    if (item.description) {
      const description = document.createElement("p");
      description.className = "published-description";
      description.textContent = item.description;
      body.appendChild(description);
    }

    if (Number.isFinite(item.price)) {
      const price = document.createElement("div");
      price.className = "published-price";
      price.textContent = new Intl.NumberFormat("pt-AO", {
        maximumFractionDigits: 2
      }).format(item.price) + " " + (item.currency || "Kz");
      body.appendChild(price);
    } else {
      const noPrice = document.createElement("div");
      noPrice.className = "published-vendor";
      noPrice.textContent = "Preço não indicado";
      body.appendChild(noPrice);
    }

    const vendor = document.createElement("div");
    vendor.className = "published-vendor";
    vendor.textContent = item.vendor && item.vendor.name ? item.vendor.name : "Vendedor registado";
    body.appendChild(vendor);

    card.appendChild(body);
    return card;
  }

  async function loadPublishedContent() {
    if (!publishedGrid) return;

    try {
      const response = await fetch("/api/catalog?sort=name", {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      const result = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível carregar o catálogo.");
      }

      const items = Array.isArray(result.items) ? result.items : [];
      publishedGrid.replaceChildren();

      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "published-state";
        empty.textContent = "Ainda não existem produtos publicados para apresentar. Quando um negócio publicar conteúdo, ele aparecerá aqui.";
        publishedGrid.appendChild(empty);
        return;
      }

      items.slice(0, 8).forEach(function (item) {
        publishedGrid.appendChild(createPublishedCard(item));
      });
    } catch (error) {
      console.error("Locapp: erro ao carregar conteúdos publicados:", error);
      publishedGrid.replaceChildren();
      const state = document.createElement("div");
      state.className = "published-state";
      state.textContent = "Não foi possível carregar os conteúdos publicados neste momento.";
      publishedGrid.appendChild(state);
    }
  }

  loadPublishedContent();

  console.log("Locapp: aplicação inicializada.");
});
