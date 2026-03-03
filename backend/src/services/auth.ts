import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { prisma } from './prisma';

export function setupPassport() {
  passport.use(new SteamStrategy(
    {
      returnURL: `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:3001'}/api/auth/steam/return`,
      realm: process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:3001',
      apiKey: process.env.STEAM_API_KEY || '',
    },
    async (_identifier: string, profile: any, done: Function) => {
      try {
        const steamId = profile.id;
        const user = await prisma.user.upsert({
          where: { steamId },
          update: {
            displayName: profile.displayName,
            avatar: profile.photos?.[2]?.value || profile.photos?.[0]?.value,
          },
          create: {
            steamId,
            displayName: profile.displayName,
            avatar: profile.photos?.[2]?.value || profile.photos?.[0]?.value,
            role: 'user',
          },
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}
