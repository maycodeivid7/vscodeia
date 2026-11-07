async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/session') {
      window.dispatchEvent(new Event('nexo:unauthorized'));
    }
    throw new Error(result?.erro || `Não foi possível concluir a solicitação (${response.status}).`);
  }
  return result;
}

function send(method, body) {
  return { method, body: JSON.stringify(body) };
}

export const api = {
  session: () => request('/auth/session'),
  login: (credentials) => request('/auth/login', send('POST', credentials)),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (data) => request('/auth/password', send('PATCH', data)),
  listUsers: () => request('/auth/users'),
  createUser: (data) => request('/auth/users', send('POST', data)),
  notifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  health: () => request('/health'),
  listRooms: () => request('/salas'),
  createRoom: (data) => request('/salas', send('POST', data)),
  updateRoom: (id, data) => request(`/salas/${encodeURIComponent(id)}`, send('PATCH', data)),
  deleteRoom: (id) => request(`/salas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listReservations: (filters = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    );
    const search = query.toString();
    return request(`/reservas${search ? `?${search}` : ''}`);
  },
  createReservation: (data) => request('/reservas', send('POST', data)),
  updateReservation: (id, data) => request(`/reservas/${encodeURIComponent(id)}`, send('PATCH', data)),
  cancelReservation: (id) => request(`/reservas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  availability: (id, query) => request(`/salas/${encodeURIComponent(id)}/disponibilidade?${new URLSearchParams(query)}`),
};
