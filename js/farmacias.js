document.addEventListener("DOMContentLoaded", () => {
  const mapEl = document.getElementById("pharmacy-map");
  if (mapEl && window.L) {
    const map = L.map(mapEl).setView([-8.8383, 13.2344], 14);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: "abcd", maxZoom: 19
    }).addTo(map);
    L.marker([-8.8383, 13.2344]).addTo(map).bindPopup("Aviação, Luanda — zona inicial do Locapp");const locate=document.getElementById("locate-me");if(locate)locate.addEventListener("click",()=>{if(!navigator.geolocation)return;locate.textContent="A localizar…";navigator.geolocation.getCurrentPosition(pos=>{const point=[pos.coords.latitude,pos.coords.longitude];map.setView(point,16);L.circleMarker(point,{radius:8,color:"#f2dfbd",fillColor:"#168be0",fillOpacity:1,weight:3}).addTo(map).bindPopup("A sua localização aproximada").openPopup();locate.textContent="A mostrar a sua zona"},()=>{locate.textContent="Não foi possível obter localização"},{timeout:8000,maximumAge:60000})});
  }
  const form = document.getElementById("pharmacy-search");
  if (form) form.addEventListener("submit", event => {
    event.preventDefault();
    const results = document.getElementById("pharmacy-results");
    results.innerHTML = '<span>⌖</span><h3>Sem resultados registados</h3><p>Não existem ainda dados reais ligados ao catálogo. A pesquisa não inventará farmácias.</p>';
  });
});
