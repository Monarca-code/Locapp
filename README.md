# Locapp — multipágina com mapa e teste de preços

## Testar
1. Extrair o ZIP e abrir a pasta `locapp` no VS Code.
2. Iniciar Live Server a partir de `index.html`.
3. Na página inicial, escrever o nome do produto na barra e enviar para a página Pesquisa IA.
4. Abrir **Publicar produtos**, adicionar o mesmo produto com preços/localidades diferentes e voltar a pesquisar.

## Incluído
- Página inicial com mapa de fundo e pesquisa encaminhada para a pesquisa IA.
- Botão para pedir a localização do dispositivo (só após clique/consentimento).
- Página para publicar produtos farmacêuticos de demonstração.
- Comparação local ordenada por preço, com nome da farmácia e localidade.
- Página de farmácias com mapa.

## Limitações
Os produtos de teste ficam guardados apenas no `localStorage` do navegador. Não são dados reais, não ficam visíveis noutros dispositivos e a comparação local não é uma IA nem pesquisa na Internet. A pesquisa Web com IA só funciona depois de configurar uma função backend HTTPS em `js/config.js` (`aiSearchEndpoint`).

Nunca colocar chaves secretas de IA no frontend. Antes de produção, ligar Appwrite, implementar autenticação e permissões e validar os registos das farmácias. O mapa necessita de Internet; a localização necessita de autorização do utilizador e HTTPS/localhost.
