(() => {
  'use strict';
  const LUANDA = [-8.8383, 13.2344];
  const $ = (selector) => document.querySelector(selector);
  const toast = $('#toast');
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
  }

  // The maps show the general area only. No pharmacy pins are invented.
  function makeMap(elementId, zoom, interactive = true) {
    const element = document.getElementById(elementId);
    if (!element || !window.L) return null;
    const map = L.map(elementId, {
      center: LUANDA,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      attributionControl: true
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);
    return map;
  }
  const heroMap = makeMap('heroMap', 13, false);
  const pharmacyMap = makeMap('pharmacyMap', 14, true);
  if (heroMap) {
    // A single neutral marker identifies the general project area, not a business.
    const areaIcon = L.divIcon({className:'locapp-area-marker', html:'<span style="display:block;width:24px;height:24px;border:4px solid #f2dfbd;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:#168be0;box-shadow:0 0 0 9px #168be033,0 0 24px #168be0"></span>', iconSize:[24,24], iconAnchor:[12,22]});
    L.marker(LUANDA, {icon:areaIcon, interactive:false}).addTo(heroMap);
  }

  $('#year').textContent = new Date().getFullYear();
  const menu = $('#nav');
  $('#mobileMenu').addEventListener('click', () => {
    const opened = menu.classList.toggle('open');
    $('#mobileMenu').setAttribute('aria-expanded', String(opened));
    $('#mobileMenu').textContent = opened ? '×' : '☰';
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('open');
    $('#mobileMenu').setAttribute('aria-expanded', 'false');
    $('#mobileMenu').textContent = '☰';
  }));

  $('#heroSearch').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = $('#heroQuery').value.trim();
    $('#productSearch')?.setAttribute('value', query);
    if ($('#productSearch')) $('#productSearch').value = query;
    document.querySelector('#farmacias').scrollIntoView({behavior:'smooth'});
    showToast(query ? `A pesquisa por “${query}” ficará disponível quando os dados das farmácias forem ligados.` : 'A pesquisa de produtos será ativada quando existirem dados reais registados.');
  });

  $('#locateMe').addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Este navegador não disponibiliza geolocalização.');
      return;
    }
    $('#locateMe').disabled = true;
    $('#locateMe').textContent = 'A obter localização…';
    navigator.geolocation.getCurrentPosition(position => {
      const point = [position.coords.latitude, position.coords.longitude];
      if (pharmacyMap) {
        pharmacyMap.setView(point, 15);
        L.circleMarker(point, {radius:7,color:'#f2dfbd',weight:3,fillColor:'#168be0',fillOpacity:1}).addTo(pharmacyMap).bindPopup('A sua localização');
      }
      $('#locateMe').disabled = false;
      $('#locateMe').textContent = '⌖ Usar a minha localização';
      showToast('Localização encontrada. Ainda não existem farmácias verificadas para listar.');
    }, error => {
      $('#locateMe').disabled = false;
      $('#locateMe').textContent = '⌖ Usar a minha localização';
      const messages = {1:'Permita o acesso à localização nas definições do navegador.',2:'Não foi possível determinar a localização neste momento.',3:'A localização demorou demasiado tempo. Tente novamente.'};
      showToast(messages[error.code] || 'Não foi possível obter a localização.');
    }, {enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  });
})();
