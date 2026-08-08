export function login(req, res) {
  if (req.body?.passcode !== process.env.ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'invalid passcode' });
  }
  res.cookie('session', 'ok', {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/',
  });
  res.json({ ok: true });
}

export function logout(req, res) {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
}

export function session(req, res) {
  res.json({ authenticated: req.signedCookies?.session === 'ok' });
}

export function requireAuth(req, res, next) {
  if (req.signedCookies?.session === 'ok') return next();
  return res.status(401).json({ error: 'unauthorized' });
}
