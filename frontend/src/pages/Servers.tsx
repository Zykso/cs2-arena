import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Plus, Terminal, RefreshCw, Wifi, WifiOff, Map, Trash2, Edit2, RotateCcw, PowerOff, Zap } from 'lucide-react';
import { servers } from '../api';
import { useAuth } from '../hooks/useAuth';

const CS2_MAPS = ['de_anubis', 'de_ancient', 'de_dust2', 'de_inferno', 'de_mirage', 'de_nuke', 'de_overpass'];
const EXTRA_MAPS = ['de_vertigo', 'de_train', 'de_cache', 'de_office', 'de_italy'];

const EMPTY_FORM = { name: '', host: '', rconPort: 27015, rconPassword: '', gamePort: 27015 };

export default function Servers() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editServer, setEditServer] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [rconCmd, setRconCmd] = useState('');
  const [rconLog, setRconLog] = useState<string[]>([]);
  const [customMaps, setCustomMaps] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cs2_custom_maps') || '[]'); } catch { return []; }
  });
  const [customMapInput, setCustomMapInput] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<'status' | 'maps' | 'console'>('status');

  const { data: list = [] } = useQuery({ queryKey: ['servers'], queryFn: servers.list });
  const selectedServer = list.find((s: any) => s.id === selected);

  const addMutation = useMutation({
    mutationFn: servers.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servers'] }); setShowAdd(false); setForm(EMPTY_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => servers.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servers'] }); setEditServer(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: servers.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servers'] }); setSelected(null); },
  });

  const { data: status, refetch: refetchStatus, isFetching: statusFetching } = useQuery({
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
    onSuccess: () => setTimeout(() => refetchStatus(), 5000),
  });

  const restartGameMutation = useMutation({
    mutationFn: () => servers.restartGame(selected!),
    onSuccess: () => setRconLog(prev => [...prev, '> mp_restartgame 1', 'Match restarted.', '']),
  });

  const restartServerMutation = useMutation({
    mutationFn: () => servers.restartServer(selected!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] });
      setTimeout(() => refetchStatus(), 15000);
    },
  });

  const openEdit = (s: any) => {
    setEditServer(s);
    setForm({ name: s.name, host: s.host, rconPort: s.rconPort, rconPassword: s.rconPassword, gamePort: s.gamePort });
  };

  const handleRcon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconCmd.trim()) return;
    rconMutation.mutate(rconCmd);
  };

  const addCustomMap = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = customMapInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!raw) return;
    const name = raw.startsWith('de_') ? raw : `de_${raw}`;
    if (!customMaps.includes(name)) {
      const updated = [...customMaps, name];
      setCustomMaps(updated);
      localStorage.setItem('cs2_custom_maps', JSON.stringify(updated));
    }
    setCustomMapInput('');
  };

  const removeCustomMap = (map: string) => {
    const updated = customMaps.filter(m => m !== map);
    setCustomMaps(updated);
    localStorage.setItem('cs2_custom_maps', JSON.stringify(updated));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Server className="text-orange-500" /> Servers</h1>
        {isAdmin && (
          <button onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
            <Plus size={18} /> Add Server
          </button>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(showAdd || editServer) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">{editServer ? 'Edit Server' : 'Add CS2 Server'}</h2>
            <div className="space-y-4">
              <input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
              <input placeholder="Host / IP *" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
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
              <button onClick={() => { setShowAdd(false); setEditServer(null); }}
                className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-lg text-sm hover:bg-white/5 transition-colors">Cancel</button>
              <button
                onClick={() => editServer
                  ? updateMutation.mutate({ id: editServer.id, data: form })
                  : addMutation.mutate(form)}
                disabled={!form.name || !form.host || !form.rconPassword}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {editServer ? 'Save Changes' : 'Add Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server list */}
        <div className="space-y-3">
          {list.map((s: any) => (
            <div key={s.id} onClick={() => { setSelected(s.id); setRconLog([]); setActiveTab('status'); }}
              className={`cursor-pointer p-4 rounded-xl border transition-colors ${selected === s.id ? 'border-orange-500 bg-orange-500/5' : 'border-[#2a2d3e] bg-[#1a1d27] hover:border-slate-500'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate mr-2">{s.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`flex items-center gap-1 text-xs ${s.status === 'online' ? 'text-green-400' : 'text-slate-500'}`}>
                    {s.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {s.status}
                  </span>
                  {isAdmin && (
                    <>
                      <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                        className="p-1 hover:bg-white/10 text-slate-500 hover:text-slate-200 rounded transition-colors ml-1">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id); }}
                        className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">{s.host}:{s.gamePort}</p>
              {s.currentMap && <p className="text-xs text-slate-400 mt-1">{s.currentMap} · {s.playerCount} players</p>}
            </div>
          ))}
          {list.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No servers configured.</div>}
        </div>

        {/* Control panel */}
        {selectedServer && isAdmin && (
          <div className="lg:col-span-2 space-y-4">
            {/* Header with action buttons */}
            <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg">{selectedServer.name}</h2>
                  <p className="text-xs text-slate-500">{selectedServer.host}:{selectedServer.rconPort}</p>
                </div>
                <button onClick={() => refetchStatus()} disabled={statusFetching}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="Refresh status">
                  <RefreshCw size={15} className={`text-slate-400 ${statusFetching ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Status tiles */}
              {status?.status === 'online' ? (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#0f1117] rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Status</p>
                    <p className="font-medium text-green-400 flex items-center gap-1"><Wifi size={12} /> Online</p>
                  </div>
                  <div className="bg-[#0f1117] rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Map</p>
                    <p className="font-medium text-sm truncate">{status.map || '—'}</p>
                  </div>
                  <div className="bg-[#0f1117] rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Players</p>
                    <p className="font-medium">{status.playerCount ?? 0}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0f1117] rounded-lg p-3 mb-4 flex items-center gap-2 text-slate-500 text-sm">
                  <WifiOff size={14} /> Server offline or unreachable
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { if (confirm('Restart the current match? (mp_restartgame)')) restartGameMutation.mutate(); }}
                  disabled={restartGameMutation.isPending}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm transition-colors disabled:opacity-50">
                  <Zap size={14} /> Restart Game
                </button>
                <button onClick={() => { if (confirm('Restart the server process? It will come back online automatically if using Docker.')) restartServerMutation.mutate(); }}
                  disabled={restartServerMutation.isPending}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg text-sm transition-colors disabled:opacity-50">
                  <RotateCcw size={14} /> {restartServerMutation.isPending ? 'Restarting…' : 'Restart Server'}
                </button>
                <button onClick={() => openEdit(selectedServer)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/20 rounded-lg text-sm transition-colors">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete "${selectedServer.name}"?`)) deleteMutation.mutate(selectedServer.id); }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm transition-colors ml-auto">
                  <PowerOff size={14} /> Delete
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#0f1117] rounded-lg p-1">
              {(['status', 'maps', 'console'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors
                    ${activeTab === tab ? 'bg-[#1a1d27] text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {tab === 'status' ? 'Quick Commands' : tab === 'maps' ? 'Map Control' : 'RCON Console'}
                </button>
              ))}
            </div>

            {/* Quick Commands */}
            {activeTab === 'status' && (
              <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
                <h3 className="font-medium mb-1 text-sm text-slate-400 uppercase tracking-wider">Quick Commands</h3>
                <p className="text-xs text-slate-600 mb-3">Each button sends via RCON and switches to the Console tab so you can see the response.</p>

                {/* Warmup */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Warmup</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'Start Warmup',      cmd: 'mp_warmup_start',           desc: 'Begin warmup phase' },
                    { label: 'End Warmup',         cmd: 'mp_warmup_end',             desc: 'End warmup immediately' },
                    { label: 'Pause Warmup Timer', cmd: 'mp_warmup_pausetimer 1',    desc: 'Keeps warmup indefinitely' },
                    { label: 'Resume Warmup Timer',cmd: 'mp_warmup_pausetimer 0',    desc: 'Let warmup timer count down' },
                  ].map(({ label, cmd, desc }) => (
                    <QuickBtn key={label} label={label} cmd={cmd} desc={desc}
                      onClick={() => { rconMutation.mutate(cmd); setActiveTab('console'); setRconCmd(cmd); }} />
                  ))}
                </div>

                {/* Match */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Match</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'Restart Game',       cmd: 'mp_restartgame 1',          desc: 'Restart current match (1s delay)' },
                    { label: 'Competitive Rules',  cmd: 'mp_maxrounds 30; mp_overtime_enable 1', desc: '30 rounds + overtime on' },
                    { label: 'Enable Overtime',    cmd: 'mp_overtime_enable 1',       desc: 'Enable overtime rounds' },
                    { label: 'Disable Overtime',   cmd: 'mp_overtime_enable 0',       desc: 'No overtime — first to 16 wins' },
                    { label: 'Set Halftime 60s',   cmd: 'mp_halftime_duration 60',    desc: '60-second halftime break' },
                    { label: 'Set Halftime 15s',   cmd: 'mp_halftime_duration 15',    desc: 'Short 15-second halftime' },
                  ].map(({ label, cmd, desc }) => (
                    <QuickBtn key={label} label={label} cmd={cmd} desc={desc}
                      onClick={() => { rconMutation.mutate(cmd); setActiveTab('console'); setRconCmd(cmd); }} />
                  ))}
                </div>

                {/* Practice */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Practice</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'Enable sv_cheats',   cmd: 'sv_cheats 1',               desc: 'Required for most practice commands' },
                    { label: 'Infinite Ammo',       cmd: 'sv_infinite_ammo 2',        desc: 'Unlimited mags, still reload' },
                    { label: 'Grenade Preview',     cmd: 'sv_grenade_trajectory_prac_pipreview 1', desc: 'Show grenade throw trajectory' },
                    { label: 'Show Impacts',        cmd: 'sv_showimpacts 1',           desc: 'Show bullet impact markers' },
                    { label: 'No Team Limits',      cmd: 'mp_limitteams 0; mp_autoteambalance 0', desc: 'Allow uneven teams' },
                    { label: 'No Freeze Time',      cmd: 'mp_freezetime 0',            desc: 'Skip buy phase freeze' },
                  ].map(({ label, cmd, desc }) => (
                    <QuickBtn key={label} label={label} cmd={cmd} desc={desc}
                      onClick={() => { rconMutation.mutate(cmd); setActiveTab('console'); setRconCmd(cmd); }} />
                  ))}
                </div>

                {/* Bots & Info */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bots & Info</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Kick All Bots',       cmd: 'bot_kick',                  desc: 'Remove all bots from server' },
                    { label: 'Add CT Bot',           cmd: 'bot_add_ct',                desc: 'Add one bot to CT side' },
                    { label: 'Add T Bot',            cmd: 'bot_add_t',                 desc: 'Add one bot to T side' },
                    { label: 'Status',               cmd: 'status',                    desc: 'Show players + server info' },
                    { label: 'Server Announce',      cmd: 'say "Server managed by CS2 Arena"', desc: 'Send message to all players' },
                  ].map(({ label, cmd, desc }) => (
                    <QuickBtn key={label} label={label} cmd={cmd} desc={desc}
                      onClick={() => { rconMutation.mutate(cmd); setActiveTab('console'); setRconCmd(cmd); }} />
                  ))}
                </div>

                <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs text-yellow-400/70">
                  <strong>Note:</strong> Knife round requires a plugin (e.g. MatchZy <code>.rk</code>). There is no native CS2 RCON command for it.
                </div>
              </div>
            )}

            {/* Map control */}
            {activeTab === 'maps' && (
              <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Map size={16} className="text-orange-500" />
                  <h3 className="font-semibold">Map Control</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">Active Duty — Premier Season 4</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CS2_MAPS.map(map => (
                    <button key={map} onClick={() => changeMapMutation.mutate(map)}
                      disabled={changeMapMutation.isPending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                        ${status?.map === map ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                      {map}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mb-2">Other Maps</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {EXTRA_MAPS.map(map => (
                    <button key={map} onClick={() => changeMapMutation.mutate(map)}
                      disabled={changeMapMutation.isPending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                        ${status?.map === map ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                      {map}
                    </button>
                  ))}
                </div>
                {customMaps.length > 0 && (
                  <>
                    <p className="text-xs text-slate-500 mb-2">Custom Maps</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {customMaps.map(map => (
                        <div key={map} className="flex items-center">
                          <button onClick={() => changeMapMutation.mutate(map)}
                            className={`px-3 py-1.5 rounded-l-lg text-xs font-medium border-y border-l transition-colors
                              ${status?.map === map ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2a2d3e] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                            {map}
                          </button>
                          <button onClick={() => removeCustomMap(map)}
                            className="px-1.5 py-1.5 rounded-r-lg text-xs border-y border-r border-[#2a2d3e] text-slate-600 hover:text-red-400 hover:border-red-400/30 transition-colors">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <form className="flex gap-2" onSubmit={addCustomMap}>
                  <input value={customMapInput} onChange={e => setCustomMapInput(e.target.value)}
                    placeholder="Add map (e.g. de_train or train)"
                    className="flex-1 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                  <button type="submit"
                    className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-medium transition-colors">
                    Add
                  </button>
                </form>
              </div>
            )}

            {/* RCON Console */}
            {activeTab === 'console' && (
              <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Terminal size={16} className="text-orange-500" /> RCON Console</h3>
                <div className="bg-[#0a0c10] rounded-lg p-3 font-mono text-xs h-52 overflow-y-auto mb-3">
                  {rconLog.length === 0
                    ? <span className="text-slate-600">Console ready. Type a command below...</span>
                    : rconLog.map((l, i) => (
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

        {!selectedServer && (
          <div className="lg:col-span-2 flex items-center justify-center text-slate-600 text-sm">
            Select a server to manage it
          </div>
        )}
      </div>
    </div>
  );
}

function QuickBtn({ label, cmd, desc, onClick }: { label: string; cmd: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      title={`${cmd}\n${desc}`}
      className="px-3 py-2 bg-[#0f1117] hover:bg-[#161921] border border-[#2a2d3e] hover:border-slate-500 rounded-lg text-left transition-colors group">
      <p className="text-sm text-slate-300 font-medium leading-tight">{label}</p>
      <p className="text-[11px] text-slate-600 group-hover:text-slate-500 mt-0.5 leading-tight">{desc}</p>
    </button>
  );
}
