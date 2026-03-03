import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, Swords, BarChart3, Server, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../api';

const navItems = [
  { to: '/', label: 'Home', icon: Trophy },
  { to: '/tournaments', label: 'Tournaments', icon: Swords },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { to: '/servers', label: 'Servers', icon: Server },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2a2d3e] bg-[#0f1117]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-orange-500 text-lg mr-4">
          <Trophy size={22} />
          CS2 Arena
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${pathname === to
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${pathname === '/admin'
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              <Shield size={16} />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                {user.avatar && <img src={user.avatar} className="w-8 h-8 rounded-full" alt="" />}
                <span className="text-sm text-slate-300">{user.displayName}</span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <a
              href={auth.loginUrl}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Login with Steam
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
