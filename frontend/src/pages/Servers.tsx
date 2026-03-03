import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Plus, Terminal, RefreshCw, Wifi, WifiOff, Map, Trash2 } from 'lucide-react';
import { servers } from '../api';
import { useAuth } from '../hooks/useAuth';

// Active Duty pool (Premier Season 4 - January 2026)
const CS2_MAPS = ['de_anubis', 'de_ancient', 'de_dust2', 'de_inferno', 'de_mirage', 'de_nuke', 'de_overpass'];
// Extra maps available in other modes
const EXTRA_MAPS = ['de_vertigo', 'de_train', 'de_cache', 'de_office', 'de_italy'];

export default function Servers() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [rconCmd, setRconCmd] = useState('');
  const [rconLog, setRconLog] = useState<string[]>([]);
  const [customMaps, setCustomMaps] = useState<string[]>(() => {
    const saved = localStorage.getItem('cs2_custom_maps');
    return saved ? JSON.parse(saved) : [];
  });
  const [customMapInput, setCustomMapInput] = useState('');
  const [form, setForm] = useState({ name: '', host: '', rconPort: 27015, rconPassword: '', gamePort: 27015 });

  const { data: list = [] } = useQuery({ queryKey: ['servers'], queryFn: servers.list });
  const selectedServer = list.find((s: any) => s.id === selected);

  const addMutation = useMutation({
    mutationFn: servers.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servers'] }); setShowAdd(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: servers.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servers'] }); setSelected(null); },
  });

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['server-status', selected],
    queryFn: () => servers.status(selected!),
    enabled: !!selected,
    refetchInterval: 30000,
  });

  const rconMutation = useMutation({
    mutationFn: (cmd: string) => servers.rcon(selected!, cmd),
    onSuccess: (data) => {
      setRconLog(prev => [...prev, `> ${rconCmd}`, data.response || data.error || '(no output)', '']);
      setRconCmd('');
    },
  });

  const changeMapMutation = useMutation({
    mutationFn: (map: string) => servers.changeMap(selected!, map),
    onSuccess: () => { setTimeout(() => refetchStatus(), 5000); },
  });

  const handleRcon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconCmd.trim()) return;
    rconMutation.mutate(rconCmd);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Server className="text-orange-500" /> Servers</h1>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
            <Plus size={18} /> Add Server
          </button>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Add CS2 Server</h2>
            <div className="space-y-4">
              <input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              <input placeholder="Host/IP *" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="RCON Port" type="number" value={form.rconPort} onChange={e => setForm(f => ({ ...f, rconPort: +e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                <input placeholder="Game Port" type="number" value={form.gamePort} onChange={e => setForm(f => ({ ...f, gamePort: +e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <input placeholder="RCON Password *" type="password" value={form.rconPassword} onChange={e => setForm(f => ({ ...f, rconPassword: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => addMutation.mutate(form)} disabled={!form.name || !form.host || !form.rconPassword}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Add Server
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server list */}
        <div className="space-y-3">
          {list.map((s: any) => (
            <div key={s.id} onClick={() => { setSelected(s.id); setRconLog([]); }}
              className={`cursor-pointer p-4 rounded-xl border transition-colors ${selected === s.id ? 'border-orange-500 bg-orange-500/5' : 'border-[#2a2d3e] bg-[#1a1d27] hover:border-slate-500'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-xs ${s.status === 'online' ? 'text-green-400' : 'text-slate-500'}`}>
                    {s.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {s.status}
                  </span>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); if (confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id); }}
                      className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">{s.host}:{s.gamePort}</p>
              {s.currentMap && <p className="text-xs text-slate-400 mt-1">Map: {s.currentMap} · {s.playerCount} players</p>}
            </div>
          ))}
          {list.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No servers configured.</div>}
        </div>

        {/* Server control panel */}
        {selectedServer && (
          <div className="lg:col-span-2 space-y-4">
            {/* Status */}
            <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{selectedServer.name} — Status</h2>
                <button onClick={() => refetchStatus()} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                  <RefreshCw size={15} className="text-slate-400" />
                </button>
              </div>
              {status?.status === 'online' ? (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-[#0f1117] rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Map</p>
                    <p className="font-medium">{status.map}</p>
                  </div>
                  <div className="bg-[#0f1117] rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Players</p>
                    <p className="font-medium">{status.playerCount}</p>
                  </div>
                  <div className="bg-[#0f1117] rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Status</p>
                    <p className="font-medium text-green-400">Online</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Server is offline or unreachable.</p>
              )}
            </div>

            {/* Change map */}
            {isAdmin && (
              <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Map size={16} className="text-orange-500" /> Change Map</h2>
                <p className="text-xs text-slate-500 mb-2">Active Duty (Premier Season 4)</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CS2_MAPS.map(map => (
                    <button key={map} onClick={() => changeMapMutation.mutate(map)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                        ${status?.map === map ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                      {map}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mb-2">Other Maps</p>
                <div className="flex flex-wrap gap-2">
                  {EXTRA_MAPS.map(map => (
                    <button key={map} onClick={() => changeMapMutation.mutate(map)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                        ${status?.map === map ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                      {map}
                    </button>
                  ))}
                </div>
                {customMaps.length > 0 && (
                  <>
                    <p className="text-xs text-slate-500 mb-2 mt-3">Custom Maps</p>
                    <div className="flex flex-wrap gap-2">
                      {customMaps.map(map => (
                        <div key={map} className="flex items-center gap-1">
                          <button onClick={() => changeMapMutation.mutate(map)}
                            className={`px-3 py-1.5 rounded-l-lg text-xs font-medium border-y border-l transition-colors
                              ${status?.map === map ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                            {map}
                          </button>
                          <button onClick={() => {
                            const updated = customMaps.filter(m => m !== map);
                            setCustomMaps(updated);
                            localStorage.setItem('cs2_custom_maps', JSON.stringify(updated));
                          }} className="px-1.5 py-1.5 rounded-r-lg text-xs border-y border-r border-[#2a2d3e] text-slate-600 hover:text-red-400 hover:border-red-400/30 transition-colors">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <form className="flex gap-2 mt-3" onSubmit={e => {
                  e.preventDefault();
                  const map = customMapInput.trim().toLowerCase().replace(/\s+/g, '_');
                  if (!map) return;
                  const name = map.startsWith('de_') ? map : `de_${map}`;
                  if (!customMaps.includes(name)) {
                    const updated = [...customMaps, name];
                    setCustomMaps(updated);
                    localStorage.setItem('cs2_custom_maps', JSON.stringify(updated));
                  }
                  setCustomMapInput('');
                }}>
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
            )}

            {/* RCON Console */}
            {isAdmin && (
              <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Terminal size={16} className="text-orange-500" /> RCON Console</h2>
                <div className="bg-[#0a0c10] rounded-lg p-3 font-mono text-xs h-48 overflow-y-auto mb-3 text-green-400">
                  {rconLog.length === 0 ? <span className="text-slate-600">Console ready. Type a command...</span> : rconLog.map((l, i) => (
                    <div key={i} className={l.startsWith('>') ? 'text-orange-400' : 'text-green-400'}>{l || '\u00a0'}</div>
                  ))}
                </div>
                <form onSubmit={handleRcon} className="flex gap-2">
                  <input value={rconCmd} onChange={e => setRconCmd(e.target.value)} placeholder="Enter RCON command..."
                    className="flex-1 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-orange-500" />
                  <button type="submit" disabled={rconMutation.isPending}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
