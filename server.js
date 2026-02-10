// server.js — ThesisMatch API
// Plateforme de gestion des mémoires de master — UCLouvain
// Phase 1 : Fondations (authentification, CRUD, matching, workflow)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./src/utils/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Middlewares globaux
// ─────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

app.use('/api/auth',       require('./src/routes/auth'));
app.use('/api/promoteurs', require('./src/routes/promoteurs'));
app.use('/api/etudiants',  require('./src/routes/etudiants'));
app.use('/api/matching',   require('./src/routes/matching'));
app.use('/api/memoires',   require('./src/routes/memoires'));
app.use('/api/documents',  require('./src/routes/documents'));
app.use('/api/workflow',   require('./src/routes/workflow'));
app.use('/api/stats',      require('./src/routes/stats'));

// ─────────────────────────────────────────────
// Route racine — documentation des endpoints
// ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    nom: 'ThesisMatch API',
    version: '1.0.0',
    description: 'Plateforme de gestion des memoires de master — UCLouvain',
    statut: 'Phase 1 — Fondations',
    endpoints: {
      auth: {
        'POST /api/auth/login':    'Connexion (email + mot de passe)',
        'POST /api/auth/register': 'Creer un compte [ADMIN]',
        'GET  /api/auth/me':       'Profil utilisateur connecte',
        'PUT  /api/auth/password': 'Changer son mot de passe',
      },
      promoteurs: {
        'GET    /api/promoteurs':      'Liste des promoteurs',
        'GET    /api/promoteurs/:id':  'Detail d\'un promoteur',
        'POST   /api/promoteurs':      'Creer un promoteur [ADMIN]',
        'PUT    /api/promoteurs/:id':  'Modifier un promoteur [ADMIN/proprietaire]',
        'DELETE /api/promoteurs/:id':  'Supprimer un promoteur [ADMIN]',
      },
      etudiants: {
        'GET    /api/etudiants':      'Liste des etudiants',
        'GET    /api/etudiants/:id':  'Detail d\'un etudiant',
        'POST   /api/etudiants':      'Creer un etudiant [ADMIN]',
        'PUT    /api/etudiants/:id':  'Modifier un etudiant',
        'DELETE /api/etudiants/:id':  'Supprimer un etudiant [ADMIN]',
      },
      matching: {
        'GET    /api/matching/:etudiantId':     'Suggestions de promoteurs pour un projet',
        'POST   /api/matching/assigner':        'Assigner un promoteur a un etudiant [ADMIN]',
        'DELETE /api/matching/desassigner/:id': 'Retirer l\'assignation [ADMIN]',
      },
      memoires: {
        'GET    /api/memoires':        'Liste des memoires anterieurs (paginee)',
        'GET    /api/memoires/:id':    'Detail d\'un memoire',
        'POST   /api/memoires':        'Ajouter un memoire [ADMIN]',
        'POST   /api/memoires/import': 'Import en masse [ADMIN]',
        'PUT    /api/memoires/:id':    'Modifier un memoire [ADMIN]',
        'DELETE /api/memoires/:id':    'Supprimer un memoire [ADMIN]',
      },
      documents: {
        'POST   /api/documents/upload/:etudiantId': 'Uploader un document',
        'GET    /api/documents/etudiant/:id':        'Documents d\'un etudiant',
        'GET    /api/documents/:id/telecharger':     'Telecharger un document',
        'DELETE /api/documents/:id':                 'Supprimer un document',
      },
      workflow: {
        'GET    /api/workflow/etapes':             'Liste des etapes du workflow',
        'POST   /api/workflow/etapes':             'Creer une etape [ADMIN]',
        'PUT    /api/workflow/etapes/:id':         'Modifier une etape [ADMIN]',
        'DELETE /api/workflow/etapes/:id':         'Supprimer une etape [ADMIN]',
        'PUT    /api/workflow/etudiant/:id/etape': 'Avancer l\'etape d\'un etudiant [ADMIN/PROMOTEUR]',
      },
      stats: {
        'GET /api/stats':            'Vue d\'ensemble [ADMIN]',
        'GET /api/stats/promoteurs': 'Stats par promoteur [ADMIN]',
        'GET /api/stats/domaines':   'Repartition des domaines [ADMIN]',
      },
    },
    authentification: 'Bearer token JWT — header: Authorization: Bearer <token>',
    roles: ['ETUDIANT', 'PROMOTEUR', 'ADMIN'],
  });
});

// ─────────────────────────────────────────────
// Gestion des routes introuvables (404)
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    erreur: 'Route introuvable',
    message: `${req.method} ${req.path} n'existe pas. Consultez GET / pour la liste des endpoints.`,
  });
});

// ─────────────────────────────────────────────
// Gestion globale des erreurs
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[Erreur globale]', err);
  res.status(500).json({
    erreur: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur inattendue s\'est produite',
  });
});

// ─────────────────────────────────────────────
// Demarrage
// ─────────────────────────────────────────────

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`ThesisMatch API demarree sur http://localhost:${PORT}`);
    console.log(`Environnement : ${process.env.NODE_ENV || 'development'}`);
    console.log(`Documentation : GET http://localhost:${PORT}/`);
  });
}

start().catch(err => {
  console.error('Echec du demarrage :', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('Arret du serveur...');
  process.exit(0);
});
