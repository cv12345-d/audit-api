'use client';

import { useEffect, useState, useCallback } from 'react';
import { etudiants as etudiantsApi, matching as matchingApi } from '@/lib/api';
import { statutBadge, ETAPE_LABEL, scoreColor, scoreBarColor, formatScore, initiales } from '@/lib/utils';

export default function EtudiantsPage() {
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Panneau de matching
  const [selected, setSelected] = useState(null);     // étudiant sélectionné
  const [suggestions, setSuggestions] = useState(null); // résultats matching
  const [matchLoading, setMatchLoading] = useState(false);
  const [assigning, setAssigning] = useState('');      // promoteurId en cours d'assignation
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  const loadEtudiants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatut) params.statut = filterStatut;
      const res = await etudiantsApi.list(params);
      setEtudiants(res.etudiants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatut]);

  useEffect(() => {
    loadEtudiants();
  }, [loadEtudiants]);

  async function openMatching(etudiant) {
    setSelected(etudiant);
    setSuggestions(null);
    setAssignSuccess('');
    setAssignError('');
    setMatchLoading(true);
    try {
      const res = await matchingApi.suggestions(etudiant.id);
      setSuggestions(res);
    } catch (err) {
      setSuggestions({ erreur: err.message });
    } finally {
      setMatchLoading(false);
    }
  }

  async function assign(promoteurId) {
    if (!selected) return;
    setAssigning(promoteurId);
    setAssignError('');
    setAssignSuccess('');
    try {
      await matchingApi.assigner(selected.id, promoteurId);
      setAssignSuccess('Promoteur assigné avec succès.');
      // Rafraîchir la liste et les suggestions
      await loadEtudiants();
      const res = await matchingApi.suggestions(selected.id);
      setSuggestions(res);
      // Mettre à jour l'étudiant sélectionné
      const updated = await etudiantsApi.get(selected.id);
      setSelected(updated);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning('');
    }
  }

  async function desassigner() {
    if (!selected) return;
    setAssignError('');
    setAssignSuccess('');
    try {
      await matchingApi.desassigner(selected.id);
      setAssignSuccess('Promoteur retiré.');
      await loadEtudiants();
      const res = await matchingApi.suggestions(selected.id);
      setSuggestions(res);
      const updated = await etudiantsApi.get(selected.id);
      setSelected(updated);
    } catch (err) {
      setAssignError(err.message);
    }
  }

  // Filtrage local rapide
  const displayed = etudiants.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.nom?.toLowerCase().includes(q) ||
      e.prenom?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      (e.titreMémoire || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Colonne principale ── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-auto transition-all ${selected ? 'pr-0' : ''}`}>
        <div className="p-8">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Étudiants</h1>
              <p className="text-slate-500 text-sm mt-0.5">{etudiants.length} étudiant{etudiants.length !== 1 ? 's' : ''} au total</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch />
              </span>
              <input
                className="input pl-9 h-9"
                placeholder="Rechercher par nom, sujet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-auto h-9 pr-8"
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_COURS">En cours</option>
              <option value="VALIDE">Validé</option>
              <option value="REJETE">Rejeté</option>
            </select>
          </div>

          {/* Erreur */}
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
                <p className="text-sm">Aucun étudiant trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header">Étudiant</th>
                      <th className="table-header">Sujet / domaines</th>
                      <th className="table-header">Promoteur</th>
                      <th className="table-header">Étape</th>
                      <th className="table-header">Statut</th>
                      <th className="table-header w-32">Matching</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayed.map((e) => (
                      <EtudiantRow
                        key={e.id}
                        etudiant={e}
                        isSelected={selected?.id === e.id}
                        onOpenMatching={openMatching}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Panneau de matching ── */}
      {selected && (
        <MatchingPanel
          etudiant={selected}
          suggestions={suggestions}
          loading={matchLoading}
          assigning={assigning}
          assignSuccess={assignSuccess}
          assignError={assignError}
          onAssign={assign}
          onDesassigner={desassigner}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Ligne du tableau
// ─────────────────────────────────────────────

function EtudiantRow({ etudiant: e, isSelected, onOpenMatching }) {
  const badge = statutBadge(e.statut);
  const domaines = Array.isArray(e.domaines) ? e.domaines : [];
  return (
    <tr
      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-ucl-sky' : ''}`}
    >
      {/* Étudiant */}
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ucl-blue/10 flex items-center justify-center text-ucl-blue text-xs font-bold shrink-0">
            {initiales(e.nom, e.prenom)}
          </div>
          <div>
            <p className="font-medium text-slate-800">{e.prenom} {e.nom}</p>
            <p className="text-xs text-slate-400">{e.email}</p>
          </div>
        </div>
      </td>

      {/* Sujet / domaines */}
      <td className="table-cell max-w-xs">
        <p className="text-slate-700 line-clamp-1 text-sm">
          {e.titreMémoire || <span className="text-slate-400 italic">Pas encore de sujet</span>}
        </p>
        {domaines.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {domaines.slice(0, 3).map((d) => (
              <span key={d} className="badge bg-ucl-sky text-ucl-blue">{d}</span>
            ))}
            {domaines.length > 3 && (
              <span className="badge bg-slate-100 text-slate-500">+{domaines.length - 3}</span>
            )}
          </div>
        )}
      </td>

      {/* Promoteur */}
      <td className="table-cell">
        {e.promoteur ? (
          <div>
            <p className="text-sm font-medium text-slate-700">
              {e.promoteur.prenom} {e.promoteur.nom}
            </p>
            <p className="text-xs text-slate-400">{e.promoteur.email}</p>
          </div>
        ) : (
          <span className="badge bg-yellow-50 text-yellow-700 border border-yellow-200">
            Non assigné
          </span>
        )}
      </td>

      {/* Étape */}
      <td className="table-cell">
        <span className="text-xs text-slate-600">
          {ETAPE_LABEL[e.etapeActuelle] || e.etapeActuelle}
        </span>
      </td>

      {/* Statut */}
      <td className="table-cell">
        <span className={`badge ${badge.bg} ${badge.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </td>

      {/* Action */}
      <td className="table-cell">
        <button
          onClick={() => onOpenMatching(e)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ucl-blue text-white text-xs font-medium rounded-lg hover:bg-ucl-light transition-colors"
        >
          <IconMatch className="w-3.5 h-3.5" />
          Matching
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Panneau de matching (slide-over)
// ─────────────────────────────────────────────

function MatchingPanel({ etudiant, suggestions, loading, assigning, assignSuccess, assignError, onAssign, onDesassigner, onClose }) {
  const domaines = Array.isArray(etudiant.domaines) ? etudiant.domaines : [];

  return (
    <aside className="w-[420px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      {/* En-tête du panneau */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ucl-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initiales(etudiant.nom, etudiant.prenom)}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{etudiant.prenom} {etudiant.nom}</p>
              <p className="text-xs text-slate-500 truncate max-w-48">
                {etudiant.titreMémoire || <span className="italic">Sans sujet</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Domaines de l'étudiant */}
        {domaines.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-xs text-slate-500 self-center mr-1">Domaines :</span>
            {domaines.map((d) => (
              <span key={d} className="badge bg-ucl-sky text-ucl-blue border border-blue-100">{d}</span>
            ))}
          </div>
        )}

        {/* Promoteur actuel */}
        {etudiant.promoteur && (
          <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-green-700">Promoteur actuel</p>
              <p className="text-xs text-green-600">{etudiant.promoteur.prenom} {etudiant.promoteur.nom}</p>
            </div>
            <button
              onClick={onDesassigner}
              className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              Retirer
            </button>
          </div>
        )}
      </div>

      {/* Titre */}
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">
          Promoteurs recommandés
          {suggestions && !suggestions.erreur && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({suggestions.totalPromoteursDispo} disponible{suggestions.totalPromoteursDispo !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Score = correspondance domaines (70%) + quota restant (30%)</p>
      </div>

      {/* Messages */}
      {(assignSuccess || assignError) && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs ${
          assignSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {assignSuccess || assignError}
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-ucl-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !suggestions ? null : suggestions.erreur ? (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {suggestions.erreur}
          </div>
        ) : suggestions.suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-4 text-center">
            <IconEmpty className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Aucun promoteur disponible</p>
            <p className="text-xs mt-1">Tous les promoteurs sont complets ou indisponibles</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 px-4 py-2">
            {suggestions.suggestions.map((s, i) => (
              <SuggestionItem
                key={s.promoteur.id}
                rank={i + 1}
                suggestion={s}
                isCurrentPromo={etudiant.promoteur?.id === s.promoteur.id}
                isAssigning={assigning === s.promoteur.id}
                onAssign={() => onAssign(s.promoteur.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// Ligne de suggestion dans le panneau matching
// ─────────────────────────────────────────────

function SuggestionItem({ rank, suggestion: s, isCurrentPromo, isAssigning, onAssign }) {
  const scoreClass = scoreColor(s.score);
  const barClass = scoreBarColor(s.score);
  const pct = Math.round(s.score * 100);

  return (
    <li className={`py-4 ${isCurrentPromo ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Rang */}
        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Nom + score */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">
                {s.promoteur.prenom} {s.promoteur.nom}
              </p>
              <p className="text-xs text-slate-400 truncate">{s.promoteur.email}</p>
            </div>
            <span className={`badge border font-bold text-sm px-2 py-1 shrink-0 ${scoreClass}`}>
              {pct}%
            </span>
          </div>

          {/* Barre de score globale */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
            <div className={`h-1.5 rounded-full ${barClass} transition-all`} style={{ width: `${pct}%` }} />
          </div>

          {/* Détail score */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <ScoreDetail
              label="Domaines"
              value={formatScore(s.domaineScore)}
              sub={s.domainesCommuns.length > 0 ? s.domainesCommuns.join(', ') : 'Aucun commun'}
              pct={s.domaineScore * 100}
            />
            <ScoreDetail
              label="Quota"
              value={`${s.quotaRestant}/${s.promoteur.quotaMax}`}
              sub="places restantes"
              pct={(s.quotaRestant / s.promoteur.quotaMax) * 100}
            />
          </div>

          {/* Domaines communs */}
          {s.domainesCommuns.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {s.domainesCommuns.map((d) => (
                <span key={d} className="badge bg-green-50 text-green-700 border border-green-200">{d}</span>
              ))}
            </div>
          )}

          {/* Bouton assigner */}
          {isCurrentPromo ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <IconCheck className="w-3.5 h-3.5" />
              Promoteur actuel
            </span>
          ) : (
            <button
              onClick={onAssign}
              disabled={isAssigning}
              className="w-full btn-primary justify-center text-xs py-1.5"
            >
              {isAssigning ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Assignation...
                </>
              ) : (
                <>
                  <IconAssign className="w-3.5 h-3.5" />
                  Assigner ce promoteur
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ScoreDetail({ label, value, sub, pct }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-sm font-bold text-slate-700">{value}</p>
      <p className="text-xs text-slate-400 truncate">{sub}</p>
      <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
        <div className="h-1 rounded-full bg-ucl-blue" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
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
function IconMatch({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
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
function IconEmpty({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}
function IconCheck({ className }) {
  return (
    <svg className={className || 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconAssign({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}
