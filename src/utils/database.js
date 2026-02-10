// src/utils/database.js
// Couche de persistance fichier JSON — miroir du schéma Prisma
// À remplacer par Prisma + PostgreSQL en production.

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');

class Store {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this._data = null;
  }

  async _load() {
    if (this._data !== null) return;
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this._data = JSON.parse(raw);
    } catch {
      this._data = [];
    }
  }

  async _save() {
    await fs.writeFile(this.filePath, JSON.stringify(this._data, null, 2));
  }

  async findAll(filterFn = null) {
    await this._load();
    if (!filterFn) return [...this._data];
    return this._data.filter(filterFn);
  }

  async findOne(filterFn) {
    await this._load();
    return this._data.find(filterFn) || null;
  }

  async findById(id) {
    return this.findOne(item => item.id === id);
  }

  async create(data) {
    await this._load();
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this._data.push(record);
    await this._save();
    return record;
  }

  async update(id, data) {
    await this._load();
    const index = this._data.findIndex(item => item.id === id);
    if (index === -1) return null;
    this._data[index] = {
      ...this._data[index],
      ...data,
      id, // immutable
      createdAt: this._data[index].createdAt, // immutable
      updatedAt: new Date().toISOString(),
    };
    await this._save();
    return this._data[index];
  }

  async delete(id) {
    await this._load();
    const index = this._data.findIndex(item => item.id === id);
    if (index === -1) return false;
    this._data.splice(index, 1);
    await this._save();
    return true;
  }

  async count(filterFn = null) {
    await this._load();
    if (!filterFn) return this._data.length;
    return this._data.filter(filterFn).length;
  }
}

// ─────────────────────────────────────────────
// Stores par entité
// ─────────────────────────────────────────────

const stores = {
  users: new Store('users'),
  promoteurs: new Store('promoteurs'),
  etudiants: new Store('etudiants'),
  memoires: new Store('memoires'),
  documents: new Store('documents'),
  workflow: new Store('workflow'),
  documentsReglementaires: new Store('documents_reglementaires'),
};

// ─────────────────────────────────────────────
// Données initiales (seed)
// ─────────────────────────────────────────────

const ETAPES_WORKFLOW_DEFAUT = [
  { code: 'DEPOT_SUJET',        label: 'Dépôt du sujet',             description: 'Soumission de la proposition de sujet de mémoire', ordre: 1, actif: true },
  { code: 'VALIDATION_SUJET',   label: 'Validation du sujet',        description: 'Validation du sujet par le promoteur ou la direction', ordre: 2, actif: true },
  { code: 'DEPOT_PLAN',         label: 'Dépôt du plan',              description: 'Soumission du plan détaillé du mémoire', ordre: 3, actif: true },
  { code: 'FEEDBACK_PLAN',      label: 'Feedback sur le plan',       description: 'Retour du promoteur sur le plan soumis', ordre: 4, actif: true },
  { code: 'DEPOT_INTERMEDIAIRE',label: 'Dépôt intermédiaire',        description: 'Soumission de la version intermédiaire du mémoire', ordre: 5, actif: true },
  { code: 'DEPOT_FINAL',        label: 'Dépôt final',                description: 'Soumission de la version finale du mémoire', ordre: 6, actif: true },
];

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

async function seedWorkflow() {
  const existing = await stores.workflow.count();
  if (existing > 0) return;
  for (const etape of ETAPES_WORKFLOW_DEFAUT) {
    await stores.workflow.create(etape);
  }
  console.log('[DB] Étapes workflow initialisées');
}

async function seedAdmin() {
  const bcrypt = require('bcrypt');
  const email = process.env.ADMIN_EMAIL || 'admin@uclouvain.be';
  const existing = await stores.users.findOne(u => u.email === email);
  if (existing) return;

  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hashed = await bcrypt.hash(password, 10);
  await stores.users.create({
    email,
    password: hashed,
    role: 'ADMIN',
    nom: process.env.ADMIN_NOM || 'Admin',
    prenom: process.env.ADMIN_PRENOM || 'ThesisMatch',
  });
  console.log(`[DB] Compte admin créé : ${email}`);
}

async function initDatabase() {
  await ensureDataDir();
  await seedWorkflow();
  await seedAdmin();
  console.log('[DB] Base de données initialisée');
}

module.exports = { stores, initDatabase };
