// server.js - Serveur API pour recevoir les audits
// Installation requise : npm install express cors

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Fichier de stockage des audits
const AUDITS_FILE = path.join(__dirname, 'audits.json');

// Initialiser le fichier s'il n'existe pas
async function initializeStorage() {
  try {
    await fs.access(AUDITS_FILE);
  } catch {
    await fs.writeFile(AUDITS_FILE, JSON.stringify([]));
  }
}

// Lire tous les audits
async function readAudits() {
  try {
    const data = await fs.readFile(AUDITS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Sauvegarder les audits
async function saveAudits(audits) {
  await fs.writeFile(AUDITS_FILE, JSON.stringify(audits, null, 2));
}

// Route principale - infos sur l'API
app.get('/', (req, res) => {
  res.json({
    message: 'API d\'Audit d\'Automatisation',
    endpoints: {
      'POST /audits': 'Soumettre un nouvel audit',
      'GET /audits': 'Récupérer tous les audits',
      'GET /audits/:id': 'Récupérer un audit spécifique'
    }
  });
});

// POST - Créer un nouvel audit
app.post('/audits', async (req, res) => {
  try {
    const auditData = req.body;
    
    // Validation basique
    if (!auditData.entreprise || !auditData.resultats) {
      return res.status(400).json({ 
        error: 'Données invalides',
        message: 'entreprise et resultats sont requis'
      });
    }

    // Lire les audits existants
    const audits = await readAudits();
    
    // Créer le nouvel audit avec un ID unique
    const newAudit = {
      id: Date.now().toString(),
      ...auditData,
      dateReception: new Date().toISOString()
    };
    
    // Ajouter et sauvegarder
    audits.push(newAudit);
    await saveAudits(audits);
    
    console.log(`Nouvel audit reçu: ${newAudit.entreprise} (ID: ${newAudit.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Audit enregistré avec succès',
      id: newAudit.id,
      entreprise: newAudit.entreprise
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// GET - Récupérer tous les audits
app.get('/audits', async (req, res) => {
  try {
    const audits = await readAudits();
    
    // Retourner uniquement les infos principales (pas les détails)
    const summary = audits.map(audit => ({
      id: audit.id,
      entreprise: audit.entreprise,
      date: audit.date,
      scoreGlobal: audit.scoreGlobal,
      dateReception: audit.dateReception
    }));
    
    res.json({
      total: audits.length,
      audits: summary
    });
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// GET - Récupérer un audit spécifique
app.get('/audits/:id', async (req, res) => {
  try {
    const audits = await readAudits();
    const audit = audits.find(a => a.id === req.params.id);
    
    if (!audit) {
      return res.status(404).json({ 
        error: 'Non trouvé',
        message: `Aucun audit avec l'ID ${req.params.id}`
      });
    }
    
    res.json(audit);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// Démarrer le serveur
initializeStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur API démarré sur http://localhost:${PORT}`);
    console.log(`📝 Les audits seront sauvegardés dans: ${AUDITS_FILE}`);
  });
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('Arrêt du serveur...');
  process.exit(0);

});
