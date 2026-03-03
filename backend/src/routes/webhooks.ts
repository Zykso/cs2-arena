import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { advanceWinner } from '../services/bracket';

const router = Router();

// MatchZy POSTs to /api/webhooks/matchzy/:matchUuid so we always have the real DB id,
// regardless of what numeric matchid MatchZy echoes back in the payload.
router.post('/matchzy/:matchId', async (req: Request, res: Response) => {
  res.json({ ok: true }); // Respond immediately; MatchZy has a short timeout

  const payload = req.body;
  if (!payload?.event) return;

  const event: string = payload.event;
  const matchId: string = req.params.matchId; // real UUID from URL
  console.log(`[MatchZy] event=${event} matchId=${matchId}`);

  try {
    if (event.includes('series_start')) {
      await prisma.match.updateMany({
        where: { id: matchId, status: 'scheduled' },
        data: { status: 'live', startedAt: new Date() },
      });
      const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team1: true, team2: true } });
      req.app.get('io').emit('match:live', match);

    } else if (event.includes('series_end')) {
      const score1: number = payload.team1_series_score ?? 0;
      const score2: number = payload.team2_series_score ?? 0;
      const winnerName: string | undefined = payload.winner?.name;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { team1: true, team2: true },
      });
      if (!match) { console.error(`[MatchZy] unknown matchId=${matchId}`); return; }

      let winnerId: string | null = null;
      if (winnerName) {
        if (match.team1?.name === winnerName) winnerId = match.team1Id ?? null;
        else if (match.team2?.name === winnerName) winnerId = match.team2Id ?? null;
      } else {
        if (score1 > score2) winnerId = match.team1Id ?? null;
        else if (score2 > score1) winnerId = match.team2Id ?? null;
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { score1, score2, winnerId, status: 'completed', completedAt: new Date() },
        include: { team1: true, team2: true, winner: true },
      });

      // Update TournamentTeam standings
      if (match.team1Id && match.team2Id && winnerId) {
        const t1wins = winnerId === match.team1Id;
        await Promise.all([
          prisma.tournamentTeam.updateMany({
            where: { tournamentId: match.tournamentId, teamId: match.team1Id },
            data: t1wins ? { wins: { increment: 1 }, points: { increment: 3 } } : { losses: { increment: 1 } },
          }),
          prisma.tournamentTeam.updateMany({
            where: { tournamentId: match.tournamentId, teamId: match.team2Id },
            data: !t1wins ? { wins: { increment: 1 }, points: { increment: 3 } } : { losses: { increment: 1 } },
          }),
        ]);
      }

      // Free the server
      if (match.serverId) {
        await prisma.server.update({ where: { id: match.serverId }, data: { status: 'online' } });
      }

      await advanceWinner(matchId);

      const io = req.app.get('io');
      io.emit('match:updated', updated);
      io.emit('bracket:updated', { tournamentId: match.tournamentId });
    }
  } catch (err: any) {
    console.error('[MatchZy webhook] error:', err?.message ?? err);
  }
});

export default router;
