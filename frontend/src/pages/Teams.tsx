import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Plus, Shield } from 'lucide-react';
import { teams } from '../api';
import { useAuth } from '../hooks/useAuth';

export default function Teams() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', tag: '', logo: '' });

  const { data: list = [] } = useQuery({ queryKey: ['teams'], queryFn: teams.list });

  const createMutation = useMutation({
    mutationFn: teams.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setShowCreate(false); setForm({ name: '', tag: '', logo: '' }); },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-orange-500" /> Teams</h1>
        {user && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
            <Plus size={18} /> Create Team
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Create Team</h2>
            <div className="space-y-4">
              <input placeholder="Team name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              <input placeholder="Tag (max 5 chars) *" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value.slice(0, 5) }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              <input placeholder="Logo URL (optional)" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.tag}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((team: any) => (
          <Link key={team.id} to={`/teams/${team.id}`} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 hover:border-orange-500/40 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              {team.logo ? (
                <img src={team.logo} className="w-10 h-10 rounded-lg object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center font-bold text-orange-400">
                  {team.tag}
                </div>
              )}
              <div>
                <h3 className="font-semibold group-hover:text-orange-400 transition-colors">{team.name}</h3>
                <p className="text-xs text-slate-500">{team.players.length} players</p>
              </div>
            </div>
            <div className="flex -space-x-1">
              {team.players.slice(0, 5).map((p: any) => (
                p.user.avatar
                  ? <img key={p.id} src={p.user.avatar} className="w-6 h-6 rounded-full border border-[#1a1d27]" title={p.user.displayName} alt="" />
                  : <div key={p.id} className="w-6 h-6 rounded-full bg-slate-700 border border-[#1a1d27] flex items-center justify-center">
                      <Shield size={10} className="text-slate-400" />
                    </div>
              ))}
              {team.players.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-slate-700 border border-[#1a1d27] flex items-center justify-center text-xs text-slate-400">
                  +{team.players.length - 5}
                </div>
              )}
            </div>
          </Link>
        ))}
        {list.length === 0 && <div className="col-span-3 text-center py-20 text-slate-500">No teams yet. Create one!</div>}
      </div>
    </div>
  );
}
