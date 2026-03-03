import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';

export default function JoinTeam() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: team, isLoading, error } = useQuery({
    queryKey: ['invite', code],
    queryFn: () => api.get(`/teams/invite/${code}`).then(r => r.data),
  });

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/teams/invite/${code}/join`).then(r => r.data),
    onSuccess: (data) => navigate(`/teams/${data.teamId}`),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>
  );

  if (error || !team) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Invalid Invite Link</h2>
        <p className="text-slate-400">This invite link is invalid or has been reset.</p>
      </div>
    </div>
  );

  const alreadyOnTeam = team.players.some((p: any) => p.user.id === user?.id);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-8 w-full max-w-md text-center">
        {team.logo ? (
          <img src={team.logo} className="w-20 h-20 rounded-xl object-cover mx-auto mb-4" alt="" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl font-bold text-orange-400 mx-auto mb-4">
            {team.tag}
          </div>
        )}

        <h1 className="text-2xl font-bold mb-1">{team.name}</h1>
        <p className="text-slate-400 text-sm mb-6">
          {team.players.length} players · Owned by {team.owner.displayName}
        </p>

        <div className="bg-[#0f1117] rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Current Roster</p>
          <div className="space-y-2">
            {team.players.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2">
                {p.user.avatar
                  ? <img src={p.user.avatar} className="w-6 h-6 rounded-full" alt="" />
                  : <div className="w-6 h-6 rounded-full bg-slate-700" />
                }
                <span className="text-sm">{p.user.displayName}</span>
                <span className="text-xs text-slate-500 ml-auto">{p.role}</span>
              </div>
            ))}
          </div>
        </div>

        {!user ? (
          <div>
            <p className="text-slate-400 text-sm mb-4">You need to log in with Steam to join this team.</p>
            <a href="/api/auth/steam"
              className="block w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors">
              Login with Steam to Join
            </a>
          </div>
        ) : alreadyOnTeam ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle size={18} />
            <span>You're already on this team</span>
          </div>
        ) : (
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
          >
            {joinMutation.isPending ? 'Joining...' : `Join ${team.name}`}
          </button>
        )}

        {joinMutation.isError && (
          <p className="text-red-400 text-sm mt-3">
            {(joinMutation.error as any)?.response?.data?.error || 'Failed to join team'}
          </p>
        )}
      </div>
    </div>
  );
}
