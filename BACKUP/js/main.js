document.addEventListener("DOMContentLoaded",()=>{const btn=document.querySelector(".menu-toggle"),nav=document.querySelector(".main-nav");if(btn&&nav)btn.addEventListener("click",()=>{nav.classList.toggle("open");btn.setAttribute("aria-expanded",String(nav.classList.contains("open")))});const el=document.getElementById("hero-map");if(el&&window.L){const fallback=[-8.8383,13.2344];const map=L.map(el,{zoomControl:false,scrollWheelZoom:false}).setView(fallback,14);L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{attribution:'&copy; OpenStreetMap &copy; CARTO',subdomains:"abcd",maxZoom:19}).addTo(map);L.control.zoom({position:"bottomright"}).addTo(map);L.circleMarker(fallback,{radius:7,color:"#36b9ff",fillColor:"#168be0",fillOpacity:1,weight:3}).addTo(map).bindPopup("Zona inicial: Aviação, Luanda");const locate=document.getElementById("locate-me");if(locate)locate.addEventListener("click",()=>{if(!navigator.geolocation){locate.textContent="Localização não suportada";return}locate.textContent="A localizar…";navigator.geolocation.getCurrentPosition(pos=>{const point=[pos.coords.latitude,pos.coords.longitude];map.setView(point,16);L.circleMarker(point,{radius:8,color:"#f2dfbd",fillColor:"#168be0",fillOpacity:1,weight:3}).addTo(map).bindPopup("A sua localização aproximada").openPopup();locate.textContent="A mostrar a sua zona"},()=>{locate.textContent="Não foi possível obter localização"}, {timeout:8000,maximumAge:60000})});setTimeout(()=>map.invalidateSize(),250)}const form=document.getElementById("home-search");if(form)form.addEventListener("submit",e=>{e.preventDefault();const q=document.getElementById("home-query").value.trim();if(!q)return;const target=new URL("pages/pesquisa-ia.html",location.href);target.searchParams.set("q",q);location.href=target.href})


// ===== SECÇÃO DE MAPA EXPANDIDA =====
const mapScreen = document.getElementById("map-screen");
const openMapButton = document.getElementById("show-map");
const closeMapButton = document.getElementById("close-map");
const fullscreenMapElement = document.getElementById("fullscreen-map");
const mapLocateButton = document.getElementById("map-locate-me");

let fullscreenMap = null;
let fullscreenUserMarker = null;

function openFullscreenMap() {
  if (!mapScreen || !fullscreenMapElement) return;

  mapScreen.classList.add("is-active");
  mapScreen.setAttribute("aria-hidden", "false");
  document.body.classList.add("map-screen-open");

  if (!fullscreenMap && typeof L !== "undefined") {
    fullscreenMap = L.map(fullscreenMapElement).setView(
      [-8.8383, 13.2344],
      15
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(fullscreenMap);

    L.control.zoom({ position: "bottomright" }).addTo(fullscreenMap);

    L.marker([-8.8383, 13.2344])
      .addTo(fullscreenMap)
      .bindPopup("Locapp — Aviação, Luanda");
  }

  window.setTimeout(function () {
    if (fullscreenMap) fullscreenMap.invalidateSize(true);
  }, 200);
}

function closeFullscreenMap() {
  if (!mapScreen) return;

  mapScreen.classList.remove("is-active");
  mapScreen.setAttribute("aria-hidden", "true");
  document.body.classList.remove("map-screen-open");
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

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && mapScreen?.classList.contains("is-active")) {
    closeFullscreenMap();
  }
});

if (mapLocateButton) {
  mapLocateButton.addEventListener("click", function () {
    if (!fullscreenMap) return;

    if (!navigator.geolocation) {
      alert("Este navegador não suporta localização GPS.");
      return;
    }

    mapLocateButton.disabled = true;
    mapLocateButton.textContent = "A localizar...";

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const coords = [
          position.coords.latitude,
          position.coords.longitude
        ];

        fullscreenMap.setView(coords, 17);

        if (fullscreenUserMarker) {
          fullscreenMap.removeLayer(fullscreenUserMarker);
        }

        fullscreenUserMarker = L.marker(coords)
          .addTo(fullscreenMap)
          .bindPopup("A sua localização")
          .openPopup();

        mapLocateButton.disabled = false;
        mapLocateButton.textContent = "⌖ Localização encontrada";
      },
      function () {
        mapLocateButton.disabled = false;
        mapLocateButton.textContent = "⌖ Tentar novamente";
        alert("Não foi possível obter a localização. Verifica a permissão do navegador.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  });
}});