# Locapp

Plataforma para descobrir serviços locais e consultar informação disponível, com pesquisa assistida por IA e fontes verificáveis.

## Ambiente

- **Frontend:** HTML, CSS e JavaScript.
- **Código e histórico:** GitHub.
- **Alojamento e endpoints backend:** Vercel.
- **Autenticação e dados:** Appwrite.
- **Pesquisa IA:** Google Gemini através do endpoint backend `/api/search`.
- **Mapas:** Leaflet + OpenStreetMap.

Site: https://locapp-ruby.vercel.app  
Repositório: https://github.com/Monarca-code/Locapp

## Estrutura do repositório

```text
Locapp/
├── index.html              # Página inicial
├── css/
│   ├── styles.css          # Estilos partilhados e identidade base
│   ├── responsive.css      # Regras responsivas partilhadas
│   ├── pages.css           # Componentes usados noutras páginas/mapas
│   ├── home.css            # Melhorias visuais exclusivas da página inicial
│   └── pesquisa-ia.css     # Estilos da pesquisa IA
├── js/
│   ├── config.js           # Configuração pública do frontend (sem segredos)
│   ├── main.js             # Menu, mapas, GPS e encaminhamento da pesquisa inicial
│   ├── auth.js             # Autenticação
│   ├── pesquisa-ia.js      # Interface da pesquisa IA
│   ├── search.js           # Pesquisa e apresentação de resultados
│   ├── produtos.js         # Consulta de produtos
│   ├── publicar-produtos.js# Publicação de produtos
│   └── farmacias.js        # Funcionalidades de farmácias
├── pages/                  # Páginas HTML secundárias
├── api/                    # Endpoints backend executados pela Vercel
├── backend/                # Notas e documentação de backend
├── docs/                   # Documentação técnica e configuração
└── BACKUP/                 # Cópia histórica; não é a fonte ativa do site
```

Consulte [docs/ESTRUTURA-LOCAPP.md](docs/ESTRUTURA-LOCAPP.md) antes de mover ficheiros ou alterar caminhos.

## Trabalhar localmente

1. Clonar ou descarregar o repositório.
2. Abrir a pasta no VS Code.
3. Executar `index.html` com Live Server.
4. Para testar endpoints protegidos, confirmar que a origem local está permitida na configuração de ambiente da Vercel.
5. Depois de publicar alterações no ramo principal, confirmar o resultado no site e consultar os registos da Vercel se algum endpoint falhar.

## Regras para preservar o funcionamento

- Não mover nem renomear ficheiros usados por HTML, CSS, JavaScript ou pela configuração da Vercel sem atualizar todas as referências.
- Manter Gemini e credenciais privadas apenas no backend/variáveis de ambiente; nunca no frontend ou no Git.
- Não alterar `api/search.js`, `js/pesquisa-ia.js` ou `js/config.js` durante uma atualização visual, salvo se existir uma necessidade técnica comprovada.
- A pesquisa deve usar dados disponíveis e fontes identificáveis. Não apresentar estimativas como factos nem tratar dados de teste como dados reais.
- Os preços e a disponibilidade dependem da origem e da data de atualização dos registos.
- A localização GPS só deve ser solicitada após uma ação explícita do utilizador.

## Estado e limites dos dados

A presença de um produto, preço ou serviço depende dos registos disponíveis na base de dados. A ausência de resultados não prova que o produto ou serviço não exista. O mapa e a localização do dispositivo necessitam de ligação à Internet e, para GPS, de autorização do utilizador.
