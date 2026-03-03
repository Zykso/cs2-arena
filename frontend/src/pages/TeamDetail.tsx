import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Trophy, Trash2, UserMinus, Crown, Shield, Link, Copy, RefreshCw } from 'lucide-react';
import { teams } from '../api';
import api from '../api';
import { useAuth } from '../hooks/useAuth';

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teams.get(id!),
  });

  const deleteMutation = useMutation({
    mutationFn: () => teams.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); navigate('/teams'); },
  });

  const removePlayerMutation = useMutation({
    mutationFn: (userId: string) => teams.removePlayer(id!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', id] }),
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>;
  if (!team) return <div className="text-center py-20 text-slate-500">Team not found.</div>;

  const isOwner = user?.id === team.ownerId;
  const canManage = isOwner || isAdmin;
  const [copied, setCopied] = useState(false);

  const inviteUrl = team.inviteCode
    ? `${window.location.origin}/join/${team.inviteCode}`
    : null;

  const copyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInviteMutation = useMutation({
    mutationFn: () => api.post(`/teams/${id}/invite/reset`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', id] }),
  });

  const roleIcon: Record<string, any> = { captain: Crown, coach: Shield, player: Users };
  const roleColor: Record<string, string> = { captain: 'text-yellow-400', coach: 'text-blue-400', player: 'text-slate-400' };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {team.logo ? (
            <img src={team.logo} className="w-16 h-16 rounded-xl object-cover" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl font-bold text-orange-400">
              {team.tag}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              [{team.tag}] · {team.players.length} players · Owner: {team.owner.displayName}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => { if (confirm(`Delete team "${team.name}"?`)) deleteMutation.mutate(); }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors border border-red-500/20"
          >
            <Trash2 size={15} /> Delete Team
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center gap-2">
              <Users size={16} className="text-orange-500" />
              <h2 className="font-semibold">Roster</h2>
            </div>
            {team.players.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-500 text-sm">No players yet.</div>
            ) : (
              <div className="divide-y divide-[#2a2d3e]">
                {team.players.map((p: any) => {
                  const Icon = roleIcon[p.role] || Users;
                  const color = roleColor[p.role] || 'text-slate-400';
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.user.avatar ? (
                          <img src={p.user.avatar} className="w-9 h-9 rounded-full" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                            <Users size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{p.user.displayName}</p>
                          <p className={`text-xs flex items-center gap-1 ${color}`}>
                            <Icon size={11} />
                            {p.role}
                          </p>
                        </div>
                      </div>
                      {canManage && p.user.id !== team.ownerId && (
                        <button
                          onClick={() => removePlayerMutation.mutate(p.user.id)}
                          className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Remove player"
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Invite Link + Tournaments */}
        <div className="space-y-4">
        {canManage && inviteUrl && (
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center gap-2">
              <Link size={16} className="text-orange-500" />
              <h2 className="font-semibold">Invite Link</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-400">Share this link so players can join your team.</p>
              <div className="flex gap-2">
                <input readOnly value={inviteUrl}
                  className="flex-1 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none" />
                <button onClick={copyInvite}
                  className="px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                  <Copy size={13} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button onClick={() => { if (confirm('Reset invite link? The old link will stop working.')) resetInviteMutation.mutate(); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <RefreshCw size={12} /> Reset link
              </button>
            </div>
          </div>
        )}

        {/* Tournaments */}
        <div>
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center gap-2">
              <Trophy size={16} className="text-orange-500" />
              <h2 className="font-semibold">Tournaments</h2>
            </div>
            {team.tournaments.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">Not in any tournaments yet.</div>
            ) : (
              <div className="divide-y divide-[#2a2d3e]">
                {team.tournaments.map((tt: any) => (
                  <div key={tt.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{tt.tournament.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="capitalize">{tt.tournament.status}</span>
                      <span>·</span>
                      <span className="text-green-400">{tt.wins}W</span>
                      <span className="text-red-400">{tt.losses}L</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
