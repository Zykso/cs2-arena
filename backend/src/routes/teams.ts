import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const teams = await prisma.team.findMany({
    include: {
      owner: true,
      players: { include: { user: true } },
      _count: { select: { matchesAsTeam1: true, matchesAsTeam2: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(teams);
});

// Get team by invite code — must be before /:id to avoid being swallowed
router.get('/invite/:code', async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({
    where: { inviteCode: req.params.code },
    include: { owner: true, players: { include: { user: true } } },
  });
  if (!team) return res.status(404).json({ error: 'Invalid invite link' });
  res.json(team);
});

router.get('/:id', async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: {
      owner: true,
      players: { include: { user: true } },
      tournaments: { include: { tournament: true } },
    },
  });
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

router.post('/', async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { name, tag, logo } = req.body;
  const team = await prisma.team.create({
    data: {
      name,
      tag: tag.toUpperCase().slice(0, 5),
      logo,
      ownerId: user.id,
      players: { create: { userId: user.id, role: 'captain' } },
    },
    include: { players: { include: { user: true } } },
  });
  res.json(team);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, tag, logo } = req.body;
  const team = await prisma.team.update({
    where: { id: req.params.id },
    data: { name, tag: tag?.toUpperCase().slice(0, 5), logo },
  });
  res.json(team);
});

// Add player to team
router.post('/:id/players', async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  const player = await prisma.teamPlayer.create({
    data: { teamId: req.params.id, userId, role: role || 'player' },
    include: { user: true },
  });
  res.json(player);
});

// Remove player from team
router.delete('/:id/players/:userId', async (req: Request, res: Response) => {
  await prisma.teamPlayer.deleteMany({
    where: { teamId: req.params.id, userId: req.params.userId },
  });
  res.json({ success: true });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.team.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Join team via invite code
router.post('/invite/:code/join', async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'You must be logged in to join a team' });

  const team = await prisma.team.findUnique({ where: { inviteCode: req.params.code } });
  if (!team) return res.status(404).json({ error: 'Invalid invite link' });

  const existing = await prisma.teamPlayer.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
  });
  if (existing) return res.status(400).json({ error: 'You are already on this team' });

  await prisma.teamPlayer.create({
    data: { teamId: team.id, userId: user.id, role: 'player' },
  });

  res.json({ success: true, teamId: team.id, teamName: team.name });
});

// Regenerate invite code
router.post('/:id/invite/reset', async (req: Request, res: Response) => {
  const { v4: uuidv4 } = await import('uuid');
  const team = await prisma.team.update({
    where: { id: req.params.id },
    data: { inviteCode: uuidv4() },
  });
  res.json({ inviteCode: team.inviteCode });
});

export default router;
