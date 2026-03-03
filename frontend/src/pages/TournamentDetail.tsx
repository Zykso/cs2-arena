import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, Users, Clock, Plus, X, Edit2,
  Trash2, Save,
} from 'lucide-react';
import { tournaments, matches as matchApi, teams as teamsApi, servers as serversApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import BracketView from '../components/BracketView';

const STATUS_BADGE: Record<string, string> = {
  upcoming:     'bg-slate-500/10 text-slate-400',
  registration: 'bg-blue-500/10 text-blue-400',
  ongoing:      'bg-green-500/10 text-green-400',
  completed:    'bg-orange-500/10 text-orange-400',
};


export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  // UI state — all hooks before any early returns
  const [showRegister, setShowRegister]   = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [resultModal, setResultModal]     = useState<any>(null);
  const [editMatchModal, setEditMatchModal] = useState<any>(null);

  // Edit tournament form
  const [editForm, setEditForm] = useState<any>({});

  // Result form
  const [resultForm, setResultForm] = useState({ score1: '', score2: '' });

  // Queries
  const { data: t, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournaments.get(id!),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  });

  const { data: serverList = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: serversApi.list,
    enabled: isAdmin,
  });

  // Mutations
  const generateBracket = useMutation({
    mutationFn: () => tournaments.generateBracket(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const updateTournament = useMutation({
    mutationFn: (data: any) => tournaments.update(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); setShowEdit(false); },
  });

  const deleteTournament = useMutation({
    mutationFn: () => tournaments.delete(id!),
    onSuccess: () => { window.location.href = '/tournaments'; },
  });

  const registerTeam = useMutation({
    mutationFn: (teamId: string) => tournaments.register(id!, teamId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); setShowRegister(false); },
  });

  const unregisterTeam = useMutation({
    mutationFn: (teamId: string) => tournaments.unregister(id!, teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const startMatch = useMutation({
    mutationFn: (matchId: string) => matchApi.start(matchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const cancelMatch = useMutation({
    mutationFn: (matchId: string) => matchApi.cancel(matchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const resetMatch = useMutation({
    mutationFn: (matchId: string) => matchApi.reset(matchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const deleteMatch = useMutation({
    mutationFn: (matchId: string) => matchApi.delete(matchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const setResult = useMutation({
    mutationFn: ({ matchId, winnerId, score1, score2 }: any) =>
      matchApi.setResult(matchId, { winnerId, score1: +score1, score2: +score2, status: 'completed' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); setResultModal(null); },
  });

  const updateMatch = useMutation({
    mutationFn: ({ matchId, data }: any) => matchApi.update(matchId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); setEditMatchModal(null); },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>;
  if (!t) return <div className="text-center py-20 text-slate-500">Tournament not found</div>;

  const hasBracket = t.matches.length > 0;

  const openEdit = () => {
    setEditForm({
      name: t.name,
      description: t.description || '',
      format: t.format,
      status: t.status,
      maxTeams: t.maxTeams,
      startDate: t.startDate ? t.startDate.slice(0, 10) : '',
      endDate: t.endDate ? t.endDate.slice(0, 10) : '',
    });
    setShowEdit(true);
  };

  const openResult = (match: any) => {
    setResultForm({ score1: String(match.score1 ?? ''), score2: String(match.score2 ?? '') });
    setResultModal(match);
  };

  const submitResult = () => {
    if (!resultModal) return;
    const s1 = +resultForm.score1;
    const s2 = +resultForm.score2;
    const winnerId = s1 > s2 ? resultModal.team1Id : s2 > s1 ? resultModal.team2Id : null;
    setResult.mutate({ matchId: resultModal.id, score1: s1, score2: s2, winnerId });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Edit Tournament Modal ── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-5">Edit Tournament</h2>
            <div className="space-y-3">
              <input placeholder="Name" value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              <textarea placeholder="Description" value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Format</label>
                  <select value={editForm.format} onChange={e => setEditForm((f: any) => ({ ...f, format: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500">
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500">
                    <option value="upcoming">Upcoming</option>
                    <option value="registration">Registration</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={e => setEditForm((f: any) => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                  <input type="date" value={editForm.endDate} onChange={e => setEditForm((f: any) => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Max Teams</label>
                <input type="number" value={editForm.maxTeams} onChange={e => setEditForm((f: any) => ({ ...f, maxTeams: +e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEdit(false)}
                className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => updateTournament.mutate(editForm)} disabled={updateTournament.isPending}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Result Modal ── */}
      {resultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-1">Set Match Result</h2>
            <p className="text-slate-500 text-sm mb-5">
              {resultModal.team1?.name ?? 'TBD'} vs {resultModal.team2?.name ?? 'TBD'}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{resultModal.team1?.name ?? 'Team 1'}</label>
                <input type="number" min="0" max="30" value={resultForm.score1}
                  onChange={e => setResultForm(f => ({ ...f, score1: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{resultModal.team2?.name ?? 'Team 2'}</label>
                <input type="number" min="0" max="30" value={resultForm.score2}
                  onChange={e => setResultForm(f => ({ ...f, score2: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            {resultForm.score1 !== '' && resultForm.score2 !== '' && resultForm.score1 !== resultForm.score2 && (
              <p className="text-sm text-center text-green-400 mb-4">
                Winner: <strong>{+resultForm.score1 > +resultForm.score2 ? resultModal.team1?.name : resultModal.team2?.name}</strong>
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setResultModal(null)}
                className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={submitResult}
                disabled={setResult.isPending || resultForm.score1 === '' || resultForm.score2 === ''}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Match Modal ── */}
      {editMatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-1">Edit Match</h2>
            <p className="text-slate-500 text-sm mb-5">
              {editMatchModal.team1?.name ?? 'TBD'} vs {editMatchModal.team2?.name ?? 'TBD'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Map</label>
                <input value={editMatchModal.map ?? ''} onChange={e => setEditMatchModal((m: any) => ({ ...m, map: e.target.value }))}
                  placeholder="e.g. de_mirage"
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Assign Server</label>
                <select value={editMatchModal.serverId ?? ''}
                  onChange={e => setEditMatchModal((m: any) => ({ ...m, serverId: e.target.value || null }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">No server</option>
                  {serverList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.host}:{s.gamePort})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Scheduled Time</label>
                <input type="datetime-local"
                  value={editMatchModal.scheduledAt ? editMatchModal.scheduledAt.slice(0, 16) : ''}
                  onChange={e => setEditMatchModal((m: any) => ({ ...m, scheduledAt: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditMatchModal(null)}
                className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button
                onClick={() => updateMatch.mutate({ matchId: editMatchModal.id, data: { map: editMatchModal.map, serverId: editMatchModal.serverId, scheduledAt: editMatchModal.scheduledAt } })}
                disabled={updateMatch.isPending}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Register Team Modal ── */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Register a Team</h2>
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
              {(isAdmin ? allTeams : allTeams.filter((team: any) => team.players.some((p: any) => p.user?.id === user?.id)))
                .map((team: any) => {
                  const alreadyIn = t.teams.some((tt: any) => tt.teamId === team.id);
                  return (
                    <button key={team.id} disabled={alreadyIn}
                      onClick={() => registerTeam.mutate(team.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
                        ${alreadyIn ? 'border-[#2a2d3e] opacity-40 cursor-not-allowed' : 'border-[#2a2d3e] hover:border-orange-500/50 hover:bg-orange-500/5'}`}>
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">
                        {team.tag}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{team.name}</p>
                        <p className="text-xs text-slate-500">{team.players.length} players{alreadyIn ? ' · Already registered' : ''}</p>
                      </div>
                    </button>
                  );
                })}
              {allTeams.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No teams available.</p>}
            </div>
            <button onClick={() => setShowRegister(false)}
              className="w-full px-4 py-2 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 flex-wrap">
              <Trophy className="text-orange-500 shrink-0" />
              <span className="truncate">{t.name}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[t.status] || STATUS_BADGE.upcoming}`}>
                {t.status}
              </span>
            </h1>
            {t.description && <p className="text-slate-400 text-sm">{t.description}</p>}
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Users size={14} /> {t.teams.length}/{t.maxTeams} teams</span>
              <span className="capitalize">{t.format.replace(/_/g, ' ')}</span>
              {t.startDate && <span className="flex items-center gap-1"><Clock size={14} /> {new Date(t.startDate).toLocaleDateString()}</span>}
              {t.endDate && <span>– {new Date(t.endDate).toLocaleDateString()}</span>}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button onClick={openEdit}
                className="flex items-center gap-2 px-3 py-2 bg-[#1a1d27] border border-[#2a2d3e] hover:border-slate-500 text-slate-300 rounded-lg text-sm transition-colors">
                <Edit2 size={14} /> Edit
              </button>
              <button onClick={() => { if (confirm(`Delete "${t.name}"? This cannot be undone.`)) deleteTournament.mutate(); }}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Teams sidebar ── */}
        <div className="space-y-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2 text-sm"><Users size={15} className="text-orange-500" /> Teams</h2>
              <span className="text-xs text-slate-500">{t.teams.length}/{t.maxTeams}</span>
            </div>
            {t.teams.length === 0 ? (
              <p className="text-slate-500 text-sm px-4 py-6 text-center">No teams registered.</p>
            ) : (
              <div className="divide-y divide-[#2a2d3e]">
                {t.teams.map((tt: any) => (
                  <div key={tt.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                      {tt.team.tag.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tt.team.name}</p>
                      <p className="text-xs text-slate-500">{tt.wins}W {tt.losses}L</p>
                    </div>
                    {isAdmin && !hasBracket && (
                      <button onClick={() => unregisterTeam.mutate(tt.teamId)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0" title="Remove">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {user && !hasBracket && t.status !== 'completed' && (
              <div className="p-3 border-t border-[#2a2d3e]">
                <button onClick={() => setShowRegister(true)}
                  className="w-full px-3 py-2 border border-dashed border-[#2a2d3e] hover:border-orange-500/50 text-slate-400 hover:text-orange-400 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                  <Plus size={14} /> Add Team
                </button>
              </div>
            )}
          </div>

          {isAdmin && !hasBracket && t.teams.length >= 2 && (
            <button onClick={() => generateBracket.mutate()} disabled={generateBracket.isPending}
              className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Trophy size={14} /> {generateBracket.isPending ? 'Generating…' : 'Generate Bracket'}
            </button>
          )}

          {/* Stats summary */}
          {hasBracket && (
            <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Progress</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total matches</span>
                  <span className="font-medium">{t.matches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed</span>
                  <span className="font-medium text-green-400">{t.matches.filter((m: any) => m.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Live</span>
                  <span className="font-medium text-orange-400">{t.matches.filter((m: any) => m.status === 'live').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled</span>
                  <span className="font-medium text-slate-300">{t.matches.filter((m: any) => m.status === 'scheduled').length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bracket ── */}
        <div className="lg:col-span-3">
          {!hasBracket ? (
            <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-16 text-center text-slate-500">
              <Trophy size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-lg">Bracket not generated yet</p>
              {t.teams.length < 2
                ? <p className="text-sm mt-1">Add at least 2 teams first</p>
                : isAdmin && <p className="text-sm mt-1">Use the "Generate Bracket" button to start</p>}
            </div>
          ) : (
            <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
              {isAdmin && (
                <p className="text-xs text-slate-500 mb-4">
                  Hover over a match to reveal controls.
                </p>
              )}
              <BracketView
                tournament={t}
                isAdmin={isAdmin}
                serverList={serverList}
                onStart={(matchId) => startMatch.mutate(matchId)}
                onResult={(match) => openResult(match)}
                onEdit={(match) => setEditMatchModal({ ...match })}
                onCancel={(matchId) => { if (confirm('Cancel this match?')) cancelMatch.mutate(matchId); }}
                onReset={(matchId) => { if (confirm('Reset this match to scheduled?')) resetMatch.mutate(matchId); }}
                onDelete={(matchId) => { if (confirm('Delete this match?')) deleteMatch.mutate(matchId); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

