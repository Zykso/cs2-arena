import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp } from 'lucide-react';
import { players } from '../api';

export default function Leaderboard() {
  const { data: board = [], isLoading } = useQuery({ queryKey: ['leaderboard'], queryFn: players.leaderboard });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-8"><BarChart3 className="text-orange-500" /> Leaderboard</h1>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Loading...</div>
      ) : board.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No stats yet. Play some matches!</div>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3e] text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-center px-4 py-3">Matches</th>
                <th className="text-center px-4 py-3">K/D</th>
                <th className="text-center px-4 py-3">Kills</th>
                <th className="text-center px-4 py-3">Deaths</th>
                <th className="text-center px-4 py-3">ADR</th>
                <th className="text-center px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {board.map((p: any, i: number) => (
                <tr key={p.steamId} className={`border-b border-[#2a2d3e]/50 hover:bg-white/2 transition-colors ${i < 3 ? 'bg-orange-500/3' : ''}`}>
                  <td className="px-4 py-3 text-slate-500 font-mono">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.avatar && <img src={p.avatar} className="w-7 h-7 rounded-full" alt="" />}
                      <span className="font-medium">{p.displayName || p.steamId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400">{p.matches}</td>
                  <td className="px-4 py-3 text-center font-medium">
                    <span className={parseFloat(p.kd) >= 1 ? 'text-green-400' : 'text-red-400'}>{p.kd}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300">{p.kills}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{p.deaths}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{p.avgAdr}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <TrendingUp size={13} className={parseFloat(p.avgRating) >= 1 ? 'text-green-400' : 'text-red-400'} />
                      <span className="font-bold">{p.avgRating}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
