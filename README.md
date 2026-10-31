# API de reservas — Nexo

Backend REST em Node.js, Express e MongoDB para cadastro de salas, reservas e consulta de disponibilidade.

## Requisitos

- Node.js 20 ou superior;
- MongoDB configurado como **replica set**. As operações de criação e alteração de reservas usam transações para evitar conflitos simultâneos.

Configure o MongoDB e copie `.env.example` para `.env`, ajustando `MONGODB_URI` e, se necessário, `CLIENT_ORIGIN`. Instale as dependências e inicie a API:

```sh
npm install
npm run seed
npm start
```

O seed lê `data/dados-exemplo.json` e insere registros somente quando seus IDs ainda não existem; pode ser executado novamente sem sobrescrever dados existentes. A API fica disponível em `http://localhost:3000`.

## Endpoints

- `GET /api/health` — estado da API e conexão com o banco;
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

Os testes automatizados verificam validações e regras de intervalo. Para usar a API e o seed, é necessário ter MongoDB replica set acessível pela URI configurada.
