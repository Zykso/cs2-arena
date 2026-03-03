import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Trash2, UserCog } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';

export default function Admin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    enabled: isAdmin,
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  if (!isAdmin) return (
    <div className="flex items-center justify-center min-h-screen text-slate-500">
      Access denied. Admin only.
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-8"><Shield className="text-orange-500" /> Admin Panel</h1>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center gap-2">
          <UserCog size={16} className="text-orange-500" />
          <h2 className="font-semibold">User Management</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e] text-slate-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Player</th>
              <th className="text-left px-4 py-3">Steam ID</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-[#2a2d3e]/50 hover:bg-white/2">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.avatar && <img src={u.avatar} className="w-6 h-6 rounded-full" alt="" />}
                    <span>{u.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.steamId}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={e => setRole.mutate({ id: u.id, role: e.target.value })}
                    className="bg-[#0f1117] border border-[#2a2d3e] rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
