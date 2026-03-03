import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { advanceWinner } from '../services/bracket';

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

export default router;
