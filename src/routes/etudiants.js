// src/routes/etudiants.js
// CRUD étudiants + gestion du projet de mémoire

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

function formatEtudiant(e, includePromoteur = false, promoteur = null) {
  return {
    ...e,
    domaines: parseDomaines(e.domaines),
    promoteur: includePromoteur && promoteur
      ? { id: promoteur.id, nom: promoteur.nom, prenom: promoteur.prenom, email: promoteur.email }
      : undefined,
  };
}

// ─────────────────────────────────────────────
// GET /api/etudiants
// Admin + Promoteur : tous ; Étudiant : seulement le sien
// ─────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    let etudiants;

    if (req.user.role === 'ETUDIANT') {
      // Un étudiant ne voit que son propre profil
      const user = await stores.users.findById(req.user.id);
      if (!user || !user.etudiantId) return res.json({ total: 0, etudiants: [] });
      const etudiant = await stores.etudiants.findById(user.etudiantId);
      etudiants = etudiant ? [etudiant] : [];
    } else if (req.user.role === 'PROMOTEUR') {
      // Un promoteur voit seulement ses mémorants
      const user = await stores.users.findById(req.user.id);
      if (!user || !user.promoteurId) return res.json({ total: 0, etudiants: [] });
      etudiants = await stores.etudiants.findAll(e => e.promoteurId === user.promoteurId);
    } else {
      // Admin voit tout
      etudiants = await stores.etudiants.findAll();
    }

    // Filtres optionnels (admin uniquement)
    const { etape, statut, promoteurId, search } = req.query;
    if (req.user.role === 'ADMIN') {
      if (etape) etudiants = etudiants.filter(e => e.etapeActuelle === etape);
      if (statut) etudiants = etudiants.filter(e => e.statut === statut);
      if (promoteurId) etudiants = etudiants.filter(e => e.promoteurId === promoteurId);
      if (search) {
        const q = search.toLowerCase();
        etudiants = etudiants.filter(e =>
          e.nom.toLowerCase().includes(q) ||
          e.prenom.toLowerCase().includes(q) ||
          (e.titreMémoire || '').toLowerCase().includes(q)
        );
      }
    }

    // Enrichir avec les promoteurs
    const promoteurs = await stores.promoteurs.findAll();
    const promoteurMap = Object.fromEntries(promoteurs.map(p => [p.id, p]));

    res.json({
      total: etudiants.length,
      etudiants: etudiants.map(e => formatEtudiant(e, true, e.promoteurId ? promoteurMap[e.promoteurId] : null)),
    });
  } catch (err) {
    console.error('[etudiants/GET]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/etudiants/:id
// ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const etudiant = await stores.etudiants.findById(req.params.id);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Vérification droits : admin, promoteur assigné, ou l'étudiant lui-même
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      if (!user || user.etudiantId !== req.params.id) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    } else if (req.user.role === 'PROMOTEUR') {
      const user = await stores.users.findById(req.user.id);
      if (!user || etudiant.promoteurId !== user.promoteurId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    }

    const promoteur = etudiant.promoteurId
      ? await stores.promoteurs.findById(etudiant.promoteurId)
      : null;

    const documents = await stores.documents.findAll(d => d.etudiantId === etudiant.id);

    res.json({
      ...formatEtudiant(etudiant, true, promoteur),
      documents,
    });
  } catch (err) {
    console.error('[etudiants/GET:id]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/etudiants
// Admin uniquement
// Corps : { nom, prenom, email, programme?, annee, titreMémoire?, ... }
// ─────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      nom, prenom, email, programme, annee,
      titreMémoire, resumeProjet, domaines, lieuImmersion,
      questionRecherche, remarques,
    } = req.body;

    if (!nom || !prenom || !email || !annee) {
      return res.status(400).json({ erreur: 'Champs requis : nom, prenom, email, annee' });
    }

    const existant = await stores.etudiants.findOne(e => e.email === email.toLowerCase());
    if (existant) {
      return res.status(409).json({ erreur: 'Un étudiant avec cet email existe déjà' });
    }

    const etudiant = await stores.etudiants.create({
      nom,
      prenom,
      email: email.toLowerCase(),
      programme: programme || 'Master en communication',
      annee: parseInt(annee),
      titreMémoire: titreMémoire || null,
      resumeProjet: resumeProjet || null,
      domaines: JSON.stringify(Array.isArray(domaines) ? domaines : []),
      lieuImmersion: lieuImmersion || null,
      questionRecherche: questionRecherche || null,
      remarques: remarques || null,
      promoteurId: null,
      etapeActuelle: 'DEPOT_SUJET',
      statut: 'EN_ATTENTE',
    });

    res.status(201).json({
      message: 'Étudiant créé avec succès',
      etudiant: formatEtudiant(etudiant),
    });
  } catch (err) {
    console.error('[etudiants/POST]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/etudiants/:id
// Admin ou l'étudiant lui-même (champs limités)
// ─────────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const etudiant = await stores.etudiants.findById(req.params.id);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Vérification droits
    let isOwner = false;
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      isOwner = user && user.etudiantId === req.params.id;
      if (!isOwner) return res.status(403).json({ erreur: 'Accès refusé' });
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    const updates = {};
    const {
      nom, prenom, email,
      titreMémoire, resumeProjet, domaines, lieuImmersion,
      questionRecherche, remarques,
      // Champs admin uniquement :
      programme, annee, etapeActuelle, statut, promoteurId,
    } = req.body;

    // Champs modifiables par l'étudiant lui-même
    if (titreMémoire !== undefined) updates.titreMémoire = titreMémoire;
    if (resumeProjet !== undefined) updates.resumeProjet = resumeProjet;
    if (domaines !== undefined) updates.domaines = JSON.stringify(Array.isArray(domaines) ? domaines : []);
    if (lieuImmersion !== undefined) updates.lieuImmersion = lieuImmersion;
    if (questionRecherche !== undefined) updates.questionRecherche = questionRecherche;
    if (remarques !== undefined) updates.remarques = remarques;

    // Champs admin uniquement
    if (req.user.role === 'ADMIN') {
      if (nom !== undefined) updates.nom = nom;
      if (prenom !== undefined) updates.prenom = prenom;
      if (email !== undefined) updates.email = email.toLowerCase();
      if (programme !== undefined) updates.programme = programme;
      if (annee !== undefined) updates.annee = parseInt(annee);
      if (etapeActuelle !== undefined) updates.etapeActuelle = etapeActuelle;
      if (statut !== undefined) updates.statut = statut;
      if (promoteurId !== undefined) updates.promoteurId = promoteurId || null;
    }

    const mis_a_jour = await stores.etudiants.update(req.params.id, updates);
    res.json({
      message: 'Étudiant mis à jour',
      etudiant: formatEtudiant(mis_a_jour),
    });
  } catch (err) {
    console.error('[etudiants/PUT]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/etudiants/:id
// Admin uniquement
// ─────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const etudiant = await stores.etudiants.findById(req.params.id);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Supprimer les documents associés
    const documents = await stores.documents.findAll(d => d.etudiantId === req.params.id);
    for (const doc of documents) {
      await stores.documents.delete(doc.id);
    }

    await stores.etudiants.delete(req.params.id);
    res.json({ message: 'Étudiant supprimé avec succès' });
  } catch (err) {
    console.error('[etudiants/DELETE]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
