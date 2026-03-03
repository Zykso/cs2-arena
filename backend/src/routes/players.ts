import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

// Leaderboard
router.get('/leaderboard', async (_req: Request, res: Response) => {
  const stats = await prisma.playerMatchStat.groupBy({
    by: ['steamId'],
    _sum: { kills: true, deaths: true, assists: true, headshots: true },
    _avg: { rating: true, adr: true },
    _count: { matchId: true },
  });

  const enriched = await Promise.all(
    stats.map(async (s) => {
      const user = await prisma.user.findUnique({ where: { steamId: s.steamId } });
      return {
        steamId: s.steamId,
        displayName: user?.displayName,
        avatar: user?.avatar,
        matches: s._count.matchId,
        kills: s._sum.kills,
        deaths: s._sum.deaths,
        assists: s._sum.assists,
        headshots: s._sum.headshots,
        avgRating: s._avg.rating?.toFixed(2),
        avgAdr: s._avg.adr?.toFixed(1),
        kd: ((s._sum.kills || 0) / Math.max(s._sum.deaths || 1, 1)).toFixed(2),
      };
    })
  );

  enriched.sort((a, b) => parseFloat(String(b.avgRating || 0)) - parseFloat(String(a.avgRating || 0)));
  res.json(enriched);
});

// Get player profile
router.get('/:steamId', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { steamId: req.params.steamId },
    include: { playerSlots: { include: { team: true } } },
  });
  if (!user) return res.status(404).json({ error: 'Player not found' });

  const stats = await prisma.playerMatchStat.findMany({
    where: { steamId: req.params.steamId },
    include: { match: { include: { tournament: true, team1: true, team2: true, winner: true } } },
    orderBy: { match: { completedAt: 'desc' } },
  });

  res.json({ user, stats });
});

export default router;
