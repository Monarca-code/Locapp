# Configuração do catálogo Locapp (Vercel + Appwrite)

O endpoint público `/api/catalog` devolve apenas documentos de produtos com `status = published`. A chave de API do Appwrite fica exclusivamente nas variáveis de ambiente da Vercel.

## Variáveis de ambiente na Vercel

No projeto que serve `https://locapp-ruby.vercel.app`, abre **Settings → Environment Variables** e configura:

- `APPWRITE_ENDPOINT` = `https://fra.cloud.appwrite.io/v1`
- `APPWRITE_PROJECT_ID` = ID real do projeto Appwrite (não o nome do projeto)
- `APPWRITE_API_KEY` = chave de servidor do Appwrite, com permissões mínimas de leitura para as coleções necessárias
- `APPWRITE_DATABASE_ID` = ID real da base de dados
- `APPWRITE_PRODUCTS_COLLECTION_ID` = ID real da coleção de produtos
- `APPWRITE_VENDORS_COLLECTION_ID` = ID real da coleção de perfis comerciais
- `FRONTEND_ORIGINS` = origem HTTPS exata do frontend, por exemplo `https://monarca-code.github.io` ou o domínio de produção real. Se existirem vários domínios, separa-os por vírgulas.

Depois de alterar variáveis, faz novo deploy da Vercel. Não coloques `APPWRITE_API_KEY` em `js/config.js), HTML ou GitHub.

## Campos esperados

### Coleção de produtos

- `name` (string)
- `description` (string, opcional)
- `category` (string, opcional)
- `brand` (string, opcional)
- `price` (number, opcional)
- `currency` (string, opcional; por defeito Kz)
- `status` (string; o catálogo público exige exatamente `published`)
- `vendor_id` (string com o ID do documento do perfil comercial)
- `image_url` (URL string, opcional) ou `image_urls` (array de URLs)
- `updated_at` (string, opcional)

### Coleção de perfis comerciais

- `business_name` (string)
- `business_type` (string, opcional)
- `phone` e `whatsapp` (string, opcionais)
- `address`, `municipality`, `province` (strings)
- `latitude` e `longitude` (number, opcionais)
- `verification_status` (string, opcional)

A localização é guardada no perfil comercial e reutilizada por todos os produtos desse vendedor. O endpoint não aceita publicações nem alterações: a escrita precisa de autenticação e verificação de propriedade no servidor.

## Teste

Depois do deploy e das variáveis estarem configuradas, abre:

`https://locapp-ruby.vercel.app/api/catalog`

A chamada direta num navegador pode devolver **403** se o domínio não estiver na lista `FRONTEND_ORIGINS`; esse comportamento é intencional. Testa pela página Produtos e preços do frontend autorizado.

Se surgir erro de configuração, confirma os IDs reais das coleções, o atributo `status`, o atributo `vendor_id` e as permissões da chave de servidor. Nunca partilhes a chave privada num chat.
