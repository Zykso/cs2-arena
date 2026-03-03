import Rcon from 'rcon-srcds';

interface RconResult {
  success: boolean;
  response?: string;
  error?: string;
}

// Reuse connections to avoid repeated auth attempts triggering CS2 ban
const connections = new Map<string, any>();

function getKey(host: string, port: number) {
  return `${host}:${port}`;
}

async function getConnection(host: string, port: number, password: string) {
  const key = getKey(host, port);
  if (connections.has(key)) return connections.get(key);

  const rcon = new Rcon({ host, port, timeout: 5000 });
  await rcon.authenticate(password);
  connections.set(key, rcon);
  return rcon;
}

function dropConnection(host: string, port: number) {
  const key = getKey(host, port);
  try { connections.get(key)?.disconnect(); } catch {}
  connections.delete(key);
}

export async function sendRconCommand(host: string, port: number, password: string, command: string): Promise<RconResult> {
  try {
    const rcon = await getConnection(host, port, password);
    const response = await rcon.execute(command);
    return { success: true, response: typeof response === 'string' ? response : String(response) };
  } catch (err: any) {
    // Drop stale connection and retry once
    dropConnection(host, port);
    try {
      const rcon = await getConnection(host, port, password);
      const response = await rcon.execute(command);
      return { success: true, response: typeof response === 'string' ? response : String(response) };
    } catch (retryErr: any) {
      dropConnection(host, port);
      return { success: false, error: retryErr.message };
    }
  }
}

export async function getServerStatus(host: string, port: number, password: string) {
  const result = await sendRconCommand(host, port, password, 'status');
  if (!result.success) return null;

  const lines = (result.response || '').split('\n');
  const mapLine = lines.find(l => l.includes('map     :'));
  const map = mapLine ? mapLine.split(':')[1]?.trim().split(' ')[0] : 'unknown';
  const playerLines = lines.filter(l => /^\d+\s+\d+/.test(l));

  return {
    map,
    playerCount: playerLines.length,
    players: playerLines.map(l => {
      const parts = l.trim().split(/\s+/);
      return { userid: parts[0], name: parts[2], ping: parts[4] };
    }),
    raw: result.response,
  };
}
