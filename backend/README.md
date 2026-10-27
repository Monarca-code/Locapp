# Backend do Locapp — plano de implementação

O backend ainda não está implementado. Criar uma função HTTPS (por exemplo, Appwrite Functions) para receber pesquisas IA e consultar fontes públicas permitidas.

## Requisitos obrigatórios
- Guardar a chave do fornecedor de IA em variável de ambiente do servidor.
- Validar e limitar o tamanho da pergunta.
- Aplicar limites de pedidos e proteção contra abuso.
- Usar apenas fontes públicas permitidas e respeitar robots.txt/termos dos sites.
- Devolver um resumo e uma lista de fontes com URL, título e data de consulta quando disponível.
- Não inferir que um preço ou stock encontrado na Web é atual sem confirmação da farmácia.
- Não aceitar HTML arbitrário do cliente para renderizar como confiável.
- Não devolver segredos, prompts internos ou dados privados.
- Para o catálogo, validar a identidade da farmácia e autorizar alterações apenas aos registos dessa farmácia.

## Modelo inicial de dados sugerido
- `pharmacies`: nome, endereço, latitude, longitude, telefone público, horário, verificada.
- `products`: nome, descrição, categoria, unidade/apresentação.
- `offers`: pharmacy_id, product_id, price_aoa, availability_status, updated_at, updated_by.
- `price_alerts`: user_id, product_id, target_price_aoa, active.

Os preços devem ser números positivos em Kz e incluir data de atualização. Aplicar permissões no backend/Appwrite, não apenas esconder botões na interface.
