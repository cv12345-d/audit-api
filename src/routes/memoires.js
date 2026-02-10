// src/routes/memoires.js
// Mémoires antérieurs — consultation et gestion de l'historique

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

function formatMemoire(m) {
  return { ...m, domaines: parseDomaines(m.domaines) };
}

// ─────────────────────────────────────────────
// GET /api/memoires
// Accessible à tous les utilisateurs authentifiés
// Filtres : ?annee=&promoteur=&domaine=&q=
// ─────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    let memoires = await stores.memoires.findAll();
    const { annee, promoteur, domaine, q, page = 1, limit = 20 } = req.query;

    if (annee) {
      memoires = memoires.filter(m => m.annee === parseInt(annee));
    }
    if (promoteur) {
      const recherche = promoteur.toLowerCase();
      memoires = memoires.filter(m => m.promoteur.toLowerCase().includes(recherche));
    }
    if (domaine) {
      const recherche = domaine.toLowerCase().trim();
      memoires = memoires.filter(m => {
        const domaines = parseDomaines(m.domaines);
        return domaines.some(d => d.toLowerCase().includes(recherche));
      });
    }
    if (q) {
      const recherche = q.toLowerCase();
      memoires = memoires.filter(m =>
        m.titre.toLowerCase().includes(recherche) ||
        (m.resume || '').toLowerCase().includes(recherche) ||
        m.auteur.toLowerCase().includes(recherche)
      );
    }

    // Pagination
    const total = memoires.length;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;
    const paginated = memoires.slice(offset, offset + limitNum);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      memoires: paginated.map(formatMemoire),
    });
  } catch (err) {
    console.error('[memoires/GET]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/memoires/:id
// ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const memoire = await stores.memoires.findById(req.params.id);
    if (!memoire) {
      return res.status(404).json({ erreur: 'Mémoire introuvable' });
    }
    res.json(formatMemoire(memoire));
  } catch (err) {
    console.error('[memoires/GET:id]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/memoires
// Admin uniquement — ajoute un mémoire à l'historique
// Corps : { titre, resume?, auteur, annee, promoteur, domaines[], note?, mention? }
// ─────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { titre, resume, auteur, annee, promoteur, domaines, note, mention } = req.body;

    if (!titre || !auteur || !annee || !promoteur) {
      return res.status(400).json({ erreur: 'Champs requis : titre, auteur, annee, promoteur' });
    }

    const memoire = await stores.memoires.create({
      titre,
      resume: resume || null,
      auteur,
      annee: parseInt(annee),
      promoteur,
      domaines: JSON.stringify(Array.isArray(domaines) ? domaines : []),
      note: note || null,
      mention: mention || null,
    });

    res.status(201).json({
      message: 'Mémoire ajouté à l\'historique',
      memoire: formatMemoire(memoire),
    });
  } catch (err) {
    console.error('[memoires/POST]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/memoires/:id
// Admin uniquement
// ─────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const memoire = await stores.memoires.findById(req.params.id);
    if (!memoire) {
      return res.status(404).json({ erreur: 'Mémoire introuvable' });
    }

    const { titre, resume, auteur, annee, promoteur, domaines, note, mention } = req.body;
    const updates = {};

    if (titre !== undefined) updates.titre = titre;
    if (resume !== undefined) updates.resume = resume;
    if (auteur !== undefined) updates.auteur = auteur;
    if (annee !== undefined) updates.annee = parseInt(annee);
    if (promoteur !== undefined) updates.promoteur = promoteur;
    if (domaines !== undefined) updates.domaines = JSON.stringify(Array.isArray(domaines) ? domaines : []);
    if (note !== undefined) updates.note = note;
    if (mention !== undefined) updates.mention = mention;

    const mis_a_jour = await stores.memoires.update(req.params.id, updates);
    res.json({
      message: 'Mémoire mis à jour',
      memoire: formatMemoire(mis_a_jour),
    });
  } catch (err) {
    console.error('[memoires/PUT]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/memoires/:id
// Admin uniquement
// ─────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const memoire = await stores.memoires.findById(req.params.id);
    if (!memoire) {
      return res.status(404).json({ erreur: 'Mémoire introuvable' });
    }
    await stores.memoires.delete(req.params.id);
    res.json({ message: 'Mémoire supprimé' });
  } catch (err) {
    console.error('[memoires/DELETE]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/memoires/import
// Admin — import CSV/JSON en masse
// Corps : { memoires: [...] }
// ─────────────────────────────────────────────
router.post('/import', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { memoires } = req.body;
    if (!Array.isArray(memoires) || memoires.length === 0) {
      return res.status(400).json({ erreur: 'Un tableau "memoires" non vide est requis' });
    }

    const resultats = { crees: 0, erreurs: [] };

    for (const m of memoires) {
      if (!m.titre || !m.auteur || !m.annee || !m.promoteur) {
        resultats.erreurs.push({ donnee: m, raison: 'Champs manquants (titre, auteur, annee, promoteur)' });
        continue;
      }
      await stores.memoires.create({
        titre: m.titre,
        resume: m.resume || null,
        auteur: m.auteur,
        annee: parseInt(m.annee),
        promoteur: m.promoteur,
        domaines: JSON.stringify(Array.isArray(m.domaines) ? m.domaines : []),
        note: m.note || null,
        mention: m.mention || null,
      });
      resultats.crees++;
    }

    res.status(201).json({
      message: `Import terminé : ${resultats.crees} mémoires créés, ${resultats.erreurs.length} erreurs`,
      ...resultats,
    });
  } catch (err) {
    console.error('[memoires/import]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
