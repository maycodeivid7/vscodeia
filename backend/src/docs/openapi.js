module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Nexo — API de reservas de salas',
    version: '1.0.0',
    description: [
      'Documentação da API REST implementada pelo backend do Nexo.',
      '',
      'Salas, reservas e notificações exigem a sessão autenticada. O login cria o cookie `nexo_session` (HttpOnly); use o mesmo navegador para testar operações protegidas no Swagger UI.',
      '',
      'Solicitantes consultam salas e gerenciam apenas as próprias reservas. Administradores gerenciam salas, usuários e reservas. Reservas pendentes e aprovadas bloqueiam horários; o intervalo é semiaberto, portanto reservas consecutivas são permitidas.',
      '',
      'O WebSocket autenticado de notificações está disponível em `ws://localhost:3000/api/notifications/stream` (ou `wss://` sob HTTPS). Ele envia `{"type":"ready"}` ao conectar, `{"type":"notification","notification":...}` para novas notificações, `{"type":"notification-read","notificationId":"...","lidaEm":"..."}` ao marcar uma como lida e `{"type":"notifications-read-all","lidaEm":"..."}` ao marcar todas como lidas. O handshake usa o cookie `nexo_session`; a conexão fecha com código 4401 quando a sessão expira ou é revogada. Este WebSocket não é uma operação REST testável nesta interface.',
    ].join('\n'),
  },
  servers: [{ url: '/api', description: 'API no mesmo host' }],
  tags: [
    { name: 'Saúde' },
    { name: 'Autenticação' },
    { name: 'Usuários' },
    { name: 'Notificações' },
    { name: 'Salas' },
    { name: 'Reservas' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Saúde'],
        summary: 'Verifica a API e a conexão com o banco',
        responses: {
          200: {
            description: 'API e MongoDB disponíveis.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
          503: {
            description: 'MongoDB indisponível.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Autentica e cria uma sessão',
        description: 'Após 10 tentativas em 15 minutos, novos logins ficam limitados temporariamente.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: {
            description: 'Login realizado; define o cookie HttpOnly `nexo_session`.',
            headers: {
              'Set-Cookie': {
                schema: { type: 'string' },
                description: 'Cookie de sessão com expiração de 8 horas.',
              },
            },
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { description: 'E-mail ou senha incorretos.' },
          429: { description: 'Limite de tentativas excedido.' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Autenticação'],
        summary: 'Encerra a sessão atual, se houver',
        description: 'A rota aceita chamadas sem sessão ativa.',
        responses: {
          204: { description: 'Sessão revogada e cookie removido.' },
        },
      },
    },
    '/auth/session': {
      get: {
        tags: ['Autenticação'],
        summary: 'Consulta a sessão atual',
        description: 'Não exige autenticação; `user` será `null` quando não houver sessão válida.',
        responses: {
          200: {
            description: 'Estado da sessão.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionResponse' } } },
          },
        },
      },
    },
    '/auth/password': {
      patch: {
        tags: ['Autenticação'],
        summary: 'Altera a própria senha',
        description: 'Revoga todas as sessões da conta, inclusive a atual.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordInput' } } },
        },
        responses: {
          204: { description: 'Senha alterada e sessões revogadas.' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/users': {
      get: {
        tags: ['Usuários'],
        summary: 'Lista usuários',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Contas cadastradas.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/UserWithStatus' } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Usuários'],
        summary: 'Cria uma conta',
        description: 'Somente administradores. Não existe cadastro público.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserInput' } } },
        },
        responses: {
          201: {
            description: 'Conta criada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notificações'],
        summary: 'Lista notificações e total não lido',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Notificações da conta autenticada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationList' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notificações'],
        summary: 'Marca todas as notificações próprias como lidas',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Quantidade atualizada e instante da leitura.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReadAllResult' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notificações'],
        summary: 'Marca uma notificação própria como lida',
        security: [{ SessionCookie: [] }],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: {
            description: 'Notificação atualizada ou já lida.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/salas': {
      get: {
        tags: ['Salas'],
        summary: 'Lista salas',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Salas ordenadas pelo nome.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Room' } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Salas'],
        summary: 'Cadastra uma sala',
        description: 'Somente administradores.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RoomInput' } } },
        },
        responses: {
          201: {
            description: 'Sala cadastrada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/salas/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Salas'],
        summary: 'Consulta uma sala',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Sala encontrada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Salas'],
        summary: 'Atualiza uma sala',
        description: 'Somente administradores. Envie ao menos um campo; não é possível reduzir a capacidade abaixo de uma reserva existente.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RoomUpdateInput' } } },
        },
        responses: {
          200: {
            description: 'Sala atualizada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
      delete: {
        tags: ['Salas'],
        summary: 'Remove uma sala sem reservas associadas',
        description: 'Somente administradores.',
        security: [{ SessionCookie: [] }],
        responses: {
          204: { description: 'Sala removida.' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/salas/{id}/disponibilidade': {
      get: {
        tags: ['Salas'],
        summary: 'Consulta a disponibilidade de uma sala',
        security: [{ SessionCookie: [] }],
        parameters: [
          { $ref: '#/components/parameters/Id' },
          {
            name: 'data',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
            example: '2026-12-01',
          },
          {
            name: 'inicio',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$', example: '10:00' },
          },
          {
            name: 'fim',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$', example: '11:00' },
          },
        ],
        responses: {
          200: {
            description: 'Disponibilidade e horários conflitantes. Solicitantes recebem detalhes limitados dos conflitos.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Availability' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reservas': {
      get: {
        tags: ['Reservas'],
        summary: 'Lista reservas',
        description: 'Solicitantes recebem somente as próprias reservas; administradores recebem todas.',
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: 'salaId',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'data',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'situacao',
            in: 'query',
            schema: { $ref: '#/components/schemas/ReservationStatus' },
          },
        ],
        responses: {
          200: {
            description: 'Reservas ordenadas por data e horário inicial.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Reservation' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Reservas'],
        summary: 'Cria uma reserva',
        description: 'Solicitantes criam reservas pendentes e o responsável é preenchido com o nome da conta. Administradores podem informar responsável e situação.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReservationInput' } } },
        },
        responses: {
          201: {
            description: 'Reserva criada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/reservas/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Reservas'],
        summary: 'Consulta uma reserva',
        description: 'Solicitantes só podem consultar as próprias reservas.',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Reserva encontrada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Reservas'],
        summary: 'Atualiza uma reserva',
        description: 'Envie ao menos um campo. Solicitantes só podem alterar as próprias reservas, sem alterar responsável ou situação; administradores podem gerenciar todas.',
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReservationUpdateInput' } } },
        },
        responses: {
          200: {
            description: 'Reserva atualizada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
      delete: {
        tags: ['Reservas'],
        summary: 'Cancela uma reserva sem apagar o histórico',
        description: 'Solicitantes só podem cancelar as próprias reservas.',
        security: [{ SessionCookie: [] }],
        responses: {
          200: {
            description: 'Reserva cancelada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      SessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'nexo_session',
        description: 'Cookie HttpOnly criado por `POST /auth/login`.',
      },
    },
    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    },
    responses: {
      BadRequest: {
        description: 'Dados inválidos.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Sessão ausente, inválida ou expirada.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Papel ou permissões insuficientes.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Registro não encontrado.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Conflict: {
        description: 'Conflito de agenda ou operação incompatível com os registros existentes.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['erro'],
        properties: { erro: { type: 'string', example: 'Já existe uma reserva ativa nesse horário para a sala.' } },
      },
      Health: {
        type: 'object',
        required: ['status', 'database'],
        properties: {
          status: { type: 'string', enum: ['ok', 'indisponivel'] },
          database: { type: 'string', enum: ['conectado', 'desconectado'] },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'senha'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', example: 'docente@universidade.edu.br' },
          senha: { type: 'string', format: 'password', example: 'senha-segura-com-12' },
        },
      },
      SessionResponse: {
        type: 'object',
        required: ['user'],
        properties: {
          user: {
            anyOf: [{ $ref: '#/components/schemas/User' }, { type: 'object', nullable: true, example: null }],
          },
        },
      },
      PasswordInput: {
        type: 'object',
        required: ['senhaAtual', 'novaSenha'],
        additionalProperties: false,
        properties: {
          senhaAtual: { type: 'string', format: 'password' },
          novaSenha: { type: 'string', format: 'password', minLength: 12, maxLength: 128 },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['nome', 'email', 'senha', 'papel'],
        additionalProperties: false,
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: 80 },
          email: { type: 'string', format: 'email', maxLength: 254 },
          senha: { type: 'string', format: 'password', minLength: 12, maxLength: 128 },
          papel: { type: 'string', enum: ['admin', 'solicitante'] },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'nome', 'email', 'papel'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          papel: { type: 'string', enum: ['admin', 'solicitante'] },
        },
      },
      UserWithStatus: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          {
            type: 'object',
            required: ['ativo', 'criadoEm'],
            properties: {
              ativo: { type: 'boolean' },
              criadoEm: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Notification: {
        type: 'object',
        required: ['_id', 'reservaId', 'evento', 'mensagem', 'lidaEm', 'createdAt'],
        properties: {
          _id: { type: 'string', format: 'uuid' },
          reservaId: { type: 'string', format: 'uuid' },
          evento: { type: 'string', enum: ['created', 'approved', 'rejected', 'edited', 'cancelled'] },
          mensagem: { type: 'string' },
          lidaEm: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationList: {
        type: 'object',
        required: ['notifications', 'unreadCount'],
        properties: {
          notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
          unreadCount: { type: 'integer', minimum: 0 },
        },
      },
      ReadAllResult: {
        type: 'object',
        required: ['atualizadas', 'lidaEm'],
        properties: {
          atualizadas: { type: 'integer', minimum: 0 },
          lidaEm: { type: 'string', format: 'date-time' },
        },
      },
      RoomInput: {
        type: 'object',
        required: ['nome', 'andar', 'capacidade', 'recursos'],
        additionalProperties: false,
        properties: {
          nome: { type: 'string', minLength: 1 },
          andar: { type: 'integer' },
          capacidade: { type: 'integer', minimum: 1 },
          recursos: { type: 'array', items: { type: 'string', minLength: 1 } },
        },
      },
      RoomUpdateInput: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        description: 'Envie somente os campos que deseja alterar.',
        properties: {
          nome: { type: 'string', minLength: 1 },
          andar: { type: 'integer' },
          capacidade: { type: 'integer', minimum: 1 },
          recursos: { type: 'array', items: { type: 'string', minLength: 1 } },
        },
      },
      Room: {
        allOf: [
          { $ref: '#/components/schemas/RoomInput' },
          {
            type: 'object',
            required: ['_id', 'createdAt', 'updatedAt'],
            properties: {
              _id: { type: 'string', format: 'uuid' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      ReservationStatus: {
        type: 'string',
        enum: ['pendente', 'aprovada', 'recusada', 'cancelada'],
      },
      ReservationInput: {
        type: 'object',
        required: ['salaId', 'data', 'inicio', 'fim', 'responsavel', 'finalidade', 'quantidadeParticipantes'],
        additionalProperties: false,
        properties: {
          salaId: { type: 'string', format: 'uuid' },
          data: { type: 'string', format: 'date', example: '2026-12-01' },
          inicio: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$', example: '10:00' },
          fim: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$', example: '11:00' },
          responsavel: { type: 'string', minLength: 1 },
          finalidade: { type: 'string', minLength: 1 },
          situacao: { $ref: '#/components/schemas/ReservationStatus', description: 'Opcional; padrão `pendente`. Solicitantes só podem criar como pendente.' },
          quantidadeParticipantes: { type: 'integer', minimum: 1 },
        },
      },
      ReservationUpdateInput: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          salaId: { type: 'string', format: 'uuid' },
          data: { type: 'string', format: 'date' },
          inicio: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
          fim: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
          responsavel: { type: 'string', minLength: 1, description: 'Alterável somente por administradores.' },
          finalidade: { type: 'string', minLength: 1 },
          situacao: { allOf: [{ $ref: '#/components/schemas/ReservationStatus' }], description: 'Alterável somente por administradores.' },
          quantidadeParticipantes: { type: 'integer', minimum: 1 },
        },
      },
      Reservation: {
        allOf: [
          { $ref: '#/components/schemas/ReservationInput' },
          {
            type: 'object',
            required: ['_id', 'usuarioId', 'createdAt', 'updatedAt'],
            properties: {
              _id: { type: 'string', format: 'uuid' },
              usuarioId: { type: 'string', format: 'uuid' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Availability: {
        type: 'object',
        required: ['salaId', 'data', 'inicio', 'fim', 'disponivel', 'conflitos'],
        properties: {
          salaId: { type: 'string', format: 'uuid' },
          data: { type: 'string', format: 'date' },
          inicio: { type: 'string' },
          fim: { type: 'string' },
          disponivel: { type: 'boolean' },
          conflitos: {
            type: 'array',
            items: {
              oneOf: [
                { $ref: '#/components/schemas/Reservation' },
                {
                  type: 'object',
                  required: ['_id', 'inicio', 'fim'],
                  properties: {
                    _id: { type: 'string', format: 'uuid' },
                    inicio: { type: 'string' },
                    fim: { type: 'string' },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};
