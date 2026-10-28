"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("publish-product-form");
  const list = document.getElementById("my-products-list");
  const status = document.getElementById("publish-status");
  if (!form || !window.Appwrite || !window.LOCAPP_CONFIG) return;
  const { Client, Account } = window.Appwrite;
  const client = new Client().setEndpoint(LOCAPP_CONFIG.appwriteEndpoint).setProject(LOCAPP_CONFIG.appwriteProjectId);
  const account = new Account(client);
  const api = "https://locapp-ruby.vercel.app/api/products";
  let user = null;
  let editingId = null;
  const $ = id => document.getElementById(id);
  const val = id => $(id)?.value.trim() || "";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  async function getJwt() {
    if (!user) user = await account.get();
    const jwt = await account.createJWT();
    return jwt.jwt;
  }
  function showStatus(text, isError=false) {
    if (status) { status.textContent = text; status.style.color = isError ? "#d94841" : ""; }
  }
  async function request(method, body, id) {
    const jwt = await getJwt();
    const url = id ? api + "?id=" + encodeURIComponent(id) : api;
    const response = await fetch(url, { method, headers: { "Content-Type":"application/json", "Accept":"application/json", "X-Appwrite-JWT":jwt }, body: body ? JSON.stringify(body) : undefined, cache:"no-store" });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  }
  function resetForm() {
    form.reset(); editingId = null;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.textContent = "Publicar produto";
  }
  async function loadMine() {
    if (!list) return;
    list.textContent = "A carregar os teus produtos…";
    try {
      const data = await request("GET");
      const items = data.items || [];
      if (!items.length) { list.textContent = "Ainda não publicaste produtos nesta conta."; return; }
      list.innerHTML = items.map(p => '<article class="demo-product"><h3>'+esc(p.name)+'</h3><p class="comparison-price">'+esc(p.price)+' Kz</p><p>'+esc(p.category)+'</p><button type="button" class="btn btn-outline" data-edit="'+esc(p.$id)+'">Editar</button></article>').join("");
      list.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", async () => {
        try {
          const id = button.dataset.edit;
          const item = items.find(p => p.$id === id);
          if (!item) return;
          editingId = id;
          $("product-name").value = item.name || "";
          $("product-category").value = item.category || "";
          $("product-description").value = item.description || "";
          $("product-price").value = item.price || "";
          const submit = form.querySelector('button[type="submit"]');
          if (submit) submit.textContent = "Guardar alterações";
          showStatus("A editar produto. Os dados da farmácia abaixo devem ser preenchidos para confirmar o perfil.");
          form.scrollIntoView({ behavior:"smooth", block:"start" });
        } catch (e) { showStatus(e.message, true); }
      }));
    } catch (e) {
      list.textContent = e.message || "Inicia sessão para ver os teus produtos.";
    }
  }
  account.get().then(value => { user = value; showStatus("Sessão iniciada como " + (value.email || value.name) + "."); loadMine(); })
    .catch(() => showStatus("Ainda não tens sessão iniciada. Abre a página Entrar e regista uma conta."));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const body = {
      name: val("product-name"), category: val("product-category"), description: val("product-description"),
      price: Number(val("product-price")), business_name: val("business-name"), address: val("business-address"),
      municipality: val("business-municipality"), province: val("business-province"),
      phone: val("business-phone"), whatsapp: val("business-whatsapp")
    };
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    showStatus("A guardar no Appwrite…");
    try {
      const result = await request(editingId ? "PATCH" : "POST", body, editingId);
      showStatus(result.message || "Produto guardado com sucesso.");
      resetForm();
      await loadMine();
    } catch (e) { showStatus(e.message || "Erro ao guardar. Verifica a sessão e as configurações.", true); }
    finally { if (submit) submit.disabled = false; }
  });
  const refresh = $("refresh-my-products");
  if (refresh) refresh.addEventListener("click", loadMine);
});
