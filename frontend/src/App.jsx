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

function ReservationForm({ initial, rooms, onSave, onCancel, saving }) {
  const [formError, setFormError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState(() => ({
    salaId: initial?.salaId || rooms[0]?._id || '',
    data: initial?.data || today(),
    inicio: initial?.inicio || '09:00',
    fim: initial?.fim || '10:00',
    responsavel: initial?.responsavel || '',
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
    try {
      await onSave({
        ...form,
        quantidadeParticipantes: Number(form.quantidadeParticipantes),
      });
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
              <input required maxLength="100" value={form.responsavel} onChange={(event) => change('responsavel', event.target.value)} placeholder="Nome completo" />
            </label>
            <label className="field">Situação
              <select value={form.situacao} onChange={(event) => change('situacao', event.target.value)}>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
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

function ReservationCard({ reservation, rooms, onEdit, onCancel, onStatusChange, busy }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="reservation-card">
      <div className="reservation-time"><strong>{reservation.inicio}</strong><span>até {reservation.fim}</span></div>
      <div className="reservation-main">
        <div className="reservation-title"><h3>{reservation.finalidade}</h3><span className={`status status-${reservation.situacao}`}>{reservation.situacao}</span></div>
        <p className="reservation-room">{roomName(rooms, reservation.salaId)} <span aria-hidden="true">·</span> {reservation.responsavel}</p>
        <p className="reservation-meta">{formatDate(reservation.data)} <span aria-hidden="true">·</span> {reservation.quantidadeParticipantes} participantes</p>
      </div>
      <div className="reservation-actions">
        {reservation.situacao !== 'cancelada' && (
          <select aria-label={`Situação da reserva ${reservation.finalidade}`} value={reservation.situacao} disabled={busy} onChange={(event) => onStatusChange(reservation, event.target.value)}>
            <option value="pendente">Pendente</option><option value="aprovada">Aprovada</option><option value="cancelada">Cancelada</option>
          </select>
        )}
        {reservation.situacao !== 'cancelada' && <button className="text-button" type="button" disabled={busy} onClick={() => onEdit(reservation)}>Editar</button>}
        {reservation.situacao !== 'cancelada' && (
          confirming ? (
            <span className="confirm-actions"><span>Cancelar reserva?</span><button className="text-button danger-text" type="button" disabled={busy} onClick={() => onCancel(reservation)}>Confirmar</button><button className="text-button" type="button" onClick={() => setConfirming(false)}>Voltar</button></span>
          ) : <button className="text-button danger-text" type="button" disabled={busy} onClick={() => setConfirming(true)}>Cancelar</button>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [page, setPage] = useState('inicio');
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [apiOnline, setApiOnline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roomForm, setRoomForm] = useState(null);
  const [reservationForm, setReservationForm] = useState(null);
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
          ].map(([key, icon, label]) => (
            <button key={key} className={`nav-link ${page === key ? 'active' : ''}`} type="button" aria-current={page === key ? 'page' : undefined} onClick={() => { setPage(key); setError(''); setNotice(''); }}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>{label}
              {key === 'reservas' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={`connection ${apiOnline ? 'connected' : apiOnline === false ? 'disconnected' : ''}`}><span className="connection-dot" />{apiOnline ? 'API conectada' : apiOnline === false ? 'API indisponível' : 'Conectando…'}</div>
          <p>Gestão simples de espaços e encontros.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="breadcrumb">Nexo <span aria-hidden="true">/</span> {pageNames[page]}</span><h1>{pageNames[page]}</h1></div>
          <div className="topbar-actions">
            <button className="button button-quiet refresh-button" type="button" onClick={loadData} disabled={loading} aria-label="Atualizar dados">↻ <span>Atualizar</span></button>
            <button className="button button-primary" type="button" onClick={() => { setReservationForm({}); setPage('reservas'); setError(''); }}><span aria-hidden="true">＋</span> Nova reserva</button>
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
                {todayReservations.length ? <div className="reservation-list">{todayReservations.sort((a, b) => a.inicio.localeCompare(b.inicio)).map((item) => <ReservationCard key={item._id} reservation={item} rooms={rooms} busy={busyId === item._id} onEdit={(reservation) => { setReservationForm(reservation); setPage('reservas'); }} onCancel={cancelReservation} onStatusChange={updateStatus} />)}</div> : <div className="empty-state"><span className="empty-icon">◷</span><h3>Nenhuma reserva para hoje</h3><p>Quando houver reservas, elas aparecerão nesta agenda.</p><button className="button button-outline" type="button" onClick={() => { setReservationForm(null); setPage('reservas'); }}>Criar reserva</button></div>}
              </section>
            </>
          )}

          {!loading && page === 'salas' && (
            <section className="section-block page-section">
              <div className="section-heading"><div><p className="eyebrow">ESPAÇOS DA INSTITUIÇÃO</p><h2>Salas cadastradas <span className="heading-count">{rooms.length}</span></h2></div><button className="button button-primary" type="button" onClick={() => setRoomForm(roomForm ? null : {})}>＋ Adicionar sala</button></div>
              {roomForm && <RoomForm key={roomForm._id || 'new-room'} initial={roomForm._id ? roomForm : null} onSave={saveRoom} onCancel={() => setRoomForm(null)} saving={saving} />}
              {rooms.length ? <div className="room-grid">{rooms.map((room, index) => (
                <article className="room-card" key={room._id}>
                  <div className={`room-illustration room-illustration-${index % 3}`} aria-hidden="true"><span>▤</span><small>{String(room.andar).padStart(2, '0')}º ANDAR</small></div>
                  <div className="room-card-body"><div className="room-title-row"><h3>{room.nome}</h3><span className="capacity"><span aria-hidden="true">♧</span> {room.capacidade} lugares</span></div>
                    <p className="room-floor">{room.andar}º andar</p>
                    <div className="resource-list">{room.recursos?.length ? room.recursos.map((resource) => <span className="resource-tag" key={resource}>{resource}</span>) : <span className="resource-empty">Sem recursos cadastrados</span>}</div>
                    <div className="room-actions"><button className="text-button" type="button" onClick={() => setRoomForm(room)}>Editar sala</button><button className="text-button danger-text" type="button" onClick={() => deleteRoom(room)}>Remover</button><button className="text-button room-reserve" type="button" onClick={() => { setReservationForm({ salaId: room._id }); setPage('reservas'); }}>Reservar <span aria-hidden="true">→</span></button></div>
                  </div>
                </article>
              ))}</div> : !roomForm && <div className="empty-state"><span className="empty-icon">▤</span><h3>Comece cadastrando uma sala</h3><p>Adicione capacidade e recursos para que ela possa receber reservas.</p><button className="button button-primary" type="button" onClick={() => setRoomForm({})}>Adicionar primeira sala</button></div>}
            </section>
          )}

          {!loading && page === 'reservas' && (
            <section className="section-block page-section">
              <div className="section-heading"><div><p className="eyebrow">AGENDA DA INSTITUIÇÃO</p><h2>Todas as reservas <span className="heading-count">{visibleReservations.length}</span></h2></div><button className="button button-primary" type="button" onClick={() => setReservationForm({})}>＋ Nova reserva</button></div>
              {reservationForm !== null && <ReservationForm key={reservationForm._id || reservationForm.salaId || 'new-reservation'} initial={reservationForm._id ? reservationForm : null} rooms={rooms} onSave={saveReservation} onCancel={() => setReservationForm(null)} saving={saving} />}
              <div className="filter-bar">
                <label className="filter-field">Data <input type="date" value={filters.data} onChange={(event) => setFilters({ ...filters, data: event.target.value })} /></label>
                <label className="filter-field">Situação <select value={filters.situacao} onChange={(event) => setFilters({ ...filters, situacao: event.target.value })}><option value="">Todas</option><option value="pendente">Pendente</option><option value="aprovada">Aprovada</option><option value="cancelada">Cancelada</option></select></label>
                {(filters.data || filters.situacao) && <button className="text-button clear-filters" type="button" onClick={() => setFilters({ data: '', situacao: '' })}>Limpar filtros</button>}
              </div>
              {visibleReservations.length ? <div className="reservation-list">{visibleReservations.map((reservation) => <ReservationCard key={reservation._id} reservation={reservation} rooms={rooms} busy={busyId === reservation._id} onEdit={(item) => setReservationForm(item)} onCancel={cancelReservation} onStatusChange={updateStatus} />)}</div> : <div className="empty-state"><span className="empty-icon">◷</span><h3>Nenhuma reserva encontrada</h3><p>{reservations.length ? 'Tente ajustar os filtros selecionados.' : 'As novas solicitações aparecerão aqui.'}</p>{!reservations.length && <button className="button button-primary" type="button" onClick={() => setReservationForm({})}>Criar primeira reserva</button>}</div>}
            </section>
          )}
        </section>
        <footer className="page-footer"><span>Nexo <span aria-hidden="true">·</span> Reservas de salas</span><span>Seus dados são armazenados pela API da instituição.</span></footer>
      </main>
    </div>
  );
}
