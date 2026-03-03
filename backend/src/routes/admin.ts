import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(users);
});

router.put('/users/:id/role', async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!['user', 'admin', 'superadmin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  res.json(user);
});

export default router;
