// src/middleware/auth.js
// Middleware d'authentification JWT

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'thesismatch-dev-secret-CHANGE-IN-PRODUCTION';

/**
 * Vérifie le token JWT dans l'en-tête Authorization.
 * Ajoute req.user = { id, email, role } si valide.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Token manquant ou invalide' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erreur: 'Token expiré, veuillez vous reconnecter' });
    }
    return res.status(401).json({ erreur: 'Token invalide' });
  }
}

/**
 * Génère un token JWT pour un utilisateur.
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authenticate, generateToken };
