"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-placeholder-form");
  if (!form || !window.Appwrite || !window.LOCAPP_CONFIG) return;
  const { Client, Account, ID } = window.Appwrite;
  const client = new Client().setEndpoint(LOCAPP_CONFIG.appwriteEndpoint).setProject(LOCAPP_CONFIG.appwriteProjectId);
  const account = new Account(client);
  const message = document.getElementById("auth-message");
  const submit = form.querySelector('button[type="submit"]');
  const mode = document.createElement("button");
  mode.type = "button"; mode.className = "btn btn-outline"; mode.textContent = "Já tenho conta — entrar";
  submit.insertAdjacentElement("afterend", mode);
  let registering = true;
  mode.addEventListener("click", () => {
    registering = !registering;
    submit.textContent = registering ? "Criar conta" : "Entrar";
    mode.textContent = registering ? "Já tenho conta — entrar" : "Ainda não tenho conta — registar";
    message.textContent = registering ? "Cria uma conta para publicar e gerir produtos." : "Introduz o e-mail e a palavra-passe da tua conta.";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const name = (document.getElementById("name")?.value || email.split("@")[0]).trim();
    if (password.length < 8) { message.textContent = "A palavra-passe deve ter pelo menos 8 caracteres."; return; }
    submit.disabled = true;
    message.textContent = registering ? "A criar conta…" : "A iniciar sessão…";
    try {
      if (registering) {
        await account.create(ID.unique(), email, password, name);
      }
      await account.createEmailPasswordSession(email, password);
      message.textContent = "Sessão iniciada. A abrir a área de publicação…";
      window.location.href = "publicar-produtos.html";
    } catch (error) {
      message.textContent = error.message || "Não foi possível autenticar. Confirma os dados e tenta novamente.";
    } finally { submit.disabled = false; }
  });
});
