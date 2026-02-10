// src/middleware/rbac.js
// Contrôle d'accès basé sur les rôles (Role-Based Access Control)
//
// Rôles : ETUDIANT | PROMOTEUR | ADMIN
// Hiérarchie : ADMIN > PROMOTEUR > ETUDIANT

const ROLES = {
  ETUDIANT: 1,
  PROMOTEUR: 2,
  ADMIN: 3,
};

/**
 * Autorise uniquement les rôles listés.
 * @param {...string} roles - Rôles autorisés (ex: 'ADMIN', 'PROMOTEUR')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erreur: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        erreur: 'Accès refusé',
        message: `Cette action requiert le rôle : ${roles.join(' ou ')}`,
      });
    }
    next();
  };
}

/**
 * Autorise les rôles avec un niveau supérieur ou égal au rôle minimum.
 * @param {string} minRole - Rôle minimum requis
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erreur: 'Non authentifié' });
    }
    const userLevel = ROLES[req.user.role] || 0;
    const requiredLevel = ROLES[minRole] || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        erreur: 'Accès refusé',
        message: `Cette action requiert au moins le rôle : ${minRole}`,
      });
    }
    next();
  };
}

/**
 * Autorise si l'utilisateur est admin OU si la condition est remplie.
 * Utile pour "admin ou propriétaire de la ressource".
 * @param {Function} condition - (req) => boolean
 */
function requireAdminOr(condition) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erreur: 'Non authentifié' });
    }
    if (req.user.role === 'ADMIN' || condition(req)) {
      return next();
    }
    return res.status(403).json({ erreur: 'Accès refusé' });
  };
}

module.exports = { requireRole, requireMinRole, requireAdminOr, ROLES };
