import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const pageNames = {
  inicio: 'Visão geral',
  reservas: 'Reservas',
  salas: 'Salas',
  usuarios: 'Usuários',
  conta: 'Minha conta',
};

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`));
}

function roomName(rooms, id) {
  return rooms.find((room) => room._id === id)?.nome || 'Sala removida';
}

function ErrorMessage({ children, onClose }) {
  if (!children) return null;
  return (
    <div className="alert alert-error" role="alert">
      <span>{children}</span>
      {onClose && <button className="icon-button" type="button" aria-label="Fechar mensagem" onClick={onClose}>×</button>}
    </div>
  );
}

function RoomForm({ initial, onSave, onCancel, saving }) {
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(() => ({
    nome: initial?.nome || '',
    andar: initial?.andar ?? 0,
    capacidade: initial?.capacidade ?? '',
    recursos: initial?.recursos?.join(', ') || '',
  }));

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      await onSave({
        nome: form.nome.trim(),
        andar: Number(form.andar),
        capacidade: Number(form.capacidade),
        recursos: form.recursos.split(',').map((item) => item.trim()).filter(Boolean),
      });
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">Cadastro de sala</p><h3>{initial ? 'Editar sala' : 'Adicionar sala'}</h3></div>
        <button className="icon-button" type="button" aria-label="Fechar formulário" onClick={onCancel}>×</button>
      </div>
      <ErrorMessage>{formError}</ErrorMessage>
      <div className="form-grid">
        <label className="field field-wide">Nome da sala
          <input required maxLength="100" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Ex.: Laboratório 02" />
        </label>
        <label className="field">Andar
          <input required type="number" step="1" value={form.andar} onChange={(event) => setForm({ ...form, andar: event.target.value })} />
        </label>
        <label className="field">Capacidade
          <input required type="number" min="1" step="1" value={form.capacidade} onChange={(event) => setForm({ ...form, capacidade: event.target.value })} />
        </label>
        <label className="field field-wide">Recursos <span className="field-hint">Separe os recursos por vírgula.</span>
          <input value={form.recursos} onChange={(event) => setForm({ ...form, recursos: event.target.value })} placeholder="Projetor, quadro, computadores" />
        </label>
      </div>
      <div className="form-actions">
        <button className="button button-quiet" type="button" onClick={onCancel}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Salvar sala'}</button>
      </div>
    </form>
  );
}

function ReservationForm({ initial, rooms, user, onSave, onCancel, saving }) {
  const [formError, setFormError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState(() => ({
    salaId: initial?.salaId || rooms[0]?._id || '',
    data: initial?.data || today(),
    inicio: initial?.inicio || '09:00',
    fim: initial?.fim || '10:00',
    responsavel: initial?.responsavel || user.nome,
    finalidade: initial?.finalidade || '',
    quantidadeParticipantes: initial?.quantidadeParticipantes || '',
    situacao: initial?.situacao || 'pendente',
  }));
  const selectedRoom = rooms.find((room) => room._id === form.salaId);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setAvailability(null);
  }

  async function checkAvailability() {
    setFormError('');
    setAvailability(null);
    if (!form.salaId || !form.data || !form.inicio || !form.fim) {
      setFormError('Informe sala, data e horários para consultar a disponibilidade.');
      return;
    }
    setChecking(true);
    try {
      const result = await api.availability(form.salaId, { data: form.data, inicio: form.inicio, fim: form.fim });
      setAvailability(result);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setChecking(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    const payload = {
      ...form,
      quantidadeParticipantes: Number(form.quantidadeParticipantes),
    };
    if (user.papel !== 'admin') {
      delete payload.responsavel;
      delete payload.situacao;
    }
    try {
      await onSave(payload);
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">{initial ? 'Atualização' : 'Nova solicitação'}</p><h3>{initial ? 'Editar reserva' : 'Reservar uma sala'}</h3></div>
        <button className="icon-button" type="button" aria-label="Fechar formulário" onClick={onCancel}>×</button>
      </div>
      <ErrorMessage>{formError}</ErrorMessage>
      {rooms.length === 0 ? <p className="empty-note">Cadastre uma sala antes de criar uma reserva.</p> : (
        <>
          <div className="form-grid">
            <label className="field field-wide">Sala
              <select required value={form.salaId} onChange={(event) => change('salaId', event.target.value)}>
                {rooms.map((room) => <option key={room._id} value={room._id}>{room.nome} · até {room.capacidade} pessoas</option>)}
              </select>
            </label>
            <label className="field">Data
              <input required type="date" min={!initial ? today() : undefined} value={form.data} onChange={(event) => change('data', event.target.value)} />
            </label>
            <label className="field">Participantes
              <input required type="number" min="1" max={selectedRoom?.capacidade || undefined} step="1" value={form.quantidadeParticipantes} onChange={(event) => change('quantidadeParticipantes', event.target.value)} />
            </label>
            <label className="field">Início
              <input required type="time" value={form.inicio} onChange={(event) => change('inicio', event.target.value)} />
            </label>
            <label className="field">Término
              <input required type="time" value={form.fim} onChange={(event) => change('fim', event.target.value)} />
            </label>
            <label className="field">Responsável
              <input required maxLength="100" value={form.responsavel} readOnly={user.papel !== 'admin'} onChange={(event) => change('responsavel', event.target.value)} placeholder="Nome completo" />
            </label>
            {user.papel === 'admin' && <label className="field">Situação
              <select value={form.situacao} onChange={(event) => change('situacao', event.target.value)}>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>}
            <label className="field field-wide">Finalidade
              <input required maxLength="200" value={form.finalidade} onChange={(event) => change('finalidade', event.target.value)} placeholder="Ex.: Aula de laboratório" />
            </label>
          </div>
          <div className="availability-row">
            <button className="button button-outline" type="button" onClick={checkAvailability} disabled={checking}>{checking ? 'Consultando…' : 'Verificar disponibilidade'}</button>
            {availability && (
              <span className={availability.disponivel ? 'availability available' : 'availability unavailable'} role="status">
                {availability.disponivel ? 'Horário disponível' : `Horário ocupado${availability.conflitos?.length ? ` · ${availability.conflitos.length} conflito(s)` : ''}`}
              </span>
            )}
          </div>
          <p className="form-hint">A verificação não bloqueia o horário. A API valida novamente ao salvar.</p>
        </>
      )}
      <div className="form-actions">
        <button className="button button-quiet" type="button" onClick={onCancel}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={saving || rooms.length === 0}>{saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Enviar reserva'}</button>
      </div>
    </form>
  );
}

function ReservationCard({ reservation, rooms, user, onEdit, onCancel, onStatusChange, busy }) {
  const [confirming, setConfirming] = useState(false);
  const canManage = user.papel === 'admin' || reservation.usuarioId === user.id;
  return (
    <article className="reservation-card">
      <div className="reservation-time"><strong>{reservation.inicio}</strong><span>até {reservation.fim}</span></div>
      <div className="reservation-main">
        <div className="reservation-title"><h3>{reservation.finalidade}</h3><span className={`status status-${reservation.situacao}`}>{reservation.situacao}</span></div>
        <p className="reservation-room">{roomName(rooms, reservation.salaId)} <span aria-hidden="true">·</span> {reservation.responsavel}</p>
        <p className="reservation-meta">{formatDate(reservation.data)} <span aria-hidden="true">·</span> {reservation.quantidadeParticipantes} participantes</p>
      </div>
      <div className="reservation-actions">
        {user.papel === 'admin' && reservation.situacao !== 'cancelada' && (
          <select aria-label={`Situação da reserva ${reservation.finalidade}`} value={reservation.situacao} disabled={busy} onChange={(event) => onStatusChange(reservation, event.target.value)}>
            <option value="pendente">Pendente</option><option value="aprovada">Aprovada</option><option value="cancelada">Cancelada</option>
          </select>
        )}
        {canManage && reservation.situacao !== 'cancelada' && <button className="text-button" type="button" disabled={busy} onClick={() => onEdit(reservation)}>Editar</button>}
        {canManage && reservation.situacao !== 'cancelada' && (
          confirming ? (
            <span className="confirm-actions"><span>Cancelar reserva?</span><button className="text-button danger-text" type="button" disabled={busy} onClick={() => onCancel(reservation)}>Confirmar</button><button className="text-button" type="button" onClick={() => setConfirming(false)}>Voltar</button></span>
          ) : <button className="text-button danger-text" type="button" disabled={busy} onClick={() => setConfirming(true)}>Cancelar</button>
        )}
      </div>
    </article>
  );
}

function LoginPage({ onLogin, error, onClearError }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    onClearError();
    setSubmitting(true);
    try {
      await onLogin({ email, senha });
    } catch {
      // The parent displays the returned authentication error in the form.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-story">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark" aria-hidden="true">n</span><span>nexo</span>
        </a>
        <div className="auth-story-copy">
          <p className="eyebrow">ESPAÇO ACADÊMICO</p>
          <h1>Boas ideias merecem um lugar.</h1>
          <p>Entre para consultar espaços e organizar as reservas da sua instituição.</p>
        </div>
        <p className="auth-story-note">Acesso restrito a contas cadastradas pela instituição.</p>
      </aside>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-card">
          <a className="auth-mobile-brand brand" href="#" onClick={(event) => event.preventDefault()}>
            <span className="brand-mark" aria-hidden="true">n</span><span>nexo</span>
          </a>
          <p className="eyebrow">SUA INSTITUIÇÃO, EM UM SÓ LUGAR</p>
          <h2 id="login-title">Boas-vindas</h2>
          <p className="auth-intro">Entre na sua conta para continuar.</p>
          <ErrorMessage>{error}</ErrorMessage>
          <form onSubmit={submit}>
            <label className="field auth-field">E-mail
              <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field auth-field">Senha
              <input required type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} />
            </label>
            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Entrando…' : 'Entrar'}</button>
            <p className="auth-help" role="note">Não tem acesso? Peça a um administrador da instituição para criar sua conta.</p>
          </form>
        </div>
      </section>
    </main>
  );
}

function UserForm({ onSave, onCancel, saving }) {
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'solicitante' });
  const [confirmation, setConfirmation] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.senha !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }
    try {
      await onSave(form);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">ACESSO AO NEXO</p><h3>Criar conta</h3></div>
        <button className="icon-button" type="button" aria-label="Fechar formulário" onClick={onCancel}>×</button>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="form-grid">
        <label className="field">Nome completo
          <input required minLength="2" maxLength="80" autoComplete="name" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
        </label>
        <label className="field">E-mail institucional
          <input required type="email" maxLength="254" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="field">Senha inicial
          <input required type="password" minLength="12" maxLength="128" autoComplete="new-password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} />
          <span className="field-hint">Mínimo de 12 caracteres.</span>
        </label>
        <label className="field">Confirmar senha
          <input required type="password" minLength="12" maxLength="128" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </label>
        <label className="field">Papel
          <select value={form.papel} onChange={(event) => setForm({ ...form, papel: event.target.value })}>
            <option value="solicitante">Solicitante</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button className="button button-quiet" type="button" onClick={onCancel}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Criando…' : 'Criar conta'}</button>
      </div>
    </form>
  );
}

function PasswordForm({ onSave, saving }) {
  const [formError, setFormError] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmation, setConfirmation] = useState('');

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    if (novaSenha !== confirmation) {
      setFormError('As senhas novas não conferem.');
      return;
    }
    try {
      await onSave({ senhaAtual, novaSenha });
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <form className="form-card password-form" onSubmit={submit}>
      <div className="form-heading"><div><p className="eyebrow">SEGURANÇA</p><h3>Alterar senha</h3></div></div>
      <ErrorMessage>{formError}</ErrorMessage>
      <div className="form-grid">
        <label className="field field-wide">Senha atual
          <input required type="password" autoComplete="current-password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} />
        </label>
        <label className="field">Nova senha
          <input required type="password" minLength="12" maxLength="128" autoComplete="new-password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} />
          <span className="field-hint">Mínimo de 12 caracteres.</span>
        </label>
        <label className="field">Confirmar nova senha
          <input required type="password" minLength="12" maxLength="128" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </label>
      </div>
      <p className="form-hint">Depois da alteração, você precisará entrar novamente.</p>
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Alterando…' : 'Atualizar senha'}</button></div>
    </form>
  );
}

function Dashboard({ user, onLogout, onPasswordChanged }) {
  const isAdmin = user.papel === 'admin';
  const [page, setPage] = useState('inicio');
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [apiOnline, setApiOnline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roomForm, setRoomForm] = useState(null);
  const [reservationForm, setReservationForm] = useState(null);
  const [userForm, setUserForm] = useState(false);
  const [filters, setFilters] = useState({ situacao: '', data: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [health, roomList, reservationList] = await Promise.all([
        api.health(),
        api.listRooms(),
        api.listReservations(),
      ]);
      setApiOnline(health.status === 'ok');
      setRooms(roomList);
      setReservations(reservationList);
    } catch (loadError) {
      setApiOnline(false);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && page === 'usuarios') {
      loadUsers();
    }
  }, [isAdmin, loadUsers, page]);

  const visibleReservations = useMemo(() => reservations.filter((reservation) => (
    (!filters.situacao || reservation.situacao === filters.situacao)
    && (!filters.data || reservation.data === filters.data)
  )), [filters, reservations]);
  const pendingCount = reservations.filter((reservation) => reservation.situacao === 'pendente').length;
  const todayReservations = reservations.filter((reservation) => reservation.data === today() && reservation.situacao !== 'cancelada');

  async function runAction(action, successMessage) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      await loadData();
      setNotice(successMessage);
      return true;
    } catch (actionError) {
      setError(actionError.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveRoom(data) {
    const current = roomForm;
    const isEditing = Boolean(current?._id);
    const saved = await runAction(
      () => isEditing ? api.updateRoom(current._id, data) : api.createRoom(data),
      isEditing ? 'Sala atualizada.' : 'Sala cadastrada.',
    );
    if (!saved) throw new Error('Não foi possível salvar a sala. Confira a mensagem exibida.');
    setRoomForm(null);
  }

  async function saveReservation(data) {
    const current = reservationForm;
    const isEditing = Boolean(current?._id);
    const saved = await runAction(
      () => isEditing ? api.updateReservation(current._id, data) : api.createReservation(data),
      isEditing ? 'Reserva atualizada.' : 'Solicitação de reserva registrada.',
    );
    if (!saved) throw new Error('Não foi possível salvar a reserva. Confira a mensagem exibida.');
    setReservationForm(null);
  }

  function cancelReservation(reservation) {
    setBusyId(reservation._id);
    return runAction(
      () => api.cancelReservation(reservation._id),
      'Reserva cancelada; o horário foi liberado.',
    ).finally(() => setBusyId(''));
  }

  function updateStatus(reservation, situacao) {
    setBusyId(reservation._id);
    return runAction(
      () => api.updateReservation(reservation._id, { situacao }),
      `Situação atualizada para ${situacao}.`,
    ).finally(() => setBusyId(''));
  }

  async function deleteRoom(room) {
    if (!window.confirm(`Remover a sala "${room.nome}"? Salas com reservas não podem ser removidas.`)) return;
    await runAction(() => api.deleteRoom(room._id), 'Sala removida.');
  }

  async function saveUser(data) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await api.createUser(data);
      setUsers((current) => [...current, { ...created, ativo: true }].sort((a, b) => a.nome.localeCompare(b.nome)));
      setUserForm(false);
      setNotice(`Conta criada para ${created.email}.`);
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setError('');
    try {
      await onLogout();
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  async function updateOwnPassword(data) {
    await api.changePassword(data);
    onPasswordChanged();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('inicio'); }}>
          <span className="brand-mark" aria-hidden="true">n</span><span>nexo</span>
        </a>
        <p className="sidebar-caption">ESPAÇO ACADÊMICO</p>
        <nav className="main-nav" aria-label="Navegação principal">
          {[
            ['inicio', '⌂', 'Visão geral'],
            ['reservas', '▦', 'Reservas'],
            ['salas', '▤', 'Salas'],
            ...(isAdmin ? [['usuarios', '♙', 'Usuários']] : []),
            ['conta', '⚙', 'Minha conta'],
          ].map(([key, icon, label]) => (
            <button key={key} className={`nav-link ${page === key ? 'active' : ''}`} type="button" aria-current={page === key ? 'page' : undefined} onClick={() => { setPage(key); setError(''); setNotice(''); }}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>{label}
              {key === 'reservas' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={`connection ${apiOnline ? 'connected' : apiOnline === false ? 'disconnected' : ''}`}><span className="connection-dot" />{apiOnline ? 'API conectada' : apiOnline === false ? 'API indisponível' : 'Conectando…'}</div>
          <p className="account-summary">{user.nome}<br />{isAdmin ? 'Administrador' : 'Solicitante'}</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="breadcrumb">Nexo <span aria-hidden="true">/</span> {pageNames[page]}</span><h1>{pageNames[page]}</h1></div>
          <div className="topbar-actions">
            <span className="topbar-user">{user.nome}</span>
            <button className="button button-quiet refresh-button" type="button" onClick={loadData} disabled={loading} aria-label="Atualizar dados">↻ <span>Atualizar</span></button>
            <button className="button button-primary" type="button" onClick={() => { setReservationForm({}); setPage('reservas'); setError(''); }}><span aria-hidden="true">＋</span> Nova reserva</button>
            <button className="button button-quiet logout-button" type="button" onClick={logout}>Sair</button>
          </div>
        </header>

        <section className="content-area">
          <ErrorMessage>{error}</ErrorMessage>
          {notice && <div className="alert alert-success" role="status">{notice}<button className="icon-button" type="button" aria-label="Fechar mensagem" onClick={() => setNotice('')}>×</button></div>}
          {apiOnline === false && <div className="connection-banner"><strong>Não foi possível conectar à API.</strong> Inicie o backend e confirme a conexão com o MongoDB para carregar e salvar dados.</div>}
          {loading && <div className="loading-state" role="status">Carregando dados…</div>}

          {!loading && page === 'inicio' && (
            <>
              <div className="welcome-panel">
                <div><p className="eyebrow">ORGANIZE SEU ESPAÇO</p><h2>Um bom encontro começa<br className="desktop-break" /> com o lugar certo.</h2><p>Consulte salas e acompanhe as reservas da sua instituição.</p></div>
                <div className="welcome-art" aria-hidden="true"><span>✳</span><div className="art-card"><span>HOJE</span><strong>{String(todayReservations.length).padStart(2, '0')}</strong><small>reservas</small></div></div>
              </div>
              <div className="stats-grid">
                <article className="stat-card"><span className="stat-icon violet">▤</span><div><span className="stat-label">Salas cadastradas</span><strong>{rooms.length}</strong></div><span className="stat-foot">espaços disponíveis</span></article>
                <article className="stat-card"><span className="stat-icon teal">◷</span><div><span className="stat-label">Reservas hoje</span><strong>{todayReservations.length}</strong></div><span className="stat-foot">{formatDate(today())}</span></article>
                <article className="stat-card"><span className="stat-icon amber">◎</span><div><span className="stat-label">Aguardando decisão</span><strong>{pendingCount}</strong></div><button className="stat-link" type="button" onClick={() => { setPage('reservas'); setFilters({ situacao: 'pendente', data: '' }); }}>Ver solicitações <span aria-hidden="true">→</span></button></article>
              </div>
              <section className="section-block">
                <div className="section-heading"><div><p className="eyebrow">AGENDA</p><h2>Reservas de hoje</h2></div><button className="text-button" type="button" onClick={() => { setPage('reservas'); setFilters({ situacao: '', data: today() }); }}>Ver todas <span aria-hidden="true">→</span></button></div>
                {todayReservations.length ? <div className="reservation-list">{todayReservations.sort((a, b) => a.inicio.localeCompare(b.inicio)).map((item) => <ReservationCard key={item._id} reservation={item} rooms={rooms} user={user} busy={busyId === item._id} onEdit={(reservation) => { setReservationForm(reservation); setPage('reservas'); }} onCancel={cancelReservation} onStatusChange={updateStatus} />)}</div> : <div className="empty-state"><span className="empty-icon">◷</span><h3>Nenhuma reserva para hoje</h3><p>Quando houver reservas, elas aparecerão nesta agenda.</p><button className="button button-outline" type="button" onClick={() => { setReservationForm({}); setPage('reservas'); }}>Criar reserva</button></div>}
              </section>
            </>
          )}

          {!loading && page === 'salas' && (
            <section className="section-block page-section">
              <div className="section-heading"><div><p className="eyebrow">ESPAÇOS DA INSTITUIÇÃO</p><h2>Salas cadastradas <span className="heading-count">{rooms.length}</span></h2></div>{isAdmin && <button className="button button-primary" type="button" onClick={() => setRoomForm(roomForm ? null : {})}>＋ Adicionar sala</button>}</div>
              {roomForm && <RoomForm key={roomForm._id || 'new-room'} initial={roomForm._id ? roomForm : null} onSave={saveRoom} onCancel={() => setRoomForm(null)} saving={saving} />}
              {rooms.length ? <div className="room-grid">{rooms.map((room, index) => (
                <article className="room-card" key={room._id}>
                  <div className={`room-illustration room-illustration-${index % 3}`} aria-hidden="true"><span>▤</span><small>{String(room.andar).padStart(2, '0')}º ANDAR</small></div>
                  <div className="room-card-body"><div className="room-title-row"><h3>{room.nome}</h3><span className="capacity"><span aria-hidden="true">♧</span> {room.capacidade} lugares</span></div>
                    <p className="room-floor">{room.andar}º andar</p>
                    <div className="resource-list">{room.recursos?.length ? room.recursos.map((resource) => <span className="resource-tag" key={resource}>{resource}</span>) : <span className="resource-empty">Sem recursos cadastrados</span>}</div>
                    <div className="room-actions">{isAdmin && <><button className="text-button" type="button" onClick={() => setRoomForm(room)}>Editar sala</button><button className="text-button danger-text" type="button" onClick={() => deleteRoom(room)}>Remover</button></>}<button className="text-button room-reserve" type="button" onClick={() => { setReservationForm({ salaId: room._id }); setPage('reservas'); }}>Reservar <span aria-hidden="true">→</span></button></div>
                  </div>
                </article>
              ))}</div> : !roomForm && <div className="empty-state"><span className="empty-icon">▤</span><h3>{isAdmin ? 'Comece cadastrando uma sala' : 'Nenhuma sala cadastrada'}</h3><p>{isAdmin ? 'Adicione capacidade e recursos para que ela possa receber reservas.' : 'As salas cadastradas pela instituição aparecerão aqui.'}</p>{isAdmin && <button className="button button-primary" type="button" onClick={() => setRoomForm({})}>Adicionar primeira sala</button>}</div>}
            </section>
          )}

          {!loading && page === 'reservas' && (
            <section className="section-block page-section">
              <div className="section-heading"><div><p className="eyebrow">AGENDA DA INSTITUIÇÃO</p><h2>Todas as reservas <span className="heading-count">{visibleReservations.length}</span></h2></div><button className="button button-primary" type="button" onClick={() => setReservationForm({})}>＋ Nova reserva</button></div>
              {reservationForm !== null && <ReservationForm key={reservationForm._id || reservationForm.salaId || 'new-reservation'} initial={reservationForm._id ? reservationForm : null} rooms={rooms} user={user} onSave={saveReservation} onCancel={() => setReservationForm(null)} saving={saving} />}
              <div className="filter-bar">
                <label className="filter-field">Data <input type="date" value={filters.data} onChange={(event) => setFilters({ ...filters, data: event.target.value })} /></label>
                <label className="filter-field">Situação <select value={filters.situacao} onChange={(event) => setFilters({ ...filters, situacao: event.target.value })}><option value="">Todas</option><option value="pendente">Pendente</option><option value="aprovada">Aprovada</option><option value="cancelada">Cancelada</option></select></label>
                {(filters.data || filters.situacao) && <button className="text-button clear-filters" type="button" onClick={() => setFilters({ data: '', situacao: '' })}>Limpar filtros</button>}
              </div>
              {visibleReservations.length ? <div className="reservation-list">{visibleReservations.map((reservation) => <ReservationCard key={reservation._id} reservation={reservation} rooms={rooms} user={user} busy={busyId === reservation._id} onEdit={(item) => setReservationForm(item)} onCancel={cancelReservation} onStatusChange={updateStatus} />)}</div> : <div className="empty-state"><span className="empty-icon">◷</span><h3>Nenhuma reserva encontrada</h3><p>{reservations.length ? 'Tente ajustar os filtros selecionados.' : 'As novas solicitações aparecerão aqui.'}</p><button className="button button-primary" type="button" onClick={() => setReservationForm({})}>Criar primeira reserva</button></div>}
            </section>
          )}

          {!loading && page === 'usuarios' && isAdmin && (
            <section className="section-block page-section">
              <div className="section-heading"><div><p className="eyebrow">CONTAS DA INSTITUIÇÃO</p><h2>Usuários cadastrados <span className="heading-count">{users.length}</span></h2></div><button className="button button-primary" type="button" onClick={() => setUserForm((current) => !current)}>＋ Criar conta</button></div>
              {userForm && <UserForm onSave={saveUser} onCancel={() => setUserForm(false)} saving={saving} />}
              {users.length > 0 ? <div className="user-list">{users.map((account) => (
                <article className="user-card" key={account.id}>
                  <span className="user-avatar" aria-hidden="true">{account.nome.slice(0, 1).toUpperCase()}</span>
                  <div className="user-info"><h3>{account.nome}</h3><p>{account.email}</p></div>
                  <span className={`user-role ${account.papel}`}>{account.papel === 'admin' ? 'Administrador' : 'Solicitante'}</span>
                  <span className={`user-state ${account.ativo ? 'active' : ''}`}>{account.ativo ? 'Ativo' : 'Desativado'}</span>
                </article>
              ))}</div> : !userForm && <div className="empty-state"><span className="empty-icon">♙</span><h3>Nenhuma conta encontrada</h3><p>Crie contas para os solicitantes da instituição.</p></div>}
            </section>
          )}

          {!loading && page === 'conta' && (
            <section className="section-block page-section">
              <div className="section-heading"><div><p className="eyebrow">PERFIL E SEGURANÇA</p><h2>Minha conta</h2></div></div>
              <article className="account-card">
                <span className="user-avatar" aria-hidden="true">{user.nome.slice(0, 1).toUpperCase()}</span>
                <div className="user-info"><h3>{user.nome}</h3><p>{user.email}</p></div>
                <span className={`user-role ${user.papel}`}>{isAdmin ? 'Administrador' : 'Solicitante'}</span>
              </article>
              <PasswordForm onSave={updateOwnPassword} saving={saving} />
            </section>
          )}
        </section>
        <footer className="page-footer"><span>Nexo <span aria-hidden="true">·</span> Reservas de salas</span><span>Seus dados são armazenados pela API da instituição.</span></footer>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;
    const expireSession = () => {
      if (active) {
        setUser(null);
        setAuthError('Sua sessão expirou. Entre novamente.');
      }
    };
    window.addEventListener('nexo:unauthorized', expireSession);
    api.session()
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((error) => {
        if (active) setAuthError(error.message);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
      window.removeEventListener('nexo:unauthorized', expireSession);
    };
  }, []);

  async function login(credentials) {
    try {
      const result = await api.login(credentials);
      setUser(result.user);
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setAuthError('');
  }

  function passwordChanged() {
    setUser(null);
    setAuthError('Senha alterada. Entre novamente com a nova senha.');
  }

  if (checkingSession) {
    return <div className="auth-loading" role="status">Verificando sua sessão…</div>;
  }
  if (!user) {
    return <LoginPage onLogin={login} error={authError} onClearError={() => setAuthError('')} />;
  }
  return <Dashboard key={user.id} user={user} onLogout={logout} onPasswordChanged={passwordChanged} />;
}
