// src/routes/documents.js
// Upload et gestion des documents étudiants (par étape du workflow)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { stores } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');

// Configuration Multer 2.x (API async)
const storage = multer.diskStorage({
  async destination(req, file) {
    const etudiantId = req.params.etudiantId || req.body.etudiantId;
    const dir = path.join(UPLOADS_DIR, etudiantId || 'general');
    await fs.mkdir(dir, { recursive: true });
    return dir;
  },
  filename(req, file) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    return `${timestamp}_${base}${ext}`;
  },
});

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
]);

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorise. Formats acceptes : PDF, DOC, DOCX, TXT, JPG, PNG'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// ─────────────────────────────────────────────
// POST /api/documents/upload/:etudiantId
// Upload un document pour un étudiant à une étape donnée
// Corps multipart : file, etape, nom (optionnel)
// ─────────────────────────────────────────────
router.post('/upload/:etudiantId', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { etudiantId } = req.params;
    const { etape, nom } = req.body;

    if (!req.file) {
      return res.status(400).json({ erreur: 'Aucun fichier reçu' });
    }
    if (!etape) {
      return res.status(400).json({ erreur: 'L\'étape du workflow est requise' });
    }

    const etudiant = await stores.etudiants.findById(etudiantId);
    if (!etudiant) {
      // Supprimer le fichier uploadé
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Vérification droits : admin, promoteur de cet étudiant, ou l'étudiant lui-même
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      if (!user || user.etudiantId !== etudiantId) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    } else if (req.user.role === 'PROMOTEUR') {
      const user = await stores.users.findById(req.user.id);
      if (!user || etudiant.promoteurId !== user.promoteurId) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    }

    const document = await stores.documents.create({
      nom: nom || req.file.originalname,
      nomFichier: req.file.filename,
      cheminFichier: req.file.path,
      type: req.file.mimetype,
      taille: req.file.size,
      etape,
      etudiantId,
      uploadedBy: req.user.id,
    });

    res.status(201).json({
      message: 'Document uploadé avec succès',
      document: {
        id: document.id,
        nom: document.nom,
        etape: document.etape,
        type: document.type,
        taille: document.taille,
        createdAt: document.createdAt,
      },
    });
  } catch (err) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ erreur: 'Fichier trop volumineux (max 20 MB)' });
    }
    console.error('[documents/upload]', err);
    res.status(500).json({ erreur: err.message || 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/documents/etudiant/:etudiantId
// Liste les documents d'un étudiant
// ─────────────────────────────────────────────
router.get('/etudiant/:etudiantId', authenticate, async (req, res) => {
  try {
    const { etudiantId } = req.params;

    const etudiant = await stores.etudiants.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ erreur: 'Étudiant introuvable' });
    }

    // Vérification droits
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      if (!user || user.etudiantId !== etudiantId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    } else if (req.user.role === 'PROMOTEUR') {
      const user = await stores.users.findById(req.user.id);
      if (!user || etudiant.promoteurId !== user.promoteurId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    }

    const { etape } = req.query;
    let documents = await stores.documents.findAll(d => d.etudiantId === etudiantId);
    if (etape) documents = documents.filter(d => d.etape === etape);

    res.json({
      total: documents.length,
      documents: documents.map(d => ({
        id: d.id,
        nom: d.nom,
        etape: d.etape,
        type: d.type,
        taille: d.taille,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error('[documents/etudiant]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/documents/:id/telecharger
// Télécharge un document
// ─────────────────────────────────────────────
router.get('/:id/telecharger', authenticate, async (req, res) => {
  try {
    const document = await stores.documents.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ erreur: 'Document introuvable' });
    }

    // Vérification droits
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      if (!user || user.etudiantId !== document.etudiantId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    } else if (req.user.role === 'PROMOTEUR') {
      const etudiant = await stores.etudiants.findById(document.etudiantId);
      const user = await stores.users.findById(req.user.id);
      if (!user || !etudiant || etudiant.promoteurId !== user.promoteurId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    }

    try {
      await fs.access(document.cheminFichier);
    } catch {
      return res.status(404).json({ erreur: 'Fichier introuvable sur le serveur' });
    }

    res.download(document.cheminFichier, document.nom);
  } catch (err) {
    console.error('[documents/telecharger]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/documents/:id
// Admin ou l'étudiant concerné
// ─────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await stores.documents.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ erreur: 'Document introuvable' });
    }

    // Vérification droits
    if (req.user.role === 'ETUDIANT') {
      const user = await stores.users.findById(req.user.id);
      if (!user || user.etudiantId !== document.etudiantId) {
        return res.status(403).json({ erreur: 'Accès refusé' });
      }
    } else if (req.user.role === 'PROMOTEUR') {
      return res.status(403).json({ erreur: 'Seuls les étudiants et les admins peuvent supprimer des documents' });
    }

    // Supprimer le fichier physique
    await fs.unlink(document.cheminFichier).catch(() => {});
    await stores.documents.delete(req.params.id);

    res.json({ message: 'Document supprimé avec succès' });
  } catch (err) {
    console.error('[documents/DELETE]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
