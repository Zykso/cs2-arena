import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { advanceWinner } from '../services/bracket';
import { sendRconCommand } from '../services/rcon';

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { tournamentId, status } = req.query;
  const matches = await prisma.match.findMany({
    where: {
      ...(tournamentId ? { tournamentId: String(tournamentId) } : {}),
      ...(status ? { status: String(status) } : {}),
    },
    include: { team1: true, team2: true, winner: true, tournament: true },
    orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(matches);
});

router.get('/:id', async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      team1: { include: { players: { include: { user: true } } } },
      team2: { include: { players: { include: { user: true } } } },
      winner: true,
      tournament: true,
      stats: true,
    },
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

// Update match result
router.put('/:id/result', async (req: Request, res: Response) => {
  const { score1, score2, winnerId, map, status } = req.body;

  const match = await prisma.match.update({
    where: { id: req.params.id },
    data: {
      score1,
      score2,
      winnerId,
      map,
      status: status || 'completed',
      completedAt: status === 'completed' ? new Date() : undefined,
    },
    include: { team1: true, team2: true, winner: true },
  });

  // Update TournamentTeam standings
  if (match.status === 'completed' && match.team1Id && match.team2Id) {
    const isTeam1Winner = match.winnerId === match.team1Id;
    await prisma.tournamentTeam.updateMany({
      where: { tournamentId: match.tournamentId, teamId: match.team1Id },
      data: isTeam1Winner ? { wins: { increment: 1 }, points: { increment: 3 } } : { losses: { increment: 1 } },
    });
    await prisma.tournamentTeam.updateMany({
      where: { tournamentId: match.tournamentId, teamId: match.team2Id },
      data: !isTeam1Winner ? { wins: { increment: 1 }, points: { increment: 3 } } : { losses: { increment: 1 } },
    });
    await advanceWinner(match.id);
  }

  const io = req.app.get('io');
  io.emit('match:updated', match);

  res.json(match);
});

// Set match as live
router.put('/:id/start', async (req: Request, res: Response) => {
  const match = await prisma.match.update({
    where: { id: req.params.id },
    data: { status: 'live', startedAt: new Date() },
    include: { team1: true, team2: true },
  });
  const io = req.app.get('io');
  io.emit('match:live', match);
  res.json(match);
});

// Update match schedule & server
router.put('/:id', async (req: Request, res: Response) => {
  const { scheduledAt, serverId, map } = req.body;
  const match = await prisma.match.update({
    where: { id: req.params.id },
    data: {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      serverId,
      map,
    },
  });
  res.json(match);
});

// Cancel a match
router.put('/:id/cancel', async (req: Request, res: Response) => {
  const match = await prisma.match.update({
    where: { id: req.params.id },
    data: { status: 'cancelled', completedAt: new Date() },
    include: { team1: true, team2: true },
  });
  const io = req.app.get('io');
  io.emit('match:updated', match);
  res.json(match);
});

// Reset a match back to scheduled
router.put('/:id/reset', async (req: Request, res: Response) => {
  const match = await prisma.match.update({
    where: { id: req.params.id },
    data: { status: 'scheduled', startedAt: null, completedAt: null, score1: null, score2: null, winnerId: null },
    include: { team1: true, team2: true },
  });
  const io = req.app.get('io');
  io.emit('match:updated', match);
  res.json(match);
});

// Delete a match
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.match.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Submit player stats
router.post('/:id/stats', async (req: Request, res: Response) => {
  const { stats } = req.body; // Array of { steamId, kills, deaths, assists, adr, rating, headshots }
  const created = await Promise.all(
    stats.map((s: any) =>
      prisma.playerMatchStat.upsert({
        where: { matchId_steamId: { matchId: req.params.id, steamId: s.steamId } },
        update: s,
        create: { matchId: req.params.id, ...s },
      })
    )
  );
  res.json(created);
});

// Public — MatchZy fetches this to load the match config. No auth middleware.
router.get('/:id/matchzy-config', async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      team1: { include: { players: { include: { user: true } } } },
      team2: { include: { players: { include: { user: true } } } },
    },
  });
  if (!match) return res.status(404).json({ error: 'Not found' });

  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const bo = match.bo ?? 1;
  const maplist = match.map ? [match.map] : ['de_mirage'];

  const buildPlayers = (team: any, exclude: Set<string> = new Set()): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const slot of team?.players ?? []) {
      const sid = slot.user?.steamId;
      if (sid && !exclude.has(sid)) out[sid] = slot.user.displayName ?? 'Player';
    }
    return out;
  };

  // Build team1 players first, then exclude those SteamIDs from team2
  // to prevent MatchZy rejecting the config when the same player appears in both teams.
  const team1Players = buildPlayers(match.team1);
  const team2Players = buildPlayers(match.team2, new Set(Object.keys(team1Players)));

  // MatchZy requires matchid to be a JSON integer (validated with int.TryParse, cast to long).
  // Derive a stable positive 32-bit integer from the first 8 hex chars of the UUID.
  const numericMatchId = parseInt(match.id.replace(/-/g, '').slice(0, 8), 16) % 2147483647;

  res.json({
    matchid: numericMatchId,
    team1: { name: match.team1?.name ?? 'Team 1', tag: match.team1?.tag ?? 'T1', players: team1Players },
    team2: { name: match.team2?.name ?? 'Team 2', tag: match.team2?.tag ?? 'T2', players: team2Players },
    num_maps: bo,
    maplist,
    map_sides: maplist.map(() => 'knife'),
    clinch_series: true,
    cvars: {
      matchzy_remote_log_url: `${apiUrl}/api/webhooks/matchzy`,
      mp_maxrounds: '24',
      mp_overtime_enable: '1',
    },
  });
});

// Admin — launch a match on a CS2 server via RCON
router.post('/:id/launch', requireAdmin, async (req: any, res: Response) => {
  const { serverId, map, bo } = req.body;
  if (!serverId || !map || !bo) return res.status(400).json({ error: 'serverId, map, bo required' });

  const [match, server] = await Promise.all([
    prisma.match.findUnique({ where: { id: req.params.id } }),
    prisma.server.findUnique({ where: { id: serverId } }),
  ]);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (!server) return res.status(404).json({ error: 'Server not found' });

  // Persist before RCON so config endpoint returns correct data immediately
  await prisma.match.update({ where: { id: req.params.id }, data: { serverId, map, bo } });

  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const rconResult = await sendRconCommand(
    server.host, server.rconPort, server.rconPassword,
    `matchzy_loadmatch_url "${apiUrl}/api/matches/${req.params.id}/matchzy-config"`
  );
  if (!rconResult.success) return res.status(502).json({ error: 'RCON failed', detail: rconResult.error });

  const [updatedMatch] = await Promise.all([
    prisma.match.update({
      where: { id: req.params.id },
      data: { status: 'live', startedAt: new Date() },
      include: { team1: true, team2: true },
    }),
    prisma.server.update({ where: { id: serverId }, data: { status: 'in_use', currentMap: map } }),
  ]);

  req.app.get('io').emit('match:live', updatedMatch);
  res.json({ success: true, match: updatedMatch });
});

export default router;
