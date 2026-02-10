// src/routes/promoteurs.js
// CRUD promoteurs + mise à jour quota

const express = require('express');
const { stores } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireAdminOr } = require('../middleware/rbac');

const router = express.Router();

/** Parse les domaines (JSON string → array) */
function parseDomaines(domaines) {
  if (Array.isArray(domaines)) return domaines;
  if (typeof domaines === 'string') {
    try { return JSON.parse(domaines); } catch { return []; }
  }
  return [];
}

/** Formater un promoteur pour la réponse (domaines en array) */
function formatPromoteur(p) {
  return {
    ...p,
    domaines: parseDomaines(p.domaines),
    tauxRemplissage: p.quotaMax > 0
      ? Math.round((p.quotaActuel / p.quotaMax) * 100)
      : 0,
  };
}

// ─────────────────────────────────────────────
// GET /api/promoteurs
// Liste tous les promoteurs (utilisateurs authentifiés)
// ─────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { disponible, domaine } = req.query;
    let promoteurs = await stores.promoteurs.findAll();

    if (disponible !== undefined) {
      const dispo = disponible === 'true';
      promoteurs = promoteurs.filter(p => p.disponible === dispo);
    }

    if (domaine) {
      const recherche = domaine.toLowerCase().trim();
      promoteurs = promoteurs.filter(p => {
        const domaines = parseDomaines(p.domaines);
        return domaines.some(d => d.toLowerCase().includes(recherche));
      });
    }

    res.json({
      total: promoteurs.length,
      promoteurs: promoteurs.map(formatPromoteur),
    });
  } catch (err) {
    console.error('[promoteurs/GET]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/promoteurs/:id
// ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const promoteur = await stores.promoteurs.findById(req.params.id);
    if (!promoteur) {
      return res.status(404).json({ erreur: 'Promoteur introuvable' });
    }

    // Étudiants supervisés
    const etudiants = await stores.etudiants.findAll(e => e.promoteurId === promoteur.id);

    res.json({
      ...formatPromoteur(promoteur),
      etudiants: etudiants.map(e => ({
        id: e.id,
        nom: e.nom,
        prenom: e.prenom,
        titreMémoire: e.titreMémoire || null,
        etapeActuelle: e.etapeActuelle,
        statut: e.statut,
      })),
    });
  } catch (err) {
    console.error('[promoteurs/GET:id]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/promoteurs
// Admin uniquement
// Corps : { nom, prenom, email, domaines[], quotaMax, disponible?, biographie? }
// ─────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { nom, prenom, email, domaines, quotaMax, disponible, biographie } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ erreur: 'Champs requis : nom, prenom, email' });
    }

    const existant = await stores.promoteurs.findOne(p => p.email === email.toLowerCase());
    if (existant) {
      return res.status(409).json({ erreur: 'Un promoteur avec cet email existe déjà' });
    }

    const promoteur = await stores.promoteurs.create({
      nom,
      prenom,
      email: email.toLowerCase(),
      domaines: JSON.stringify(Array.isArray(domaines) ? domaines : []),
      quotaMax: parseInt(quotaMax) || 10,
      quotaActuel: 0,
      disponible: disponible !== false,
      biographie: biographie || null,
    });

    res.status(201).json({
      message: 'Promoteur créé avec succès',
      promoteur: formatPromoteur(promoteur),
    });
  } catch (err) {
    console.error('[promoteurs/POST]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/promoteurs/:id
// Admin ou le promoteur lui-même (via userId)
// ─────────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const promoteur = await stores.promoteurs.findById(req.params.id);
    if (!promoteur) {
      return res.status(404).json({ erreur: 'Promoteur introuvable' });
    }

    // Vérifier les droits : admin ou promoteur concerné
    const isOwner = promoteur.userId === req.user.id;
    if (req.user.role !== 'ADMIN' && !isOwner) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    const { nom, prenom, email, domaines, quotaMax, disponible, biographie } = req.body;
    const updates = {};

    if (nom !== undefined) updates.nom = nom;
    if (prenom !== undefined) updates.prenom = prenom;
    if (email !== undefined) {
      const emailLower = email.toLowerCase();
      const doublon = await stores.promoteurs.findOne(p => p.email === emailLower && p.id !== req.params.id);
      if (doublon) {
        return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
      }
      updates.email = emailLower;
    }
    if (domaines !== undefined) updates.domaines = JSON.stringify(Array.isArray(domaines) ? domaines : []);
    if (disponible !== undefined) updates.disponible = Boolean(disponible);
    if (biographie !== undefined) updates.biographie = biographie;

    // Seul l'admin peut changer le quota
    if (req.user.role === 'ADMIN' && quotaMax !== undefined) {
      updates.quotaMax = parseInt(quotaMax);
    }

    const mis_a_jour = await stores.promoteurs.update(req.params.id, updates);
    res.json({
      message: 'Promoteur mis à jour',
      promoteur: formatPromoteur(mis_a_jour),
    });
  } catch (err) {
    console.error('[promoteurs/PUT]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/promoteurs/:id
// Admin uniquement
// ─────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const promoteur = await stores.promoteurs.findById(req.params.id);
    if (!promoteur) {
      return res.status(404).json({ erreur: 'Promoteur introuvable' });
    }

    // Vérifier qu'il n'y a plus d'étudiants assignés
    const etudiants = await stores.etudiants.findAll(e => e.promoteurId === req.params.id);
    if (etudiants.length > 0) {
      return res.status(409).json({
        erreur: 'Impossible de supprimer ce promoteur',
        message: `${etudiants.length} étudiant(s) lui sont encore assigné(s). Réassignez-les d'abord.`,
      });
    }

    await stores.promoteurs.delete(req.params.id);
    res.json({ message: 'Promoteur supprimé avec succès' });
  } catch (err) {
    console.error('[promoteurs/DELETE]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
