import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const auth = {
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout'),
  loginUrl: '/api/auth/steam',
};

export const tournaments = {
  list: () => api.get('/tournaments').then(r => r.data),
  get: (id: string) => api.get(`/tournaments/${id}`).then(r => r.data),
  create: (data: any) => api.post('/tournaments', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/tournaments/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/tournaments/${id}`),
  register: (id: string, teamId: string) => api.post(`/tournaments/${id}/register`, { teamId }).then(r => r.data),
  unregister: (id: string, teamId: string) => api.delete(`/tournaments/${id}/register/${teamId}`),
  generateBracket: (id: string) => api.post(`/tournaments/${id}/generate-bracket`).then(r => r.data),
};

export const teams = {
  list: () => api.get('/teams').then(r => r.data),
  get: (id: string) => api.get(`/teams/${id}`).then(r => r.data),
  create: (data: any) => api.post('/teams', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/teams/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  addPlayer: (id: string, userId: string, role?: string) => api.post(`/teams/${id}/players`, { userId, role }),
  removePlayer: (id: string, userId: string) => api.delete(`/teams/${id}/players/${userId}`),
};

export const matches = {
  list: (params?: any) => api.get('/matches', { params }).then(r => r.data),
  get: (id: string) => api.get(`/matches/${id}`).then(r => r.data),
  update: (id: string, data: any) => api.put(`/matches/${id}`, data).then(r => r.data),
  setResult: (id: string, data: any) => api.put(`/matches/${id}/result`, data).then(r => r.data),
  start: (id: string) => api.put(`/matches/${id}/start`).then(r => r.data),
  submitStats: (id: string, stats: any[]) => api.post(`/matches/${id}/stats`, { stats }),
};

export const players = {
  leaderboard: () => api.get('/players/leaderboard').then(r => r.data),
  get: (steamId: string) => api.get(`/players/${steamId}`).then(r => r.data),
};

export const servers = {
  list: () => api.get('/servers').then(r => r.data),
  create: (data: any) => api.post('/servers', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/servers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/servers/${id}`),
  status: (id: string) => api.get(`/servers/${id}/status`).then(r => r.data),
  rcon: (id: string, command: string) => api.post(`/servers/${id}/rcon`, { command }).then(r => r.data),
  changeMap: (id: string, map: string) => api.post(`/servers/${id}/map`, { map }).then(r => r.data),
  startMatch: (id: string, data: any) => api.post(`/servers/${id}/start-match`, data).then(r => r.data),
};

export default api;
