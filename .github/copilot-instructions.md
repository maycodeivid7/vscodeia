# Instruções do Projeto — Sistema de Reserva de Salas

## 1. Contexto do Projeto

O projeto consiste no desenvolvimento de um **Sistema de Reserva de Salas e Espaços Acadêmicos**, destinado a professores e alunos, atendendo aos requisitos definidos pela Renata.

O sistema deverá permitir o cadastro e a consulta de salas, o gerenciamento de reservas, a verificação de disponibilidade e o controle da situação das solicitações.

A implementação deverá evoluir a partir do código existente, respeitando a arquitetura planejada e preservando a identidade visual do protótipo atual.

### 1.1. Estado Atual do Projeto

O projeto está organizado em `frontend/` (React e Vite) e `backend/` (Node.js, Express e MongoDB). O frontend integrado oferece painel para salas e reservas. A API já valida conflitos e capacidade em transações.

A autenticação por e-mail e senha, sessões em cookie `HttpOnly`, criação de contas por administradores e autorização de papéis `admin` e `solicitante` estão implementadas no backend e no frontend. A primeira conta administrativa é criada pelo comando `npm run create-admin`.

A autenticação com Google e as notificações ainda não estão implementadas. Não as apresente como funcionais.

Ao implementar novas funcionalidades, diferencie claramente o código existente, as funcionalidades efetivamente implementadas e os componentes ainda planejados.

Não apresente funcionalidades simuladas ou planejadas como se estivessem concluídas.

---

## 2. Arquitetura e Tecnologias

A arquitetura planejada utiliza as seguintes tecnologias:

### 2.1. Frontend

**Tecnologia:** React.js.

Responsabilidades:
- Apresentar a interface do sistema;
- Permitir a navegação entre as funcionalidades;
- Exibir salas, disponibilidade e reservas;
- Coletar e validar os dados de entrada;
- Comunicar-se com o backend por meio de APIs REST;
- Apresentar mensagens de sucesso, erro e confirmação;
- Garantir acessibilidade e adaptação a diferentes tamanhos de tela.

As regras de negócio devem permanecer no backend. O frontend poderá realizar validações preliminares para melhorar a experiência do usuário, mas não deverá ser a única camada responsável por garantir a integridade das reservas.

### 2.2. Backend

**Tecnologias:** Node.js e Express.js.

Adote o padrão arquitetural MVC, com separação clara entre as responsabilidades:

- **Models:** representam as entidades e a estrutura dos dados;
- **Views:** correspondem à camada de apresentação, implementada separadamente no React;
- **Controllers:** recebem as requisições HTTP, coordenam as operações e retornam as respostas;
- **Services:** concentram as regras de negócio e os processos da aplicação;
- **Repositories ou camada de acesso a dados:** centralizam as operações de persistência, quando essa abstração for necessária;
- **Routes:** definem os endpoints e direcionam as requisições aos controllers;
- **Middlewares:** implementam funcionalidades transversais, como autenticação, autorização e tratamento de erros.

Mantenha os controllers enxutos. Não concentre regras de negócio complexas, consultas ao banco e tratamento de requisições na mesma função.

### 2.3. Banco de Dados

**Tecnologia:** MongoDB.

O banco de dados deverá armazenar as informações relacionadas a:

- Usuários;
- Salas e espaços acadêmicos;
- Reservas;
- Dados necessários para notificações, caso esse recurso seja implementado.

Defina estruturas de dados coerentes com os requisitos do sistema.

Implemente as validações necessárias para preservar a integridade dos dados. Considere que verificações de disponibilidade devem ser seguras também diante de requisições simultâneas.

### 2.4. Serviços e Comunicação

Organize as funcionalidades em serviços com responsabilidades bem definidas, especialmente:

- Usuários e autenticação;
- Gerenciamento de salas;
- Gerenciamento de reservas;
- Verificação de disponibilidade;
- Notificações.

A comunicação entre o frontend e o backend deverá ocorrer por APIs REST.

Não crie microsserviços independentes ou camadas adicionais sem uma necessidade concreta. Inicialmente, prefira uma aplicação organizada em módulos, com separação de responsabilidades.

---

## 3. Requisitos Funcionais

### 3.1. Cadastro e Consulta de Salas

O sistema deverá permitir cadastrar e consultar salas.

Cada sala deverá possuir os seguintes atributos:

- **Nome:** identificação da sala;
- **Andar:** localização dentro da instituição;
- **Capacidade:** número máximo de pessoas permitidas;
- **Recursos:** equipamentos e recursos disponíveis, como projetor, quadro, computadores e acesso à internet.

O sistema deverá apresentar essas informações de maneira clara e permitir consultar os espaços disponíveis para reserva.

### 3.2. Cadastro e Gerenciamento de Reservas

Cada reserva deverá conter:

- **Sala:** espaço solicitado;
- **Data:** dia da reserva;
- **Horário de início:** momento previsto para o início da utilização;
- **Horário de término:** momento previsto para o encerramento;
- **Responsável:** pessoa responsável pela reserva;
- **Finalidade:** motivo da utilização da sala;
- **Quantidade de participantes:** número de pessoas que utilizarão o espaço;
- **Situação:** estado atual da reserva.

As situações permitidas são:

- `pendente`;
- `aprovada`;
- `cancelada`.

O sistema deverá permitir consultar as reservas e acompanhar suas respectivas situações.

A quantidade de participantes é necessária para validar a capacidade da sala e deverá ser registrada na reserva ou obtida de uma fonte confiável.

### 3.3. Consulta de Disponibilidade

O sistema deverá permitir verificar a disponibilidade de uma sala para determinada data e intervalo de horários.

A disponibilidade deverá considerar as reservas existentes e suas situações.

Reservas canceladas não deverão bloquear a sala.

Reservas pendentes e aprovadas deverão ser consideradas conforme a política de disponibilidade definida para o sistema. Na ausência de uma regra diferente, considere ambas como ocupações que impedem uma nova reserva conflitante.

### 3.4. Autenticação e Notificações

A autenticação local por e-mail e senha está implementada. Não há cadastro público: o primeiro administrador é inicializado pelo comando local; depois, administradores criam contas. Senhas são armazenadas com scrypt; sessões revogáveis são persistidas no MongoDB e entregues em cookies `HttpOnly`.

Todos os endpoints de salas e reservas exigem sessão. Solicitantes podem consultar salas, criar reservas pendentes e alterar/cancelar somente as próprias; administradores gerenciam salas e todas as reservas, inclusive aprovações. As permissões devem ser verificadas no backend, mesmo quando também forem refletidas pela interface.

A autenticação com Google não deverá ser apresentada como funcional enquanto não existir uma integração real com o provedor.

As notificações deverão informar os usuários sobre alterações relevantes nas reservas, quando esse recurso for desenvolvido.

---

## 4. Regras de Negócio

Todas as regras de negócio devem ser centralizadas no backend e aplicadas independentemente da interface utilizada para enviar a requisição.

### 4.1. Conflitos de Horário

Não podem existir duas reservas conflitantes para a mesma sala.

Dois intervalos se sobrepõem quando:

`inicioA < fimB && inicioB < fimA`

Considere os intervalos como semiabertos: o horário de início está incluído e o horário de término não está incluído.

Assim, uma reserva das 10h às 11h pode ser seguida por outra das 11h às 12h, sem conflito.

A verificação deverá considerar a data, a sala e as situações das reservas existentes.

### 4.2. Capacidade da Sala

A quantidade de participantes não poderá ultrapassar a capacidade máxima da sala.

A validação deverá comparar:

`quantidadeParticipantes <= capacidadeSala`

Uma reserva deverá ser rejeitada quando a quantidade de participantes exceder a capacidade do espaço selecionado.

### 4.3. Situação das Reservas

Cada reserva deverá possuir uma das seguintes situações:

- `pendente`: solicitação aguardando decisão;
- `aprovada`: reserva confirmada;
- `cancelada`: reserva cancelada.

O sistema deverá impedir valores diferentes dos estados permitidos.

Reservas canceladas não deverão impedir novas reservas para o mesmo período.

### 4.4. Validação dos Horários

O horário de término deverá ser posterior ao horário de início.

A data e os horários informados deverão ser válidos.

Não permita a criação de reservas com intervalos inválidos.

### 4.5. Integridade e Concorrência

A disponibilidade deverá ser verificada no backend antes de confirmar a criação ou a alteração de uma reserva.

Não confie exclusivamente nas verificações realizadas no navegador.

Considere que dois usuários podem tentar reservar a mesma sala simultaneamente. A solução deverá utilizar mecanismos de persistência e controle de concorrência adequados para evitar conflitos, e não apenas uma consulta seguida de uma gravação desprotegida.

---

## 5. Padrão Visual

A interface deverá preservar a identidade visual existente no arquivo `index.html`.

### 5.1. Identidade Visual

Mantenha:
- Painel de apresentação com gradiente violeta;
- Painel de login com fundo branco;
- Violeta como cor de destaque;
- Hierarquia tipográfica clara;
- Espaçamento consistente;
- Aparência limpa e adequada a um sistema acadêmico.

Reutilize as variáveis CSS existentes:

- `--muted`;
- `--line`;
- `--accent`;
- `--accent-dark`.

Antes de introduzir novas cores, componentes ou padrões visuais, verifique se os estilos existentes podem ser reutilizados.

### 5.2. Responsividade

Preserve o layout dividido em telas largas.

Em telas pequenas:
- O painel de apresentação deverá ser ocultado, conforme o comportamento existente;
- A marca móvel deverá permanecer visível;
- Os formulários e controles deverão se adaptar à largura disponível;
- Não deverá ocorrer rolagem horizontal desnecessária.

Novas telas deverão seguir os mesmos princípios visuais e de responsividade.

### 5.3. Acessibilidade

Garanta:
- Contraste adequado;
- Estados de foco visíveis;
- Navegação por teclado;
- Hierarquia de títulos consistente;
- Rótulos associados aos campos;
- Mensagens de erro compreensíveis;
- Suporte à preferência `prefers-reduced-motion`.

Não remova recursos de acessibilidade para simplificar a implementação.

---

## 6. Comportamento dos Formulários

Nos formulários de autenticação e conta, preserve:

- Campos semânticos;
- Validação nativa do HTML;
- Atributos de autocomplete adequados;
- Alternância de visibilidade da senha;
- Mensagens de estado anunciadas por meio de `role="status"`.

Os controles deverão funcionar por teclado e apresentar indicações visuais claras de foco.

Na aplicação React, mantenha os mesmos requisitos de acessibilidade.

Não apresente autenticação ou acesso com Google como funcionais sem implementar e testar as integrações correspondentes.

---

## 7. Dados de Exemplo

Crie dados fictícios para demonstrar e testar as funcionalidades do sistema.

### 7.1. Salas

Cadastre, no mínimo, três salas com características diferentes.

Cada sala deverá conter:

- Nome;
- Andar;
- Capacidade máxima;
- Recursos disponíveis.

### 7.2. Reservas

Cadastre, no mínimo, cinco reservas distribuídas entre as salas.

Cada reserva deverá conter:

- Sala;
- Data;
- Horário de início;
- Horário de término;
- Responsável;
- Finalidade;
- Situação;
- Quantidade de participantes.

### 7.3. Coerência dos Dados

Os dados de exemplo deverão ser consistentes com as regras de negócio.

Garanta que:
- As salas possuam características distintas;
- Os horários de início e término sejam válidos;
- A quantidade de participantes respeite a capacidade da sala;
- As situações utilizem apenas os valores permitidos;
- As reservas ativas não apresentem conflitos de horário para a mesma sala.

Se forem necessários dados com horários conflitantes para testar as validações, utilize cenários de teste específicos. Não introduza conflitos involuntários no conjunto de dados inicial.

Prefira scripts de inicialização ou seed que possam ser executados novamente de maneira controlada, sem duplicar registros desnecessariamente.

Não misture dados fictícios de demonstração com dados reais de produção.

---

## 8. Organização e Qualidade do Código

Siga estas diretrizes durante o desenvolvimento:

- Respeite a estrutura existente no repositório;
- Mantenha os componentes React focados em responsabilidades específicas;
- Mantenha os controllers Express enxutos;
- Centralize as regras de negócio nos serviços apropriados;
- Separe a persistência das regras de negócio quando isso melhorar a organização;
- Evite duplicar lógica de domínio no frontend;
- Evite duplicar código entre componentes, controllers e serviços;
- Utilize nomes claros e consistentes para arquivos, funções, variáveis e entidades;
- Trate erros de maneira consistente;
- Valide os dados recebidos pelas APIs;
- Não exponha senhas, credenciais, tokens ou informações sensíveis;
- Não adicione dependências sem necessidade;
- Não altere funcionalidades existentes sem avaliar os impactos.

Antes de criar uma nova abstração, verifique se a estrutura atual já oferece uma solução adequada.

Não introduza tecnologias diferentes das definidas na arquitetura sem uma justificativa técnica.

---

## 9. Estratégia de Implementação

Implemente as funcionalidades de maneira incremental.

Antes de desenvolver uma nova funcionalidade:

1. Examine os arquivos existentes e identifique o que já está implementado.
2. Verifique se a funcionalidade já existe total ou parcialmente.
3. Identifique as camadas afetadas pela alteração.
4. Defina as regras de negócio e as validações necessárias.
5. Implemente a solução respeitando a arquitetura planejada.
6. Execute os testes pertinentes.
7. Verifique se a alteração preserva os comportamentos existentes.

Não reescreva arquivos inteiros quando uma alteração localizada for suficiente.

Não substitua implementações existentes por exemplos simplificados sem necessidade.

Quando uma funcionalidade depender de componentes ainda inexistentes, implemente as dependências necessárias ou deixe explícito o que ainda precisa ser desenvolvido.

---

## 10. Testes e Critérios de Aceitação

As funcionalidades implementadas deverão ser testadas conforme suas responsabilidades.

### 10.1. Salas

Verifique:
- Cadastro de salas;
- Consulta de salas;
- Exibição de capacidade, andar e recursos;
- Validação dos dados obrigatórios.

### 10.2. Reservas

Verifique:
- Criação de reservas;
- Consulta de reservas;
- Alteração e cancelamento, quando implementados;
- Validação da data e dos horários;
- Validação da quantidade de participantes;
- Controle das situações permitidas.

### 10.3. Disponibilidade

Verifique:
- Duas reservas em horários diferentes para a mesma sala;
- Duas reservas com horários sobrepostos para a mesma sala;
- Reservas consecutivas, em que uma termina no momento em que a outra começa;
- Reservas para salas diferentes no mesmo horário;
- Novas reservas em períodos liberados por cancelamentos;
- Tentativas simultâneas de reserva do mesmo período.

### 10.4. Interface

Valide as alterações visuais em larguras desktop e móvel.

Teste:
- Navegação por teclado;
- Estados de foco;
- Campos e botões;
- Mensagens de erro e sucesso;
- Comportamento responsivo;
- Compatibilidade com `prefers-reduced-motion`, quando houver animações.

Não declare que os testes passaram sem executá-los.

Se algum teste não puder ser executado, informe a limitação.

---

## 11. Diretrizes para o GitHub Copilot

Ao gerar ou modificar código, siga estas prioridades:

1. **Preservar o funcionamento existente:** não quebre o protótipo nem remova comportamentos sem necessidade.
2. **Respeitar a arquitetura:** utilize as tecnologias e a separação de responsabilidades definidas neste documento.
3. **Garantir as regras de negócio:** conflitos de horário e limites de capacidade devem ser validados no backend.
4. **Priorizar segurança e integridade:** valide entradas, proteja operações e trate erros adequadamente.
5. **Manter acessibilidade e identidade visual:** preserve os padrões existentes e aplique-os às novas telas.
6. **Implementar de forma incremental:** faça alterações pequenas, coerentes e testáveis.
7. **Ser transparente sobre o estado do projeto:** diferencie implementações reais, simulações e funcionalidades planejadas.
8. **Evitar complexidade desnecessária:** prefira soluções simples que atendam aos requisitos atuais e permitam evolução futura.

Quando houver ambiguidade nos requisitos, prefira uma solução consistente com as regras documentadas e evite introduzir comportamentos inesperados.

Não invente requisitos funcionais, integrações ou estruturas já existentes.

---

## 12. Resumo dos Requisitos Obrigatórios

O Sistema de Reserva de Salas deverá evoluir para oferecer:

- Cadastro e consulta de salas;
- Registro do nome, andar, capacidade e recursos das salas;
- Cadastro e gerenciamento de reservas;
- Registro da sala, data, horários, responsável, finalidade, situação e quantidade de participantes;
- Situações de reserva limitadas a `pendente`, `aprovada` e `cancelada`;
- Prevenção de conflitos de horário para a mesma sala;
- Validação da capacidade máxima;
- Validação de datas e horários;
- Consulta de disponibilidade;
- Persistência dos dados no MongoDB;
- Comunicação entre React e backend por APIs REST;
- Backend Node.js com Express.js organizado em camadas;
- Interface responsiva e acessível;
- Pelo menos três salas e cinco reservas fictícias para testes;
- Testes das regras de negócio e dos comportamentos implementados.

**Princípio fundamental:** implemente o sistema de forma incremental, mantendo a consistência entre os requisitos, as regras de negócio, a arquitetura e o código efetivamente existente no repositório.