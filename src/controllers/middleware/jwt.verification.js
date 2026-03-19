import jwt from 'jsonwebtoken';

/** Verifies JWT and sets `req.user` to the payload (`userId`, `type`, …). */
export const jwtVerification = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Use after `jwtVerification`. Only allows `type === 'admin'`. */
export const requireAdmin = (req, res, next) => {
  if (req.user?.type !== 'admin') {
    return res.status(403).json({ error: 'You are not an admin' });
  }
  next();
};

/** Use after `jwtVerification`. Only allows `type === 'thinker'`. */
export const requireThinker = (req, res, next) => {
  if (req.user?.type !== 'thinker') {
    return res.status(403).json({ error: 'You are not a thinker' });
  }
  next();
};
