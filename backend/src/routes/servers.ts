import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { sendRconCommand, getServerStatus } from '../services/rcon';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const servers = await prisma.server.findMany();
  res.json(servers);
});

router.post('/', async (req: Request, res: Response) => {
  const { name, host, rconPort, rconPassword, gamePort } = req.body;
  const server = await prisma.server.create({
    data: { name, host, rconPort: rconPort || 27015, rconPassword, gamePort: gamePort || 27015 },
  });
  res.json(server);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, host, rconPort, rconPassword, gamePort } = req.body;
  const server = await prisma.server.update({
    where: { id: req.params.id },
    data: { name, host, rconPort, rconPassword, gamePort },
  });
  res.json(server);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.server.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Get live status
router.get('/:id/status', async (req: Request, res: Response) => {
  const server = await prisma.server.findUnique({ where: { id: req.params.id } });
  if (!server) return res.status(404).json({ error: 'Not found' });

  const status = await getServerStatus(server.host, server.rconPort, server.rconPassword);
  if (!status) {
    await prisma.server.update({ where: { id: req.params.id }, data: { status: 'offline' } });
    return res.json({ status: 'offline' });
  }

  await prisma.server.update({
    where: { id: req.params.id },
    data: { status: 'online', currentMap: status.map, playerCount: status.playerCount },
  });

  res.json({ status: 'online', ...status });
});

// Send RCON command
router.post('/:id/rcon', async (req: Request, res: Response) => {
  const { command } = req.body;
  const server = await prisma.server.findUnique({ where: { id: req.params.id } });
  if (!server) return res.status(404).json({ error: 'Not found' });

  const result = await sendRconCommand(server.host, server.rconPort, server.rconPassword, command);
  res.json(result);
});

// Change map
router.post('/:id/map', async (req: Request, res: Response) => {
  const { map } = req.body;
  const server = await prisma.server.findUnique({ where: { id: req.params.id } });
  if (!server) return res.status(404).json({ error: 'Not found' });

  const result = await sendRconCommand(server.host, server.rconPort, server.rconPassword, `changelevel ${map}`);
  res.json(result);
});

// Start a match via MatchZy
router.post('/:id/start-match', async (req: Request, res: Response) => {
  const { team1Name, team2Name, map, matchId } = req.body;
  const server = await prisma.server.findUnique({ where: { id: req.params.id } });
  if (!server) return res.status(404).json({ error: 'Not found' });

  const commands = [
    `changelevel ${map}`,
    `matchzy_team1_name "${team1Name}"`,
    `matchzy_team2_name "${team2Name}"`,
    `matchzy_match_id "${matchId}"`,
    `matchzy_loadmatch`,
  ];

  const results = [];
  for (const cmd of commands) {
    const r = await sendRconCommand(server.host, server.rconPort, server.rconPassword, cmd);
    results.push({ cmd, ...r });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  res.json({ results });
});

export default router;
