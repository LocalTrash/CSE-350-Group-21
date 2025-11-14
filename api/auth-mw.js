import jwt from 'jsonwebtoken';

export function authRequired(req, res, next){
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email }
    next();
  }catch(e){ return res.status(401).json({ error: 'Invalid token' }); }
}

export function signToken(user){
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}