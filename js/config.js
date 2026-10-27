/*
 * Configuração pública do frontend.
 * Nunca colocar chaves secretas de IA ou chaves privadas aqui.
 */
window.LOCAPP_CONFIG = {
  appwriteEndpoint: "https://fra.cloud.appwrite.io/v1",
  appwriteProjectId: "COLOCA_AQUI_O_PROJECT_ID",
  databaseId: "locapp",
  collections: {
    pharmacies: "pharmacies",
    products: "products",
    offers: "offers",
    priceAlerts: "price_alerts"
  },
  // URL HTTPS de uma função backend que pesquisa fontes públicas e usa IA.
  // Só preencher depois de publicar e proteger a função no servidor.
  aiSearchEndpoint: ""
};
