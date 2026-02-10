// src/routes/workflow.js
// Gestion du workflow par étapes (configurable par admin)

const express = require('express');
const { stores } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/workflow/etapes
// Liste toutes les étapes du workflow (tous rôles)
// ─────────────────────────────────────────────
router.get('/etapes', authenticate, async (req, res) => {
  try {
    let etapes = await stores.workflow.findAll();
    // Trier par ordre
    etapes.sort((a, b) => a.ordre - b.ordre);

    if (req.query.actif === 'true') {
      etapes = etapes.filter(e => e.actif);
    }

    res.json({ total: etapes.length, etapes });
  } catch (err) {
    console.error('[workflow/etapes/GET]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/workflow/etapes
// Admin uniquement — crée une nouvelle étape
// Corps : { code, label, description?, ordre, actif? }
// ─────────────────────────────────────────────
router.post('/etapes', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, label, description, ordre, actif } = req.body;

    if (!code || !label || ordre === undefined) {
      return res.status(400).json({ erreur: 'Champs requis : code, label, ordre' });
    }

    const existant = await stores.workflow.findOne(e => e.code === code);
    if (existant) {
      return res.status(409).json({ erreur: `Une étape avec le code "${code}" existe déjà` });
    }

    const etape = await stores.workflow.create({
      code,
      label,
      description: description || null,
      ordre: parseInt(ordre),
      actif: actif !== false,
    });

    res.status(201).json({
      message: 'Étape créée avec succès',
      etape,
    });
  } catch (err) {
    console.error('[workflow/etapes/POST]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/workflow/etapes/:id
// Admin uniquement — modifie une étape
// ─────────────────────────────────────────────
router.put('/etapes/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const etape = await stores.workflow.findById(req.params.id);
    if (!etape) {
      return res.status(404).json({ erreur: 'Étape introuvable' });
    }

    const { label, description, ordre, actif } = req.body;
    const updates = {};

    if (label !== undefined) updates.label = label;
    if (description !== undefined) updates.description = description;
    if (ordre !== undefined) updates.ordre = parseInt(ordre);
    if (actif !== undefined) updates.actif = Boolean(actif);

    const mis_a_jour = await stores.workflow.update(req.params.id, updates);
    res.json({ message: 'Étape mise à jour', etape: mis_a_jour });
  } catch (err) {
    console.error('[workflow/etapes/PUT]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/workflow/etapes/:id
// Admin uniquement
// ─────────────────────────────────────────────
router.delete('/etapes/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const etape = await stores.workflow.findById(req.params.id);
    if (!etape) {
      return res.status(404).json({ erreur: 'Étape introuvable' });
    }

    await stores.workflow.delete(req.params.id);
    res.json({ message: 'Étape supprimée' });
  } catch (err) {
    console.error('[workflow/etapes/DELETE]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/workflow/etudiant/:etudiantId/etape
// Admin ou promoteur assigné — avance l'étudiant à une étape
// Corps : { etape, statut? }
// ─────────────────────────────────────────────
router.put('/etudiant/:etudiantId/etape', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'ETUDIANT') {
      return res.status(403).json({ erreur: 'Seuls les admins et promoteurs peuvent modifier l\'étape' });
    }

    const etudiant = await stores.etudiants.findById(req.params.etudiantId);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Vérification droits promoteur
    if (req.user.role === 'PROMOTEUR') {
      const user = await stores.users.findById(req.user.id);
      if (!user || etudiant.promoteurId !== user.promoteurId) {
        return res.status(403).json({ erreur: 'Accès refusé — cet étudiant n\'est pas dans votre liste' });
      }
    }

    const { etape, statut } = req.body;
    if (!etape) {
      return res.status(400).json({ erreur: 'Le code de l\'étape est requis' });
    }

    // Vérifier que l'étape existe
    const etapeValide = await stores.workflow.findOne(e => e.code === etape);
    if (!etapeValide) {
      return res.status(400).json({ erreur: `Étape inconnue : ${etape}` });
    }

    const updates = { etapeActuelle: etape };
    if (statut) {
      const statutsValides = ['EN_ATTENTE', 'EN_COURS', 'VALIDE', 'REJETE'];
      if (!statutsValides.includes(statut)) {
        return res.status(400).json({ erreur: `Statut invalide. Valeurs : ${statutsValides.join(', ')}` });
      }
      updates.statut = statut;
    }

    const mis_a_jour = await stores.etudiants.update(req.params.etudiantId, updates);
    res.json({
      message: 'Étape mise à jour',
      etudiant: {
        id: mis_a_jour.id,
        etapeActuelle: mis_a_jour.etapeActuelle,
        statut: mis_a_jour.statut,
      },
    });
  } catch (err) {
    console.error('[workflow/etudiant/etape]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
