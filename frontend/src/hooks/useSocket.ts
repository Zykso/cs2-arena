import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

export function useSocket() {
  const qc = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    socket = io('/', { withCredentials: true });

    socket.on('match:updated', () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
    });

    socket.on('match:live', () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
    });

    socket.on('bracket:updated', () => {
      qc.invalidateQueries({ queryKey: ['tournament'] });
    });

    socket.on('server:status', () => {
      qc.invalidateQueries({ queryKey: ['servers'] });
    });

    return () => {
      socket?.disconnect();
      socket = null;
      initialized.current = false;
    };
  }, [qc]);

  return socket;
}
