# Reservas de salas — Nexo

Aplicação de gerenciamento de salas e reservas acadêmicas. O frontend usa React e Vite; a API REST usa Node.js, Express e MongoDB.

## Requisitos

- Node.js 20 ou superior;
- MongoDB configurado como **replica set**. As operações de criação e alteração de reservas usam transações para evitar conflitos simultâneos.

O código está dividido em `frontend/` (React/Vite) e `backend/` (Express/MongoDB). Instale as dependências na raiz:

```sh
npm install
```

## Ambiente local

O MongoDB local usa Docker Compose, replica set `rs0` e um volume persistente. A porta fica disponível somente na máquina local. Inicie o banco:

```sh
docker compose up -d mongo
docker compose ps
```

O arquivo `backend/.env.example` contém a URI local padrão. Copie-o para `backend/.env` antes de iniciar a API e ajuste os valores conforme necessário. Esse arquivo local não deve ser commitado.

Para desenvolvimento, rode a API em um terminal e o frontend em outro:

```sh
npm start
npm run dev
```

O frontend fica disponível em `http://localhost:5173` e encaminha chamadas `/api` para `http://localhost:3000`. O frontend informa quando a API ou o banco não estão disponíveis. Para popular o banco local com os dados de exemplo, execute `npm run seed`.

Para parar o banco mantendo os dados, execute `docker compose down`. Evite `docker compose down -v`, pois isso também apaga o volume local e os dados.

Para gerar e servir a versão de produção:

```sh
npm run build
npm start
```

O Express serve os arquivos compilados de `frontend/dist`. Para carregar os dados fictícios iniciais, execute `npm run seed`; o seed é idempotente e não sobrescreve registros existentes.

O painel permite cadastrar, editar e remover salas; criar, editar, filtrar, aprovar e cancelar reservas; e consultar a disponibilidade antes de enviar uma solicitação. A API permanece responsável por validar capacidade e conflitos, inclusive em requisições simultâneas.

## Contas, autenticação e permissões

Não há cadastro público. Crie o primeiro administrador em um terminal interativo:

```sh
npm run create-admin
```

O comando solicita nome, e-mail e senha sem exibir a senha, exige no mínimo 12 caracteres e só funciona quando ainda não há contas. Entre no painel com essa conta; administradores podem criar contas de solicitante ou outros administradores na seção **Usuários**.

As sessões são armazenadas no MongoDB e usam um cookie `HttpOnly`, com expiração após 8 horas; sair ou alterar a senha revoga as sessões. Tentativas de login são limitadas. O backend exige sessão para acessar salas e reservas. Solicitantes podem consultar salas, criar reservas pendentes e alterar/cancelar somente as próprias; o nome do responsável vem da conta autenticada. Administradores gerenciam salas e todas as reservas, inclusive aprovações. Todos os usuários podem alterar a própria senha. As permissões são verificadas na API, não apenas na interface.

Em produção, defina `NODE_ENV=production` para habilitar o atributo `Secure` nos cookies e configure `CLIENT_ORIGIN` com a origem HTTPS exata do frontend. Use HTTPS para toda a aplicação.

## Endpoints

- `GET /api/health` — estado da API e conexão com o banco;
- `POST /api/auth/login` — autentica com `email` e `senha`, criando sessão;
- `POST /api/auth/logout` — revoga a sessão atual;
- `GET /api/auth/session` — retorna a conta autenticada ou `null`;
- `PATCH /api/auth/password` — altera a senha da conta autenticada e revoga suas sessões;
- `GET /api/auth/users` — lista contas (administrador);
- `POST /api/auth/users` — cria conta (administrador; `nome`, `email`, `senha`, `papel`);
- `GET /api/salas` — lista salas;
- `POST /api/salas` — cadastra sala (`nome`, `andar`, `capacidade`, `recursos`);
- `GET /api/salas/:id` — consulta sala;
- `PATCH /api/salas/:id` — atualiza campos da sala;
- `DELETE /api/salas/:id` — remove sala sem reservas associadas;
- `GET /api/salas/:id/disponibilidade?data=AAAA-MM-DD&inicio=HH:mm&fim=HH:mm` — consulta disponibilidade;
- `GET /api/reservas` — lista reservas; filtros opcionais: `salaId`, `data`, `situacao`;
- `POST /api/reservas` — cria reserva;
- `GET /api/reservas/:id` — consulta reserva;
- `PATCH /api/reservas/:id` — atualiza campos da reserva;
- `DELETE /api/reservas/:id` — cancela a reserva, sem apagar seu histórico.

Uma reserva exige `salaId`, `data`, `inicio`, `fim`, `responsavel`, `finalidade` e `quantidadeParticipantes`. `situacao` aceita `pendente`, `aprovada` ou `cancelada` e assume `pendente` quando omitida.

As reservas pendentes e aprovadas bloqueiam horários sobrepostos; canceladas não. O término é exclusivo: uma reserva pode começar exatamente quando outra termina. A capacidade da sala é validada em cada criação e alteração. Respostas de erro usam o formato `{ "erro": "mensagem" }`; conflitos de agenda retornam HTTP 409.

## Testes

```sh
npm test
```

Os testes automatizados do backend verificam validações e regras de intervalo. Para usar a API e o seed, é necessário ter MongoDB replica set acessível pela URI configurada.
