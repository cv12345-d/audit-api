// src/routes/stats.js
// Tableaux de bord et statistiques — Admin uniquement

const express = require('express');
const { stores } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

function parseDomaines(domaines) {
  if (Array.isArray(domaines)) return domaines;
  if (typeof domaines === 'string') {
    try { return JSON.parse(domaines); } catch { return []; }
  }
  return [];
}

// ─────────────────────────────────────────────
// GET /api/stats
// Vue d'ensemble globale (Admin uniquement)
// ─────────────────────────────────────────────
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [etudiants, promoteurs, memoires, etapes] = await Promise.all([
      stores.etudiants.findAll(),
      stores.promoteurs.findAll(),
      stores.memoires.findAll(),
      stores.workflow.findAll(),
    ]);

    // Stats étudiants
    const etudiantsAvecPromoteur = etudiants.filter(e => e.promoteurId).length;
    const etudiantsSansPromoteur = etudiants.length - etudiantsAvecPromoteur;

    // Répartition par statut
    const parStatut = etudiants.reduce((acc, e) => {
      acc[e.statut] = (acc[e.statut] || 0) + 1;
      return acc;
    }, {});

    // Répartition par étape
    const parEtape = etudiants.reduce((acc, e) => {
      acc[e.etapeActuelle] = (acc[e.etapeActuelle] || 0) + 1;
      return acc;
    }, {});

    // Stats promoteurs
    const promoteursDisponibles = promoteurs.filter(p => p.disponible && p.quotaActuel < p.quotaMax).length;
    const totalCapacite = promoteurs.reduce((sum, p) => sum + p.quotaMax, 0);
    const totalEncadrements = promoteurs.reduce((sum, p) => sum + p.quotaActuel, 0);
    const tauxRemplissageGlobal = totalCapacite > 0
      ? Math.round((totalEncadrements / totalCapacite) * 100)
      : 0;

    res.json({
      etudiants: {
        total: etudiants.length,
        avecPromoteur: etudiantsAvecPromoteur,
        sansPromoteur: etudiantsSansPromoteur,
        tauxAssignation: etudiants.length > 0
          ? Math.round((etudiantsAvecPromoteur / etudiants.length) * 100)
          : 0,
        parStatut,
        parEtape,
      },
      promoteurs: {
        total: promoteurs.length,
        disponibles: promoteursDisponibles,
        indisponibles: promoteurs.length - promoteursDisponibles,
        totalCapacite,
        totalEncadrements,
        tauxRemplissageGlobal,
      },
      memoires: {
        totalHistorique: memoires.length,
      },
      workflow: {
        totalEtapes: etapes.filter(e => e.actif).length,
      },
    });
  } catch (err) {
    console.error('[stats/GET]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/promoteurs
// Détail des stats par promoteur
// ─────────────────────────────────────────────
router.get('/promoteurs', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const promoteurs = await stores.promoteurs.findAll();
    const etudiants = await stores.etudiants.findAll();

    const etudiantsParPromoteur = etudiants.reduce((acc, e) => {
      if (e.promoteurId) {
        if (!acc[e.promoteurId]) acc[e.promoteurId] = [];
        acc[e.promoteurId].push(e);
      }
      return acc;
    }, {});

    const stats = promoteurs.map(p => {
      const domaines = parseDomaines(p.domaines);
      const mes_etudiants = etudiantsParPromoteur[p.id] || [];
      return {
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        domaines,
        quotaMax: p.quotaMax,
        quotaActuel: p.quotaActuel,
        quotaRestant: p.quotaMax - p.quotaActuel,
        tauxRemplissage: p.quotaMax > 0
          ? Math.round((p.quotaActuel / p.quotaMax) * 100)
          : 0,
        disponible: p.disponible,
        nbEtudiants: mes_etudiants.length,
        etudiantsParStatut: mes_etudiants.reduce((acc, e) => {
          acc[e.statut] = (acc[e.statut] || 0) + 1;
          return acc;
        }, {}),
      };
    });

    // Trier par taux de remplissage décroissant
    stats.sort((a, b) => b.tauxRemplissage - a.tauxRemplissage);

    res.json({ total: stats.length, promoteurs: stats });
  } catch (err) {
    console.error('[stats/promoteurs]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/domaines
// Répartition des domaines (étudiants + promoteurs)
// ─────────────────────────────────────────────
router.get('/domaines', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [etudiants, promoteurs] = await Promise.all([
      stores.etudiants.findAll(),
      stores.promoteurs.findAll(),
    ]);

    const domainesEtudiants = {};
    etudiants.forEach(e => {
      parseDomaines(e.domaines).forEach(d => {
        domainesEtudiants[d] = (domainesEtudiants[d] || 0) + 1;
      });
    });

    const domainesPromoteurs = {};
    promoteurs.forEach(p => {
      parseDomaines(p.domaines).forEach(d => {
        domainesPromoteurs[d] = (domainesPromoteurs[d] || 0) + 1;
      });
    });

    res.json({
      etudiants: Object.entries(domainesEtudiants)
        .map(([domaine, count]) => ({ domaine, count }))
        .sort((a, b) => b.count - a.count),
      promoteurs: Object.entries(domainesPromoteurs)
        .map(([domaine, count]) => ({ domaine, count }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    console.error('[stats/domaines]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
