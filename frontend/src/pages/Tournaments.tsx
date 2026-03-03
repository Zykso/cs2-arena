import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trophy, Users, Calendar } from 'lucide-react';
import { tournaments } from '../api';
import { useAuth } from '../hooks/useAuth';

const FORMATS = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'swiss', label: 'Swiss System' },
];

// Active Duty pool (Premier Season 4 - January 2026)
const CS2_MAPS = ['de_anubis', 'de_ancient', 'de_dust2', 'de_inferno', 'de_mirage', 'de_nuke', 'de_overpass'];

export default function Tournaments() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', format: 'single_elimination', maxTeams: 16, mapPool: CS2_MAPS, startDate: '', endDate: '' });
  const [customMapInput, setCustomMapInput] = useState('');
  const [customMaps, setCustomMaps] = useState<string[]>(() => {
    const saved = localStorage.getItem('cs2_custom_maps');
    return saved ? JSON.parse(saved) : [];
  });

  const { data: list = [] } = useQuery({ queryKey: ['tournaments'], queryFn: tournaments.list });

  const createMutation = useMutation({
    mutationFn: tournaments.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournaments'] }); setShowCreate(false); },
  });

  const toggleMap = (map: string) => {
    setForm(f => ({ ...f, mapPool: f.mapPool.includes(map) ? f.mapPool.filter(m => m !== map) : [...f.mapPool, map] }));
  };

  const addCustomMap = (e: React.FormEvent) => {
    e.preventDefault();
    const map = customMapInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!map) return;
    const name = map.startsWith('de_') ? map : `de_${map}`;
    if (!customMaps.includes(name)) {
      const updated = [...customMaps, name];
      setCustomMaps(updated);
      localStorage.setItem('cs2_custom_maps', JSON.stringify(updated));
    }
    toggleMap(name);
    setCustomMapInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-orange-500" /> Tournaments</h1>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
            <Plus size={18} /> Create Tournament
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-6">Create Tournament</h2>
            <div className="space-y-4">
              <input
                placeholder="Tournament name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Format</label>
                  <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500">
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Max Teams</label>
                  <input type="number" value={form.maxTeams} onChange={e => setForm(f => ({ ...f, maxTeams: +e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
                  <input type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                  <input type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Map Pool</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[...CS2_MAPS, ...customMaps].map(map => (
                    <button key={map} type="button" onClick={() => toggleMap(map)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${form.mapPool.includes(map) ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500'}`}>
                      {map}
                    </button>
                  ))}
                </div>
                <form onSubmit={addCustomMap} className="flex gap-2 mt-1">
                  <input
                    value={customMapInput}
                    onChange={e => setCustomMapInput(e.target.value)}
                    placeholder="Add map (e.g. de_train or train)"
                    className="flex-1 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-medium transition-colors">
                    Add
                  </button>
                </form>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((t: any) => (
          <Link key={t.id} to={`/tournaments/${t.id}`} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 hover:border-orange-500/40 transition-colors group">
            <h3 className="font-semibold mb-1 group-hover:text-orange-400 transition-colors">{t.name}</h3>
            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{t.description || 'No description'}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Users size={12} /> {t.teams.length}/{t.maxTeams} teams</span>
              <span className="capitalize px-2 py-0.5 bg-white/5 rounded">{t.format.replace('_', ' ')}</span>
              {t.startDate && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(t.startDate).toLocaleDateString()}</span>}
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="col-span-3 text-center py-20 text-slate-500">No tournaments yet.</div>
        )}
      </div>
    </div>
  );
}
