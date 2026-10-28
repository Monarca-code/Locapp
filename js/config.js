/*
 * Configuração pública do frontend.
 * Nunca colocar chaves secretas de IA ou chaves privadas aqui.
 */
window.LOCAPP_CONFIG = {
  appwriteEndpoint: "https://fra.cloud.appwrite.io/v1",
  appwriteProjectId: "6ab3b4f60024bedabd55",
  databaseId: "locapp_db",
  collections: {
    pharmacies: "pharmacies",
    products: "products",
    vendors: "vendors",
    offers: "offers",
    priceAlerts: "price_alerts",
    contents: "6ae0baa4001090ac39cb"
  },
  // URL HTTPS de uma função backend que pesquisa fontes públicas e usa IA.
  // Só preencher depois de publicar e proteger a função no servidor.
  aiSearchEndpoint: "https://locapp-ruby.vercel.app/api/search",
  catalogEndpoint: "https://locapp-ruby.vercel.app/api/catalog"
};
