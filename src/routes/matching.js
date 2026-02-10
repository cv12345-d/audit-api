// src/routes/matching.js
// Système de matching promoteur ↔ projet étudiant

const express = require('express');
const { stores } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { classerPromoteurs } = require('../utils/matching');

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/matching/:etudiantId
// Retourne les promoteurs classés par score pour un étudiant
// Accessible : admin, promoteurs, l'étudiant lui-même
// ─────────────────────────────────────────────
router.get('/:etudiantId', authenticate, async (req, res) => {
  try {
    const etudiant = await stores.etudiants.findById(req.params.etudiantId);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Vérification droits : admin, ou l'étudiant lui-même
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      if (!user || user.etudiantId !== req.params.etudiantId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    }

    const tousPromoteurs = await stores.promoteurs.findAll();
    const resultats = classerPromoteurs(etudiant.domaines, tousPromoteurs);

    res.json({
      etudiant: {
        id: etudiant.id,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        titreMémoire: etudiant.titreMémoire || null,
        domaines: (() => {
          try { return JSON.parse(etudiant.domaines); } catch { return []; }
        })(),
      },
      totalPromoteursDispo: resultats.length,
      suggestions: resultats,
    });
  } catch (err) {
    console.error('[matching/GET:etudiantId]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/matching/assigner
// Admin uniquement — assigne un promoteur à un étudiant
// Corps : { etudiantId, promoteurId }
// ─────────────────────────────────────────────
router.post('/assigner', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { etudiantId, promoteurId } = req.body;

    if (!etudiantId || !promoteurId) {
      return res.status(400).json({ erreur: 'etudiantId et promoteurId sont requis' });
    }

    const etudiant = await stores.etudiants.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    const promoteur = await stores.promoteurs.findById(promoteurId);
    if (!promoteur) {
      return res.status(404).json({ erreur: 'Promoteur introuvable' });
    }

    if (!promoteur.disponible) {
      return res.status(409).json({ erreur: 'Ce promoteur est marqué comme indisponible' });
    }

    if (promoteur.quotaActuel >= promoteur.quotaMax) {
      return res.status(409).json({
        erreur: 'Quota atteint',
        message: `Ce promoteur a atteint son quota maximum (${promoteur.quotaMax} mémoires)`,
      });
    }

    // Décrémente le quota de l'ancien promoteur si besoin
    const ancienPromoteurId = etudiant.promoteurId;
    if (ancienPromoteurId && ancienPromoteurId !== promoteurId) {
      const ancienPromoteur = await stores.promoteurs.findById(ancienPromoteurId);
      if (ancienPromoteur && ancienPromoteur.quotaActuel > 0) {
        await stores.promoteurs.update(ancienPromoteurId, {
          quotaActuel: ancienPromoteur.quotaActuel - 1,
        });
      }
    }

    // Assigne l'étudiant au nouveau promoteur
    await stores.etudiants.update(etudiantId, {
      promoteurId,
      statut: 'EN_COURS',
    });

    // Incrémente le quota seulement si c'est une nouvelle assignation
    if (ancienPromoteurId !== promoteurId) {
      await stores.promoteurs.update(promoteurId, {
        quotaActuel: promoteur.quotaActuel + 1,
      });
    }

    res.json({
      message: 'Promoteur assigné avec succès',
      assignation: {
        etudiant: { id: etudiant.id, nom: etudiant.nom, prenom: etudiant.prenom },
        promoteur: { id: promoteur.id, nom: promoteur.nom, prenom: promoteur.prenom },
      },
    });
  } catch (err) {
    console.error('[matching/assigner]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/matching/desassigner/:etudiantId
// Admin uniquement — retire le promoteur d'un étudiant
// ─────────────────────────────────────────────
router.delete('/desassigner/:etudiantId', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const etudiant = await stores.etudiants.findById(req.params.etudiantId);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    if (!etudiant.promoteurId) {
      return res.status(409).json({ erreur: 'Cet étudiant n\'a pas de promoteur assigné' });
    }

    // Décrémente le quota du promoteur
    const promoteur = await stores.promoteurs.findById(etudiant.promoteurId);
    if (promoteur && promoteur.quotaActuel > 0) {
      await stores.promoteurs.update(etudiant.promoteurId, {
        quotaActuel: promoteur.quotaActuel - 1,
      });
    }

    await stores.etudiants.update(req.params.etudiantId, {
      promoteurId: null,
      statut: 'EN_ATTENTE',
    });

    res.json({ message: 'Promoteur désassigné avec succès' });
  } catch (err) {
    console.error('[matching/desassigner]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
