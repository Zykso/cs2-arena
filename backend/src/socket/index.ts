import { Server } from 'socket.io';
import { getServerStatus } from '../services/rcon';
import { prisma } from '../services/prisma';

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join:tournament', (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on('leave:tournament', (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // Poll server statuses every 30 seconds
  setInterval(async () => {
    const servers = await prisma.server.findMany();
    for (const server of servers) {
      const status = await getServerStatus(server.host, server.rconPort, server.rconPassword);
      const newStatus = status ? 'online' : 'offline';
      if (server.status !== newStatus || (status && server.currentMap !== status.map)) {
        await prisma.server.update({
          where: { id: server.id },
          data: {
            status: newStatus,
            currentMap: status?.map,
            playerCount: status?.playerCount || 0,
          },
        });
        io.emit('server:status', { serverId: server.id, status: newStatus, ...status });
      }
    }
  }, 30000);
}
