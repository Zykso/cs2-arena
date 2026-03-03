import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { generateSingleElimination, generateRoundRobin } from '../services/bracket';

const router = Router();

// Get all tournaments
router.get('/', async (_req: Request, res: Response) => {
  const tournaments = await prisma.tournament.findMany({
    include: { teams: { include: { team: true } }, _count: { select: { matches: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tournaments);
});

// Get single tournament
router.get('/:id', async (req: Request, res: Response) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: req.params.id },
    include: {
      teams: { include: { team: { include: { players: { include: { user: true } } } } } },
      matches: {
        include: { team1: true, team2: true, winner: true },
        orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  res.json(tournament);
});

// Create tournament (admin only)
router.post('/', async (req: Request, res: Response) => {
  const { name, description, format, maxTeams, mapPool, startDate, endDate } = req.body;
  const tournament = await prisma.tournament.create({
    data: {
      name,
      description,
      format,
      maxTeams: maxTeams || 16,
      mapPool: JSON.stringify(mapPool || []),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  res.json(tournament);
});

// Update tournament
router.put('/:id', async (req: Request, res: Response) => {
  const { name, description, format, maxTeams, mapPool, startDate, endDate, status } = req.body;
  const tournament = await prisma.tournament.update({
    where: { id: req.params.id },
    data: {
      name,
      description,
      format,
      status,
      maxTeams,
      mapPool: mapPool ? JSON.stringify(mapPool) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });
  res.json(tournament);
});

// Register team to tournament
router.post('/:id/register', async (req: Request, res: Response) => {
  const { teamId } = req.body;
  const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const count = await prisma.tournamentTeam.count({ where: { tournamentId: req.params.id } });
  if (count >= tournament.maxTeams) return res.status(400).json({ error: 'Tournament is full' });

  const entry = await prisma.tournamentTeam.create({
    data: { tournamentId: req.params.id, teamId },
    include: { team: true },
  });
  res.json(entry);
});

// Remove team from tournament
router.delete('/:id/register/:teamId', async (req: Request, res: Response) => {
  await prisma.tournamentTeam.deleteMany({
    where: { tournamentId: req.params.id, teamId: req.params.teamId },
  });
  res.json({ success: true });
});

// Generate bracket
router.post('/:id/generate-bracket', async (req: Request, res: Response) => {
  const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
  if (!tournament) return res.status(404).json({ error: 'Not found' });

  let matches;
  if (tournament.format === 'round_robin') {
    matches = await generateRoundRobin(req.params.id);
  } else {
    matches = await generateSingleElimination(req.params.id);
  }

  await prisma.tournament.update({ where: { id: req.params.id }, data: { status: 'ongoing' } });
  const io = req.app.get('io');
  io.emit('bracket:updated', { tournamentId: req.params.id });

  res.json({ matches });
});

// Delete tournament
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.tournament.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
