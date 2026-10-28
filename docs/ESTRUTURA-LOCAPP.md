# Organização técnica da Locapp

## Princípio

A organização atual deve ser incremental. A Locapp é um site multipágina com referências relativas a ficheiros e endpoints da Vercel; mover pastas indiscriminadamente pode quebrar CSS, JavaScript, páginas e APIs. Por isso, a primeira fase organiza a documentação e separa o estilo da página inicial sem mover os ficheiros ativos.

## Pastas e responsabilidades

| Caminho | Responsabilidade | Regra de manutenção |
| --- | --- | --- |
| `index.html` | Entrada e página inicial | Preservar os IDs usados por `js/main.js` |
| `pages/` | Páginas HTML secundárias | Rever caminhos relativos ao alterar links |
| `css/styles.css` | Estilos base partilhados | Evitar regras específicas da home quando possível |
| `css/responsive.css` | Responsividade comum | Testar larguras de telemóvel, tablet e desktop |
| `css/home.css` | Camada visual da página inicial | Não depender dela nas páginas secundárias |
| `css/pages.css` | Estilos auxiliares e componentes das páginas | Confirmar uso antes de dividir ou renomear |
| `css/pesquisa-ia.css` | Estilos da pesquisa IA | Não alterar em tarefas apenas visuais da home |
| `js/main.js` | Menu móvel, Leaflet, GPS e encaminhamento da pesquisa inicial | Manter os IDs `home-search`, `home-query`, `show-map`, `map-screen`, `close-map`, `fullscreen-map` e `map-locate-me` |
| `js/config.js` | Configuração pública do frontend | Nunca guardar segredos |
| `js/pesquisa-ia.js` e `api/search.js` | Interface e backend da pesquisa IA | Não refatorar durante uma alteração puramente visual |
| `api/` | Endpoints da Vercel | Não mover sem confirmar o roteamento e a configuração de deploy |
| `docs/` | Guias e decisões técnicas | Atualizar quando a arquitetura mudar |
| `BACKUP/` | Cópia histórica do site | Não copiar ficheiros por cima da versão ativa sem comparação |

## Alterações visuais aplicadas à página inicial

- A página inicial tem agora a classe `home-page` e carrega `css/home.css) depois dos estilos gerais.
- A camada nova melhora hierarquia tipográfica, pesquisa principal, cartões de categorias, painéis e rodapé.
- A folha nova usa seletores prefixados por `.home-page` para limitar o impacto às páginas internas.
- O formulário continua a usar `home-search` e `home-query`; o JavaScript existente continua a encaminhar a consulta para `pages/pesquisa-ia.html?q=...`.
- Os IDs e os elementos necessários ao mapa Leaflet, ao menu móvel e à localização foram mantidos.
- O link de navegação que não tinha texto foi identificado como “Publicar produtos”, apontando para a página que já existia.

## Checklist após cada publicação

1. Abrir a página inicial em desktop e telemóvel.
2. Confirmar que o menu móvel abre e fecha.
3. Submeter uma pesquisa a partir da home e verificar se a pergunta chega à página Pesquisa IA.
4. Abrir e fechar o mapa; testar Escape.
5. Testar GPS apenas depois de permitir a localização.
6. Abrir Farmácias, Publicar produtos, Pesquisa IA, Entrar e Sobre.
7. Confirmar no separador Network que `css/home.css` responde com HTTP 200.
8. Testar a pesquisa IA separadamente para garantir que uma mudança visual não afetou o backend.

## Fora do âmbito desta fase

Não foram alterados os contratos das APIs, a configuração do Appwrite, a autenticação, a lógica do Gemini nem os esquemas da base de dados. A reorganização física de pastas fica para uma fase própria, com atualização coordenada de referências e testes.
