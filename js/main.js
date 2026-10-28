
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
  // 8. ESTABELECIMENTOS COM CONTEÚDO PUBLICADO
  // =========================================
  const publishedGrid = document.getElementById("published-grid");
  const refreshPublishedButton = document.getElementById("published-refresh");
  const businessDetailsPanel = document.getElementById("business-map-details");
  let publishedBusinesses = [];
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  function compactBusinessList(items) {
    const businesses = new Map();
    items.forEach(item => {
      const vendor = item.vendor || {};
      const id = vendor.id || vendor.name || item.id;
      if (!businesses.has(id)) businesses.set(id, {
        id: vendor.id || "", name: vendor.name || "Estabelecimento registado",
        type: vendor.type || item.category || "Negócio", address: vendor.address || "",
        municipality: vendor.municipality || "", province: vendor.province || "",
        phone: vendor.phone || "", whatsapp: vendor.whatsapp || "",
        latitude: Number.isFinite(vendor.latitude) ? vendor.latitude : null,
        longitude: Number.isFinite(vendor.longitude) ? vendor.longitude : null,
        imageUrl: vendor.imageUrl || item.imageUrl || "", products: [], updatedAt: item.updatedAt || ""
      });
      const business = businesses.get(id);
      business.products.push({
        id: item.id, name: item.name || "Produto publicado", category: item.category || "",
        description: item.description || "", price: Number.isFinite(item.price) ? item.price : null,
        currency: item.currency || "Kz", imageUrl: item.imageUrl || ""
      });
      if (!business.imageUrl && item.imageUrl) business.imageUrl = item.imageUrl;
      if (!business.updatedAt && item.updatedAt) business.updatedAt = item.updatedAt;
    });
    return [...businesses.values()].sort((a,b) => a.name.localeCompare(b.name,"pt"));
  }

  function businessImage(business) {
    if (business.imageUrl) return '<img class="published-image" src="' + escapeHtml(business.imageUrl) +
      '" alt="' + escapeHtml(business.name) + '" loading="lazy" referrerpolicy="no-referrer">';
    return '<div class="published-image published-image-placeholder" aria-hidden="true">⌖</div>';
  }

  function renderPublishedBusinesses() {
    if (!publishedGrid) return;
    publishedGrid.replaceChildren();
    if (!publishedBusinesses.length) {
      const empty=document.createElement("div"); empty.className="published-state";
      empty.textContent="Ainda não existem estabelecimentos com produtos publicados para apresentar.";
      publishedGrid.appendChild(empty); return;
    }
    publishedBusinesses.slice(0,12).forEach(business => {
      const card=document.createElement("button"); card.type="button";
      card.className="published-card published-business-card";
      card.setAttribute("aria-label","Ver "+business.name+" no mapa");
      const place=[business.municipality,business.province].filter(Boolean).join(", ");
      card.innerHTML=businessImage(business)+
        '<span class="published-card-body"><span class="published-category">'+escapeHtml(business.type)+'</span>'+
        '<strong class="published-business-name">'+escapeHtml(business.name)+'</strong>'+
        '<span class="published-vendor published-business-location">'+escapeHtml(place||business.address||"Localização não indicada")+'</span>'+
        '<span class="published-business-count">'+business.products.length+(business.products.length===1?" produto publicado":" produtos publicados")+'</span>'+
        '</span><span class="published-business-arrow" aria-hidden="true">↗</span>';
      card.addEventListener("click",()=>openBusinessOnMap(business));
      const image=card.querySelector("img");
      if(image) image.addEventListener("error",()=>{
        const placeholder=document.createElement("div"); placeholder.className="published-image published-image-placeholder";
        placeholder.setAttribute("aria-hidden","true"); placeholder.textContent="⌖"; image.replaceWith(placeholder);
      },{once:true});
      publishedGrid.appendChild(card);
    });
  }

  function openBusinessOnMap(business) {
    if(!mapScreen||!fullscreenMapElement) return;
    mapScreen.classList.add("is-active"); mapScreen.setAttribute("aria-hidden","false");
    document.body.classList.add("map-screen-open"); document.body.style.overflow="hidden";
    if(!fullscreenMap) fullscreenMap=createMap(fullscreenMapElement,14);
    if(fullscreenMap) window.setTimeout(()=>{
      fullscreenMap.invalidateSize(true);
      const hasCoordinates=Number.isFinite(business.latitude)&&Number.isFinite(business.longitude)&&
        Math.abs(business.latitude)<=90&&Math.abs(business.longitude)<=180&&!(business.latitude===0&&business.longitude===0);
      if(hasCoordinates) {
        fullscreenMap.setView([business.latitude,business.longitude],16);
        L.marker([business.latitude,business.longitude]).addTo(fullscreenMap)
          .bindPopup("<strong>"+escapeHtml(business.name)+"</strong><br>"+escapeHtml(business.address||"")).openPopup();
      } else fullscreenMap.setView(initialPosition,13);
    },120);

    if(businessDetailsPanel) {
      const address=[business.address,business.municipality,business.province].filter(Boolean).join(", ");
      const phone=business.phone?'<div class="business-detail-row"><span>Telefone</span><a href="tel:'+escapeHtml(business.phone.replace(/[^+\d]/g,""))+'">'+escapeHtml(business.phone)+'</a></div>':"";
      const digits=String(business.whatsapp||"").replace(/\D/g,"");
      const whatsapp=digits?'<div class="business-detail-row"><span>WhatsApp</span><a target="_blank" rel="noopener noreferrer" href="https://wa.me/'+escapeHtml(digits)+'">Contactar</a></div>':"";
      const coords=Number.isFinite(business.latitude)&&Number.isFinite(business.longitude)?
        '<div class="business-detail-row"><span>Coordenadas</span><span>'+business.latitude.toFixed(5)+', '+business.longitude.toFixed(5)+'</span></div>':"";
      const products=business.products.slice(0,5).map(product=>'<li><span>'+escapeHtml(product.name)+'</span>'+
        (product.price!==null?'<strong>'+new Intl.NumberFormat("pt-AO",{maximumFractionDigits:2}).format(product.price)+' '+escapeHtml(product.currency)+'</strong>':"")+'</li>').join("");
      businessDetailsPanel.hidden=false;
      businessDetailsPanel.innerHTML='<button type="button" class="business-details-close" aria-label="Fechar detalhes">✕</button>'+
        '<div class="business-details-kicker">ESTABELECIMENTO PUBLICADO</div><h2>'+escapeHtml(business.name)+'</h2>'+
        '<p class="business-details-type">'+escapeHtml(business.type)+'</p>'+
        '<div class="business-detail-row"><span>Morada</span><strong>'+escapeHtml(address||"Não indicada na base de dados")+'</strong></div>'+
        phone+whatsapp+coords+'<div class="business-products-heading">Produtos publicados</div>'+
        '<ul class="business-products-list">'+(products||'<li>Sem produtos detalhados.</li>')+'</ul>'+
        (business.updatedAt?'<p class="business-details-updated">Dados atualizados: '+escapeHtml(new Date(business.updatedAt).toLocaleDateString("pt-AO"))+'</p>':"");
      businessDetailsPanel.querySelector(".business-details-close").addEventListener("click",()=>{businessDetailsPanel.hidden=true;});
    }
  }

  async function loadPublishedContent() {
    if(!publishedGrid) return;
    if(refreshPublishedButton) refreshPublishedButton.disabled=true;
    publishedGrid.innerHTML='<div class="published-state"><span class="published-loader" aria-hidden="true"></span><span>A carregar estabelecimentos publicados…</span></div>';
    try {
      const response=await fetch("/api/catalog?sort=name",{method:"GET",headers:{"Accept":"application/json"},cache:"no-store"});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||"Não foi possível carregar o catálogo.");
      publishedBusinesses=compactBusinessList(Array.isArray(result.items)?result.items:[]);
      renderPublishedBusinesses();
    } catch(error) {
      console.error("Locapp: erro ao carregar estabelecimentos:",error);
      publishedGrid.innerHTML='<div class="published-state">Não foi possível carregar os estabelecimentos. Tenta novamente.</div>';
    } finally { if(refreshPublishedButton) refreshPublishedButton.disabled=false; }
  }
  if(refreshPublishedButton) refreshPublishedButton.addEventListener("click",loadPublishedContent);
  loadPublishedContent();

  console.log("Locapp: aplicação inicializada.");
});
