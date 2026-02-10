// src/routes/auth.js
// Routes d'authentification : login, register, profil courant

const express = require('express');
const bcrypt = require('bcrypt');
const { stores } = require('../utils/database');
const { authenticate, generateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────
// POST /api/auth/login
// Corps : { email, password }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ erreur: 'Email et mot de passe requis' });
    }

    const user = await stores.users.findOne(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }

    const valide = await bcrypt.compare(password, user.password);
    if (!valide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }

    const token = generateToken(user);

    // Profil lié selon le rôle
    let profil = null;
    if (user.role === 'ETUDIANT' && user.etudiantId) {
      profil = await stores.etudiants.findById(user.etudiantId);
    } else if (user.role === 'PROMOTEUR' && user.promoteurId) {
      profil = await stores.promoteurs.findById(user.promoteurId);
    }

    res.json({
      token,
      utilisateur: {
        id: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        profil,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// Admin uniquement — crée un compte utilisateur
// Corps : { email, password, role, nom, prenom, etudiantId?, promoteurId? }
// ─────────────────────────────────────────────
router.post('/register', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { email, password, role, nom, prenom, etudiantId, promoteurId } = req.body;

    if (!email || !password || !role || !nom || !prenom) {
      return res.status(400).json({ erreur: 'Champs requis : email, password, role, nom, prenom' });
    }

    const rolesValides = ['ETUDIANT', 'PROMOTEUR', 'ADMIN'];
    if (!rolesValides.includes(role)) {
      return res.status(400).json({ erreur: `Rôle invalide. Valeurs acceptées : ${rolesValides.join(', ')}` });
    }

    const existant = await stores.users.findOne(u => u.email === email.toLowerCase());
    if (existant) {
      return res.status(409).json({ erreur: 'Un compte avec cet email existe déjà' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await stores.users.create({
      email: email.toLowerCase(),
      password: hashed,
      role,
      nom,
      prenom,
      etudiantId: etudiantId || null,
      promoteurId: promoteurId || null,
    });

    res.status(201).json({
      message: 'Compte créé avec succès',
      utilisateur: { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// Retourne le profil de l'utilisateur connecté
// ─────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await stores.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ erreur: 'Utilisateur introuvable' });
    }

    let profil = null;
    if (user.role === 'ETUDIANT' && user.etudiantId) {
      profil = await stores.etudiants.findById(user.etudiantId);
    } else if (user.role === 'PROMOTEUR' && user.promoteurId) {
      profil = await stores.promoteurs.findById(user.promoteurId);
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
      profil,
    });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/auth/password
// Change le mot de passe de l'utilisateur connecté
// Corps : { ancienPassword, nouveauPassword }
// ─────────────────────────────────────────────
router.put('/password', authenticate, async (req, res) => {
  try {
    const { ancienPassword, nouveauPassword } = req.body;
    if (!ancienPassword || !nouveauPassword) {
      return res.status(400).json({ erreur: 'ancienPassword et nouveauPassword requis' });
    }
    if (nouveauPassword.length < 8) {
      return res.status(400).json({ erreur: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }

    const user = await stores.users.findById(req.user.id);
    const valide = await bcrypt.compare(ancienPassword, user.password);
    if (!valide) {
      return res.status(401).json({ erreur: 'Ancien mot de passe incorrect' });
    }

    const hashed = await bcrypt.hash(nouveauPassword, SALT_ROUNDS);
    await stores.users.update(req.user.id, { password: hashed });

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error('[auth/password]', err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
