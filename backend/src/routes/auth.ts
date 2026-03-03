import { Router } from 'express';
import passport from 'passport';

const router = Router();

router.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }));

router.get('/steam/return',
  passport.authenticate('steam', { failureRedirect: `${process.env.CLIENT_URL}/?auth=failed` }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?auth=success`);
  }
);

router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

router.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

export default router;
