import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Leaderboard from './pages/Leaderboard';
import Servers from './pages/Servers';
import Admin from './pages/Admin';
import JoinTeam from './pages/JoinTeam';
import { useSocket } from './hooks/useSocket';

const queryClient = new QueryClient();

function AppInner() {
  useSocket();
  return (
    <BrowserRouter>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/join/:code" element={<JoinTeam />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
