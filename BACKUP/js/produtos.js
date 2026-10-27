document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const queryInput = document.getElementById("product-query");
  if (queryInput && params.has("q")) queryInput.value = params.get("q");

  const form = document.getElementById("product-search");
  if (form) form.addEventListener("submit", event => {
    event.preventDefault();
    const query = queryInput.value.trim();
    const results = document.getElementById("product-results");
    results.innerHTML = `<div class="empty-state wide"><span>▤</span><h2>Catálogo sem dados ligados</h2><p>${query ? "Pesquisa: " + escapeHtml(query) + ". " : ""}Quando o Appwrite estiver configurado, os resultados virão dos registos das farmácias.</p></div>`;
  });
});
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
