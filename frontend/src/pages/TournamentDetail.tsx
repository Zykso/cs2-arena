import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Users, Play, CheckCircle, Clock, Plus, X } from 'lucide-react';
import { tournaments, matches as matchApi, teams as teamsApi } from '../api';
import { useAuth } from '../hooks/useAuth';

const statusColor: Record<string, string> = {
  scheduled: 'text-slate-400',
  live: 'text-green-400',
  completed: 'text-slate-500',
  bye: 'text-slate-600',
};

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  const { data: t, isLoading } = useQuery({ queryKey: ['tournament', id], queryFn: () => tournaments.get(id!) });

  const generateBracket = useMutation({
    mutationFn: () => tournaments.generateBracket(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const startMatch = useMutation({
    mutationFn: (matchId: string) => matchApi.start(matchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const { data: myTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
    enabled: !!user,
  });

  const registerTeam = useMutation({
    mutationFn: (teamId: string) => tournaments.register(id!, teamId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); setShowRegister(false); },
  });

  const unregisterTeam = useMutation({
    mutationFn: (teamId: string) => tournaments.unregister(id!, teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  const setResult = useMutation({
    mutationFn: ({ matchId, winnerId, score1, score2 }: any) =>
      matchApi.setResult(matchId, { winnerId, score1: +score1, score2: +score2, status: 'completed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id] }),
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>;
  if (!t) return <div className="text-center py-20 text-slate-500">Tournament not found</div>;

  const matchesByRound = t.matches.reduce((acc: any, m: any) => {
    const r = m.round || 1;
    acc[r] = acc[r] || [];
    acc[r].push(m);
    return acc;
  }, {});

  const hasBracket = t.matches.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Trophy className="text-orange-500" />
              {t.name}
            </h1>
            {t.description && <p className="text-slate-400">{t.description}</p>}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
            ${t.status === 'ongoing' ? 'bg-green-500/10 text-green-400' :
              t.status === 'completed' ? 'bg-slate-500/10 text-slate-400' :
              'bg-orange-500/10 text-orange-400'}`}>
            {t.status}
          </span>
        </div>
        <div className="flex gap-6 mt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Users size={14} /> {t.teams.length}/{t.maxTeams} teams</span>
          <span className="capitalize">{t.format.replace('_', ' ')}</span>
          {t.startDate && <span className="flex items-center gap-1"><Clock size={14} /> {new Date(t.startDate).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Teams sidebar */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4 h-fit">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Users size={16} className="text-orange-500" /> Registered Teams</h2>
          {t.teams.length === 0 ? (
            <p className="text-slate-500 text-sm">No teams registered yet.</p>
          ) : (
            <div className="space-y-2">
              {t.teams.map((tt: any) => {
                const isMyTeam = myTeams.some((m: any) => m.id === tt.teamId && m.players.some((p: any) => p.user?.id === user?.id));
                return (
                  <div key={tt.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0f1117]">
                    <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">
                      {tt.team.tag.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tt.team.name}</p>
                      <p className="text-xs text-slate-500">{tt.wins}W {tt.losses}L</p>
                    </div>
                    {(isAdmin || isMyTeam) && !hasBracket && (
                      <button onClick={() => unregisterTeam.mutate(tt.teamId)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors" title="Remove from tournament">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Register team button */}
          {user && !hasBracket && t.status !== 'completed' && (
            <button onClick={() => setShowRegister(true)}
              className="w-full mt-3 px-4 py-2 border border-dashed border-[#2a2d3e] hover:border-orange-500/50 text-slate-400 hover:text-orange-400 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
              <Plus size={15} /> Register a Team
            </button>
          )}

          {isAdmin && !hasBracket && t.teams.length >= 2 && (
            <button onClick={() => generateBracket.mutate()}
              className="w-full mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
              Generate Bracket
            </button>
          )}

          {/* Register modal */}
          {showRegister && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-lg font-bold mb-4">Register a Team</h2>
                <div className="space-y-2 mb-4">
                  {myTeams
                    .filter((team: any) => team.players.some((p: any) => p.user?.id === user?.id))
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
                  {myTeams.filter((team: any) => team.players.some((p: any) => p.user?.id === user?.id)).length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">You don't own or belong to any teams yet.</p>
                  )}
                </div>
                <button onClick={() => setShowRegister(false)}
                  className="w-full px-4 py-2 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bracket */}
        <div className="lg:col-span-3">
          {!hasBracket ? (
            <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-12 text-center text-slate-500">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>Bracket not generated yet.</p>
              {t.teams.length < 2 && <p className="text-sm mt-1">Need at least 2 teams.</p>}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(matchesByRound).map(([round, roundMatches]: [string, any]) => (
                <div key={round}>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
                    {(roundMatches[0]?.roundName) || `Round ${round}`}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roundMatches.map((match: any) => (
                      <MatchCard key={match.id} match={match} isAdmin={isAdmin}
                        onStart={() => startMatch.mutate(match.id)}
                        onResult={(data: any) => setResult.mutate({ matchId: match.id, ...data })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match: m, isAdmin, onStart, onResult }: any) {
  const isCompleted = m.status === 'completed';
  const isLive = m.status === 'live';
  const isBye = m.status === 'bye';

  const handleResult = () => {
    const score1 = prompt(`Score for ${m.team1?.name}:`);
    const score2 = prompt(`Score for ${m.team2?.name}:`);
    if (score1 === null || score2 === null) return;
    const winnerId = +score1 > +score2 ? m.team1Id : m.team2Id;
    onResult({ score1, score2, winnerId });
  };

  return (
    <div className={`bg-[#1a1d27] border rounded-xl p-4 transition-colors
      ${isLive ? 'border-green-500/50' : 'border-[#2a2d3e]'}
      ${isBye ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium flex items-center gap-1 ${statusColor[m.status]}`}>
          {isLive && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
          {isCompleted && <CheckCircle size={12} />}
          {isLive ? 'LIVE' : m.status.toUpperCase()}
        </span>
        {m.map && <span className="text-xs text-slate-500">{m.map}</span>}
      </div>

      <div className="space-y-2">
        <TeamRow team={m.team1} score={m.score1} isWinner={m.winnerId === m.team1Id} />
        <TeamRow team={m.team2} score={m.score2} isWinner={m.winnerId === m.team2Id} />
      </div>

      {isAdmin && !isCompleted && !isBye && (
        <div className="flex gap-2 mt-3">
          {!isLive && (
            <button onClick={onStart} className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-medium transition-colors">
              <Play size={12} /> Start
            </button>
          )}
          {(isLive || m.status === 'scheduled') && m.team1Id && m.team2Id && (
            <button onClick={handleResult} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium transition-colors">
              <CheckCircle size={12} /> Set Result
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, score, isWinner }: any) {
  if (!team) return <div className="flex items-center justify-between py-1 text-slate-600 text-sm">TBD</div>;
  return (
    <div className={`flex items-center justify-between py-1 ${isWinner ? 'text-white' : 'text-slate-400'}`}>
      <span className={`text-sm font-medium ${isWinner ? 'text-orange-400' : ''}`}>{team.name}</span>
      {score !== null && score !== undefined && (
        <span className={`text-lg font-bold ${isWinner ? 'text-white' : 'text-slate-500'}`}>{score}</span>
      )}
    </div>
  );
}
