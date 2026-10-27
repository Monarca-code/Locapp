document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-placeholder-form");
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const type = document.getElementById("account-type");
  if (params.get("tipo") === "farmacia" && type) type.value = "farmacia";
  form.addEventListener("submit", event => {
    event.preventDefault();
    const message = document.getElementById("auth-message");
    message.textContent = "Autenticação ainda não ativa. Nenhum dado foi enviado ou guardado.";
  });
});
