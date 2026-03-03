import React from 'react';
import { Play, CheckCircle, Edit2, RotateCcw, Ban, Trash2, Trophy, Server } from 'lucide-react';

// ── Layout constants ─────────────────────────────────────────────────────────
const CARD_H  = 76;   // height of each match card
const CARD_W  = 214;  // width of each match card
const V_GAP   = 16;   // vertical gap between cards in the first round
const H_GAP   = 64;   // horizontal space between rounds (connector area)
const SLOT_H  = CARD_H + V_GAP; // 92 px — the fundamental vertical unit

/** Vertical centre-Y of match `m` in round index `r` (0-based). */
function centerOf(r: number, m: number): number {
  const pow = Math.pow(2, r);
  return m * SLOT_H * pow + SLOT_H * (pow - 1) / 2 + CARD_H / 2;
}

// ── Shared action button ─────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  green:  'bg-green-500/20  hover:bg-green-500/30  text-green-400',
  orange: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400',
  slate:  'bg-slate-500/20  hover:bg-slate-500/30  text-slate-300',
  red:    'bg-red-500/20    hover:bg-red-500/30    text-red-400',
  blue:   'bg-blue-500/20   hover:bg-blue-500/30   text-blue-400',
};
function Btn({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${COLORS[color]}`}>
      {icon}{label}
    </button>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
interface Props {
  tournament: any;
  isAdmin: boolean;
  serverList?: any[];
  onStart:  (match: any) => void;
  onResult: (match: any)      => void;
  onEdit:   (match: any)      => void;
  onCancel: (matchId: string) => void;
  onReset:  (matchId: string) => void;
  onDelete: (matchId: string) => void;
}

export default function BracketView(props: Props) {
  const fmt = props.tournament.format;
  if (fmt === 'round_robin' || fmt === 'swiss') return <RoundRobinView {...props} />;
  return <EliminationBracket {...props} />;
}

// ── Single / Double Elimination ──────────────────────────────────────────────
function EliminationBracket({ tournament, isAdmin, serverList = [], onStart, onResult, onEdit, onCancel, onReset, onDelete }: Props) {
  const matches: any[] = tournament.matches;
  const roundNums = [...new Set(matches.map((m: any) => m.round as number))].sort((a, b) => a - b);
  const rounds    = roundNums.map(r => matches.filter((m: any) => m.round === r));

  if (rounds.length === 0) return null;

  const numRounds     = rounds.length;
  const firstSize     = rounds[0].length;
  const totalH        = firstSize * SLOT_H;
  const totalW        = numRounds * (CARD_W + H_GAP) - H_GAP;

  const roundLabel = (rIdx: number): string => {
    const match = rounds[rIdx][0];
    if (match?.roundName) return match.roundName;
    const fromEnd = numRounds - rIdx;
    if (fromEnd === 1) return 'Grand Final';
    if (fromEnd === 2) return numRounds > 2 ? 'Semifinals' : 'Final';
    if (fromEnd === 3) return 'Quarterfinals';
    return `Round ${rIdx + 1}`;
  };

  // Build SVG connector paths
  const connectors: React.ReactElement[] = [];
  for (let r = 0; r < numRounds - 1; r++) {
    const rx     = r * (CARD_W + H_GAP) + CARD_W;   // right edge of this round
    const midX   = rx + H_GAP / 2;                   // midpoint in the gap
    const nextX  = (r + 1) * (CARD_W + H_GAP);       // left edge of next round
    const count  = rounds[r].length;

    for (let k = 0; k < Math.floor(count / 2); k++) {
      const cTop  = centerOf(r, k * 2);
      const cBot  = centerOf(r, k * 2 + 1);
      const cMid  = (cTop + cBot) / 2;
      connectors.push(
        <g key={`${r}-${k}`}>
          {/* right-arm bracket */}
          <path d={`M ${rx} ${cTop} H ${midX} V ${cBot} H ${rx}`}
            fill="none" stroke="#2d3149" strokeWidth={1.5} />
          {/* horizontal to next match */}
          <line x1={midX} y1={cMid} x2={nextX} y2={cMid}
            stroke="#2d3149" strokeWidth={1.5} />
        </g>
      );
    }
    // odd match (bye auto-advance)
    if (count % 2 !== 0) {
      const c = centerOf(r, count - 1);
      connectors.push(
        <line key={`bye-${r}`} x1={rx} y1={c} x2={nextX} y2={c}
          stroke="#2d3149" strokeWidth={1.5} />
      );
    }
  }

  return (
    <div className="overflow-x-auto pb-4 select-none">
      {/* Column headers */}
      <div className="flex mb-3" style={{ minWidth: totalW }}>
        {rounds.map((_, rIdx) => (
          <div key={rIdx} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest shrink-0"
            style={{ width: CARD_W, marginRight: rIdx < numRounds - 1 ? H_GAP : 0 }}>
            {roundLabel(rIdx)}
          </div>
        ))}
      </div>

      {/* Bracket area */}
      <div className="relative" style={{ width: totalW, height: totalH }}>
        {/* SVG connector lines */}
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width={totalW} height={totalH}>
          {connectors}
        </svg>

        {/* Match cards */}
        {rounds.map((roundMatches, rIdx) =>
          roundMatches.map((match: any, mIdx: number) => {
            const cy     = centerOf(rIdx, mIdx);
            const top    = cy - CARD_H / 2;
            const left   = rIdx * (CARD_W + H_GAP);
            const server = serverList.find((s: any) => s.id === match.serverId);
            return (
              <div key={match.id} className="absolute" style={{ top, left, width: CARD_W, height: CARD_H }}>
                <BracketCard
                  match={match} isAdmin={isAdmin} server={server}
                  onStart={() => onStart(match)} onResult={() => onResult(match)}
                  onEdit={() => onEdit(match)}       onCancel={() => onCancel(match.id)}
                  onReset={() => onReset(match.id)}  onDelete={() => onDelete(match.id)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Bracket match card ────────────────────────────────────────────────────────
function BracketCard({ match: m, isAdmin, server, onStart, onResult, onEdit, onCancel, onReset, onDelete }: any) {
  const isBye       = m.status === 'bye';
  const isLive      = m.status === 'live';
  const isCompleted = m.status === 'completed';
  const isCancelled = m.status === 'cancelled';

  if (isBye) {
    return (
      <div className="h-full flex items-center justify-center text-slate-700 text-xs italic border border-[#1c1f2e] bg-[#131620] rounded-xl">
        Bye
      </div>
    );
  }

  const borderClass = isLive
    ? 'border-green-500/50 shadow-[0_0_14px_rgba(34,197,94,0.12)]'
    : isCancelled ? 'border-red-500/20 opacity-50'
    : isCompleted ? 'border-[#2a2d3e]'
    : 'border-[#2a2d3e]';

  return (
    <div className={`relative h-full border rounded-xl overflow-hidden bg-[#1a1d27] group transition-all ${borderClass}`}>

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-1.5 right-2 flex items-center gap-1 z-10">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-[10px] font-semibold tracking-wider">LIVE</span>
        </div>
      )}

      {/* Teams */}
      <div className="h-full flex flex-col divide-y divide-[#252838]">
        <MatchTeamRow team={m.team1} score={m.score1} isWinner={isCompleted && m.winnerId === m.team1Id} />
        <MatchTeamRow team={m.team2} score={m.score2} isWinner={isCompleted && m.winnerId === m.team2Id} />
      </div>

      {/* Map + server footnote */}
      {(m.map || server) && (
        <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between pointer-events-none">
          {m.map   && <span className="text-[9px] text-slate-600">{m.map}</span>}
          {server  && <span className="text-[9px] text-slate-600 flex items-center gap-0.5"><Server size={8} />{server.name}</span>}
        </div>
      )}

      {/* Admin hover overlay */}
      {isAdmin && (
        <div className="absolute inset-0 bg-[#0d0f1a]/92 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-xl">
          <div className="flex flex-wrap justify-center gap-1 px-2">
            {!isCompleted && !isCancelled && (
              <>
                {!isLive && <Btn onClick={onStart} icon={<Play size={10}/>} label="Launch" color="green" />}
                {m.team1Id && m.team2Id && <Btn onClick={onResult} icon={<CheckCircle size={10}/>} label="Result" color="orange" />}
                <Btn onClick={onEdit} icon={<Edit2 size={10}/>} label="Edit" color="slate" />
                <Btn onClick={onCancel} icon={<Ban size={10}/>} label="Cancel" color="red" />
              </>
            )}
            {(isCompleted || isCancelled) && (
              <Btn onClick={onReset} icon={<RotateCcw size={10}/>} label="Reset" color="blue" />
            )}
            <Btn onClick={onDelete} icon={<Trash2 size={10}/>} label="Delete" color="red" />
          </div>
        </div>
      )}
    </div>
  );
}

function MatchTeamRow({ team, score, isWinner }: { team: any; score: any; isWinner: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2.5 flex-1 ${isWinner ? 'bg-orange-500/8' : ''}`}>
      {team ? (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-bold w-7 shrink-0 ${isWinner ? 'text-orange-400' : 'text-slate-600'}`}>
              {team.tag?.slice(0, 4)}
            </span>
            <span className={`text-[13px] truncate leading-tight ${isWinner ? 'text-white font-semibold' : 'text-slate-300'}`}>
              {team.name}
            </span>
          </div>
          {score !== null && score !== undefined && (
            <span className={`text-sm font-bold ml-1 shrink-0 tabular-nums ${isWinner ? 'text-white' : 'text-slate-500'}`}>
              {score}
            </span>
          )}
        </>
      ) : (
        <span className="text-slate-600 text-xs italic">TBD</span>
      )}
    </div>
  );
}

// ── Round Robin / Swiss ───────────────────────────────────────────────────────
function RoundRobinView({ tournament, isAdmin, onStart, onResult, onEdit, onCancel, onReset, onDelete }: Props) {
  const matches: any[] = tournament.matches;
  const teams: any[]   = tournament.teams;

  const standings = [...teams].sort((a: any, b: any) =>
    b.points !== a.points ? b.points - a.points :
    b.wins   !== a.wins   ? b.wins   - a.wins   :
    a.losses - b.losses
  );

  const roundNums = [...new Set(matches.map((m: any) => m.round as number))].sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Standings */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden h-fit">
        <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center gap-2">
          <Trophy size={14} className="text-orange-500" />
          <h3 className="font-semibold text-sm">Standings</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-slate-500 border-b border-[#2a2d3e]">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Team</th>
              <th className="text-center px-2 py-2 font-medium">W</th>
              <th className="text-center px-2 py-2 font-medium">L</th>
              <th className="text-center px-2 py-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d3e]">
            {standings.map((tt: any, i: number) => (
              <tr key={tt.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-2.5 text-slate-500 text-xs w-8">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-orange-400/70 w-8 shrink-0">{tt.team.tag}</span>
                    <span className="font-medium text-sm truncate">{tt.team.name}</span>
                  </div>
                </td>
                <td className="text-center px-2 py-2.5 font-semibold text-green-400">{tt.wins}</td>
                <td className="text-center px-2 py-2.5 font-semibold text-red-400">{tt.losses}</td>
                <td className="text-center px-2 py-2.5 font-bold text-orange-400">{tt.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rounds */}
      <div className="xl:col-span-2 space-y-4">
        {roundNums.map(rNum => {
          const rm = matches.filter((m: any) => m.round === rNum);
          const done = rm.filter((m: any) => m.status === 'completed').length;
          return (
            <div key={rNum} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center justify-between">
                <span className="font-medium text-sm">Round {rNum}</span>
                <span className="text-xs text-slate-500">{done}/{rm.length} completed</span>
              </div>
              <div className="divide-y divide-[#2a2d3e]">
                {rm.map((match: any) => (
                  <RRRow key={match.id} match={match} isAdmin={isAdmin}
                    onStart={() => onStart(match)} onResult={() => onResult(match)}
                    onEdit={() => onEdit(match)} onCancel={() => onCancel(match.id)}
                    onReset={() => onReset(match.id)} onDelete={() => onDelete(match.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RRRow({ match: m, isAdmin, onStart, onResult, onEdit, onCancel, onReset, onDelete }: any) {
  const isCompleted = m.status === 'completed';
  const isLive      = m.status === 'live';
  const isCancelled = m.status === 'cancelled';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 flex-wrap ${isCancelled ? 'opacity-50' : ''}`}>
      {/* Teams */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <RRTeamChip team={m.team1} score={m.score1} isWinner={isCompleted && m.winnerId === m.team1Id} />
        <span className="text-slate-600 text-xs font-medium">vs</span>
        <RRTeamChip team={m.team2} score={m.score2} isWinner={isCompleted && m.winnerId === m.team2Id} />
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
        {isLive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
        {m.map && <span>{m.map}</span>}
        <span className={
          isLive      ? 'text-green-400 font-medium' :
          isCancelled ? 'text-red-400'   :
          isCompleted ? 'text-slate-600' : 'text-slate-500'
        }>{m.status}</span>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          {!isCompleted && !isCancelled && (
            <>
              {!isLive && <Btn onClick={onStart} icon={<Play size={10}/>} label="Launch" color="green" />}
              {m.team1Id && m.team2Id && <Btn onClick={onResult} icon={<CheckCircle size={10}/>} label="Result" color="orange" />}
              <Btn onClick={onEdit} icon={<Edit2 size={10}/>} label="Edit" color="slate" />
              <Btn onClick={onCancel} icon={<Ban size={10}/>} label="Cancel" color="red" />
            </>
          )}
          {(isCompleted || isCancelled) && <Btn onClick={onReset} icon={<RotateCcw size={10}/>} label="Reset" color="blue" />}
          <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors ml-1">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function RRTeamChip({ team, score, isWinner }: any) {
  if (!team) return <span className="text-slate-600 text-xs italic">TBD</span>;
  return (
    <span className={`flex items-center gap-1.5 text-sm ${isWinner ? 'text-orange-400 font-semibold' : 'text-slate-300'}`}>
      <span className="text-[10px] text-slate-500 w-7 shrink-0">[{team.tag}]</span>
      <span className="truncate max-w-[110px]">{team.name}</span>
      {score !== null && score !== undefined && (
        <span className={`font-bold tabular-nums ${isWinner ? 'text-white' : 'text-slate-500'}`}>{score}</span>
      )}
    </span>
  );
}
