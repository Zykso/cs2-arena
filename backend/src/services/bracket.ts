import { prisma } from './prisma';

// Generate single elimination bracket
export async function generateSingleElimination(tournamentId: string) {
  const tournamentTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    include: { team: true },
    orderBy: { seed: 'asc' },
  });

  const teams = tournamentTeams.map(tt => tt.team);
  const numTeams = teams.length;

  // Pad to next power of 2
  const bracket: (typeof teams[0] | null)[] = [...teams];
  while (bracket.length & (bracket.length - 1)) bracket.push(null);

  const rounds = Math.log2(bracket.length);
  const matches = [];

  for (let i = 0; i < bracket.length; i += 2) {
    const roundName = getRoundName(rounds, 1, bracket.length / 2);
    matches.push(await prisma.match.create({
      data: {
        tournamentId,
        team1Id: bracket[i]?.id ?? null,
        team2Id: bracket[i + 1]?.id ?? null,
        status: bracket[i] && bracket[i + 1] ? 'scheduled' : 'bye',
        round: 1,
        roundName,
        bracketSide: 'upper',
      },
    }));
  }
  return matches;
}

// Generate round robin matches
export async function generateRoundRobin(tournamentId: string) {
  const tournamentTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    include: { team: true },
  });

  const teams = tournamentTeams.map(tt => tt.team);
  const matches = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push(await prisma.match.create({
        data: {
          tournamentId,
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          status: 'scheduled',
          round: 1,
          roundName: 'Group Stage',
        },
      }));
    }
  }
  return matches;
}

function getRoundName(totalRounds: number, currentRound: number, matchesInRound: number): string {
  if (matchesInRound === 1) return 'Grand Final';
  if (matchesInRound === 2) return 'Semi Final';
  if (matchesInRound === 4) return 'Quarter Final';
  return `Round of ${matchesInRound * 2}`;
}

// After a match completes, advance winner to next round
export async function advanceWinner(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !match.winnerId || !match.round) return;

  // Find the next round match for this tournament
  const nextRound = match.round + 1;
  const completedInRound = await prisma.match.findMany({
    where: { tournamentId: match.tournamentId, round: match.round, status: 'completed' },
  });

  const allInRound = await prisma.match.findMany({
    where: { tournamentId: match.tournamentId, round: match.round },
  });

  if (completedInRound.length === allInRound.length) {
    // All matches in this round done - create next round if not exists
    const nextRoundMatches = await prisma.match.findMany({
      where: { tournamentId: match.tournamentId, round: nextRound },
    });

    const winners = completedInRound.map(m => m.winnerId).filter(Boolean) as string[];

    if (nextRoundMatches.length === 0 && winners.length > 1) {
      for (let i = 0; i < winners.length; i += 2) {
        const numMatchesInNextRound = winners.length / 2;
        await prisma.match.create({
          data: {
            tournamentId: match.tournamentId,
            team1Id: winners[i],
            team2Id: winners[i + 1] ?? null,
            status: 'scheduled',
            round: nextRound,
            roundName: getRoundName(0, nextRound, numMatchesInNextRound),
            bracketSide: 'upper',
          },
        });
      }
    } else if (winners.length === 1) {
      // Tournament over
      await prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: 'completed' },
      });
    }
  }
}
