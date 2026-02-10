'use client';

import { useEffect, useState, useCallback } from 'react';
import { promoteurs as promoteursApi } from '@/lib/api';
import { initiales } from '@/lib/utils';

export default function PromoteursPage() {
  const [promoteurs, setPromoteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterDispo, setFilterDispo] = useState('');

  // Formulaire d'édition
  const [editing, setEditing] = useState(null);   // null | promoteur
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Formulaire de création
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ nom: '', prenom: '', email: '', domaines: '', quotaMax: 10 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await promoteursApi.list();
      setPromoteurs(res.promoteurs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleDispo(p) {
    try {
      await promoteursApi.update(p.id, { disponible: !p.disponible });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const domaines = editing.domaines
        .filter(Boolean)
        .map((d) => d.trim());
      await promoteursApi.update(editing.id, {
        nom: editing.nom,
        prenom: editing.prenom,
        email: editing.email,
        quotaMax: parseInt(editing.quotaMax),
        domaines,
        biographie: editing.biographie,
      });
      setSaveSuccess('Promoteur mis à jour.');
      await load();
      setTimeout(() => { setEditing(null); setSaveSuccess(''); }, 1200);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const domaines = createData.domaines
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      await promoteursApi.create({
        nom: createData.nom,
        prenom: createData.prenom,
        email: createData.email,
        quotaMax: parseInt(createData.quotaMax) || 10,
        domaines,
      });
      setShowCreate(false);
      setCreateData({ nom: '', prenom: '', email: '', domaines: '', quotaMax: 10 });
      await load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Supprimer ${p.prenom} ${p.nom} ? Cette action est irréversible.`)) return;
    try {
      await promoteursApi.delete(p.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Filtrage local
  const displayed = promoteurs.filter((p) => {
    if (filterDispo === 'dispo' && (!p.disponible || p.quotaActuel >= p.quotaMax)) return false;
    if (filterDispo === 'indispo' && p.disponible) return false;
    if (search) {
      const q = search.toLowerCase();
      const domaines = Array.isArray(p.domaines) ? p.domaines : [];
      return (
        p.nom?.toLowerCase().includes(q) ||
        p.prenom?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        domaines.some((d) => d.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Promoteurs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{promoteurs.length} promoteur{promoteurs.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <IconPlus className="w-4 h-4" />
          Ajouter un promoteur
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
          <input
            className="input pl-9 h-9"
            placeholder="Rechercher par nom, domaine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto h-9 pr-8"
          value={filterDispo}
          onChange={(e) => setFilterDispo(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="dispo">Disponibles</option>
          <option value="indispo">Indisponibles / complets</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Tableau */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-ucl-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <IconEmpty className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Aucun promoteur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Promoteur</th>
                  <th className="table-header">Domaines de recherche</th>
                  <th className="table-header">Quota</th>
                  <th className="table-header">Remplissage</th>
                  <th className="table-header">Disponibilité</th>
                  <th className="table-header w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((p) => (
                  <PromoteurRow
                    key={p.id}
                    promoteur={p}
                    onToggleDispo={toggleDispo}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal édition */}
      {editing && (
        <Modal title={`Modifier ${editing.prenom} ${editing.nom}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput label="Prénom" value={editing.prenom} onChange={(v) => setEditing({ ...editing, prenom: v })} />
              <LabeledInput label="Nom" value={editing.nom} onChange={(v) => setEditing({ ...editing, nom: v })} />
            </div>
            <LabeledInput label="Email" type="email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Domaines (un par ligne)</label>
              <textarea
                className="input min-h-[80px] resize-none"
                value={(editing.domaines || []).join('\n')}
                onChange={(e) =>
                  setEditing({ ...editing, domaines: e.target.value.split('\n') })
                }
                placeholder="Communication&#10;Médias numériques&#10;Journalisme"
              />
            </div>
            <LabeledInput
              label="Quota maximum"
              type="number"
              value={editing.quotaMax}
              onChange={(v) => setEditing({ ...editing, quotaMax: v })}
              min={editing.quotaActuel}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Biographie (facultatif)</label>
              <textarea
                className="input min-h-[70px] resize-none"
                value={editing.biographie || ''}
                onChange={(e) => setEditing({ ...editing, biographie: e.target.value })}
              />
            </div>

            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            {saveSuccess && <p className="text-xs text-green-600">{saveSuccess}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary">
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal création */}
      {showCreate && (
        <Modal title="Ajouter un promoteur" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="Prénom" required
                value={createData.prenom}
                onChange={(v) => setCreateData({ ...createData, prenom: v })}
              />
              <LabeledInput
                label="Nom" required
                value={createData.nom}
                onChange={(v) => setCreateData({ ...createData, nom: v })}
              />
            </div>
            <LabeledInput
              label="Email" type="email" required
              value={createData.email}
              onChange={(v) => setCreateData({ ...createData, email: v })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Domaines <span className="text-slate-400">(séparés par des virgules)</span>
              </label>
              <input
                className="input"
                value={createData.domaines}
                onChange={(e) => setCreateData({ ...createData, domaines: e.target.value })}
                placeholder="Communication, Médias numériques, Journalisme"
              />
            </div>
            <LabeledInput
              label="Quota maximum"
              type="number"
              value={createData.quotaMax}
              onChange={(v) => setCreateData({ ...createData, quotaMax: v })}
              min={1}
            />

            {createError && <p className="text-xs text-red-600">{createError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Création...' : 'Créer le promoteur'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Ligne promoteur
// ─────────────────────────────────────────────

function PromoteurRow({ promoteur: p, onToggleDispo, onEdit, onDelete }) {
  const domaines = Array.isArray(p.domaines) ? p.domaines : [];
  const pct = p.quotaMax > 0 ? Math.round((p.quotaActuel / p.quotaMax) * 100) : 0;
  const isPlein = p.quotaActuel >= p.quotaMax;
  const isDispo = p.disponible && !isPlein;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* Promoteur */}
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
            {initiales(p.nom, p.prenom)}
          </div>
          <div>
            <p className="font-medium text-slate-800">{p.prenom} {p.nom}</p>
            <p className="text-xs text-slate-400">{p.email}</p>
          </div>
        </div>
      </td>

      {/* Domaines */}
      <td className="table-cell max-w-xs">
        {domaines.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {domaines.slice(0, 4).map((d) => (
              <span key={d} className="badge bg-indigo-50 text-indigo-700">{d}</span>
            ))}
            {domaines.length > 4 && (
              <span className="badge bg-slate-100 text-slate-500">+{domaines.length - 4}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Aucun domaine</span>
        )}
      </td>

      {/* Quota */}
      <td className="table-cell">
        <span className="font-semibold text-slate-700">
          {p.quotaActuel}
          <span className="text-slate-400 font-normal"> / {p.quotaMax}</span>
        </span>
        <p className="text-xs text-slate-400">{p.quotaMax - p.quotaActuel} restante{p.quotaMax - p.quotaActuel !== 1 ? 's' : ''}</p>
      </td>

      {/* Barre de remplissage */}
      <td className="table-cell w-36">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-8 text-right ${
            pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {pct}%
          </span>
        </div>
      </td>

      {/* Disponibilité */}
      <td className="table-cell">
        <button
          onClick={() => onToggleDispo(p)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            isDispo
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          }`}
          title={isDispo ? 'Cliquer pour rendre indisponible' : 'Cliquer pour rendre disponible'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isDispo ? 'bg-green-500' : 'bg-red-500'}`} />
          {isDispo ? 'Disponible' : isPlein ? 'Quota plein' : 'Indisponible'}
        </button>
      </td>

      {/* Actions */}
      <td className="table-cell">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit({ ...p, domaines: Array.isArray(p.domaines) ? p.domaines : [] })}
            className="p-1.5 text-slate-400 hover:text-ucl-blue hover:bg-ucl-sky rounded-lg transition-colors"
            title="Modifier"
          >
            <IconEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(p)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Composants réutilisables
// ─────────────────────────────────────────────

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = 'text', required, min, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={min}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Icônes
// ─────────────────────────────────────────────

function IconSearch() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconPlus({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconEdit({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function IconTrash({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconEmpty({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}
function IconClose({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
