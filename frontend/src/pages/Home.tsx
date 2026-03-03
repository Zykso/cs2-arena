import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Users, Swords, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { tournaments } from '../api';

const statusIcon: Record<string, any> = {
  upcoming: Clock,
  registration: Users,
  ongoing: PlayCircle,
  completed: CheckCircle,
};

const statusColor: Record<string, string> = {
  upcoming: 'text-slate-400 bg-slate-400/10',
  registration: 'text-blue-400 bg-blue-400/10',
  ongoing: 'text-green-400 bg-green-400/10',
  completed: 'text-slate-500 bg-slate-500/10',
};

export default function Home() {
  const { data: tournamentList = [] } = useQuery({ queryKey: ['tournaments'], queryFn: tournaments.list });
  const active = tournamentList.filter((t: any) => t.status === 'ongoing' || t.status === 'registration');
  const upcoming = tournamentList.filter((t: any) => t.status === 'upcoming');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-12 text-center py-16 rounded-2xl bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border border-orange-500/20">
        <div className="flex justify-center mb-4">
          <Trophy size={48} className="text-orange-500" />
        </div>
        <h1 className="text-4xl font-bold mb-3">CS2 Arena</h1>
        <p className="text-slate-400 text-lg mb-6">The complete CS2 tournament platform</p>
        <div className="flex justify-center gap-4">
          <Link to="/tournaments" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors">
            Browse Tournaments
          </Link>
          <Link to="/teams" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl font-medium transition-colors border border-white/10">
            View Teams
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { label: 'Total Tournaments', value: tournamentList.length, icon: Trophy },
          { label: 'Active Now', value: active.length, icon: PlayCircle },
          { label: 'Upcoming', value: upcoming.length, icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Icon size={22} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Tournaments */}
      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Swords size={20} className="text-orange-500" /> Active Tournaments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((t: any) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        </section>
      )}

      {/* All Tournaments */}
      <section>
        <h2 className="text-xl font-bold mb-4">All Tournaments</h2>
        {tournamentList.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            No tournaments yet. Admins can create one from the Tournaments page.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournamentList.map((t: any) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function TournamentCard({ tournament: t }: { tournament: any }) {
  const Icon = statusIcon[t.status] || Clock;
  const color = statusColor[t.status] || statusColor.upcoming;
  const formatLabel: Record<string, string> = {
    single_elimination: 'Single Elim',
    double_elimination: 'Double Elim',
    round_robin: 'Round Robin',
    swiss: 'Swiss',
  };

  return (
    <Link to={`/tournaments/${t.id}`} className="block bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 hover:border-orange-500/40 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">{t.name}</h3>
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${color}`}>
          <Icon size={11} />
          {t.status}
        </span>
      </div>
      {t.description && <p className="text-slate-500 text-sm mb-3 line-clamp-2">{t.description}</p>}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Users size={12} />{t.teams.length}/{t.maxTeams}</span>
        <span className="px-2 py-0.5 bg-white/5 rounded">{formatLabel[t.format] || t.format}</span>
        {t.startDate && <span>{new Date(t.startDate).toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}
