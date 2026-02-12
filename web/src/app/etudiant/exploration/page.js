'use client';

import { useEffect, useState } from 'react';
import { matching as matchingApi, promoteurs as promoteursApi } from '@/lib/api';
import { formatScore, scoreBarColor } from '@/lib/utils';

export default function ExplorationPage() {
  const [etudiantId, setEtudiantId] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [tousPromoteurs, setTousPromoteurs] = useState([]);
  const [hasDomaines, setHasDomaines] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // id du promoteur affiché en détail

  useEffect(() => {
    const stored = localStorage.getItem('thesismatch_user');
    if (!stored) return;
    const user = JSON.parse(stored);
    const id = user.profil?.id;

    const calls = [promoteursApi.list()];
    if (id) {
      setEtudiantId(id);
      calls.push(matchingApi.suggestions(id));
    }

    Promise.all(calls).then(([pRes, mRes]) => {
      setTousPromoteurs(pRes.promoteurs || []);
      if (mRes) {
        setSuggestions(mRes);
        const domaines = mRes.etudiant?.domaines || [];
        setHasDomaines(domaines.length > 0);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = tousPromoteurs.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const domaines = Array.isArray(p.domaines) ? p.domaines : [];
    return (
      p.nom?.toLowerCase().includes(q) ||
      p.prenom?.toLowerCase().includes(q) ||
      domaines.some((d) => d.toLowerCase().includes(q))
    );
  });

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Explorer</h1>
        <p className="text-slate-500 text-sm mt-1">Découvrez les promoteurs disponibles et leurs domaines.</p>
      </div>

      {/* ── Section suggestions personnalisées ── */}
      {etudiantId && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">✦</div>
            <h2 className="font-bold text-slate-800">Suggestions pour vous</h2>
          </div>

          {!hasDomaines ? (
            <div className="card p-5 bg-amber-50 border-amber-100">
              <p className="text-sm font-medium text-amber-800">Ajoutez des domaines à votre projet pour recevoir des suggestions personnalisées.</p>
              <a href="/etudiant/profil" className="text-xs text-amber-600 hover:underline mt-1 block">→ Compléter mon projet</a>
            </div>
          ) : suggestions?.suggestions?.length === 0 ? (
            <div className="card p-5 text-center text-slate-500">
              <p className="text-sm">Aucun promoteur disponible pour l'instant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(suggestions?.suggestions || []).slice(0, 5).map((s, i) => (
                <SuggestionCard
                  key={s.promoteur.id}
                  rank={i + 1}
                  suggestion={s}
                  isExpanded={expanded === s.promoteur.id}
                  onToggle={() => setExpanded(expanded === s.promoteur.id ? null : s.promoteur.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Tous les promoteurs ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800">Tous les promoteurs</h2>
          <span className="text-sm text-slate-400">{tousPromoteurs.length} au total</span>
        </div>

        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
          <input
            className="input pl-9"
            placeholder="Rechercher par nom ou domaine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-center text-slate-400 py-8">Aucun résultat</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <PromoteurCard
                key={p.id}
                promoteur={p}
                isExpanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Suggestion card (avec score) ────────────

function SuggestionCard({ rank, suggestion: s, isExpanded, onToggle }) {
  const pct = Math.round(s.score * 100);
  const barColor = scoreBarColor(s.score);
  const scoreLabel = pct >= 70 ? 'Excellente correspondance' : pct >= 40 ? 'Bonne correspondance' : 'Correspondance partielle';
  const scoreEmoji = pct >= 70 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
  const domaines = s.promoteur.domaines || [];
  const dispo = s.promoteur.disponible && s.quotaRestant > 0;

  return (
    <div className="card overflow-hidden">
      <button className="w-full text-left p-4" onClick={onToggle}>
        <div className="flex items-start gap-3">
          {/* Rang */}
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0 mt-0.5">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-800">{s.promoteur.prenom} {s.promoteur.nom}</p>
              <span className="text-lg font-bold text-emerald-600 shrink-0">{pct}%</span>
            </div>
            {/* Barre de score */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 my-1.5">
              <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-500">{scoreEmoji} {scoreLabel}</p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Score détaillé */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-xs text-slate-500">Domaines</p>
              <p className="text-lg font-bold text-slate-700">{Math.round(s.domaineScore * 100)}%</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-xs text-slate-500">Places restantes</p>
              <p className="text-lg font-bold text-slate-700">{s.quotaRestant}<span className="text-sm text-slate-400">/{s.promoteur.quotaMax}</span></p>
            </div>
          </div>

          {/* Domaines communs */}
          {s.domainesCommuns?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Domaines en commun avec votre projet</p>
              <div className="flex flex-wrap gap-1">
                {s.domainesCommuns.map((d) => (
                  <span key={d} className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tous les domaines du promoteur */}
          {domaines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Domaines de recherche</p>
              <div className="flex flex-wrap gap-1">
                {domaines.map((d) => (
                  <span key={d} className={`badge border ${s.domainesCommuns?.includes(d) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{d}</span>
                ))}
              </div>
            </div>
          )}

          <div className={`text-xs px-3 py-2 rounded-lg ${dispo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {dispo ? '✓ Disponible pour encadrement' : '✗ Non disponible ou quota atteint'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Promoteur card (sans score) ─────────────

function PromoteurCard({ promoteur: p, isExpanded, onToggle }) {
  const domaines = Array.isArray(p.domaines) ? p.domaines : [];
  const dispo = p.disponible && p.quotaActuel < p.quotaMax;
  const pct = p.quotaMax > 0 ? Math.round((p.quotaActuel / p.quotaMax) * 100) : 0;

  return (
    <div className="card overflow-hidden">
      <button className="w-full text-left p-4" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
            {p.prenom?.charAt(0)}{p.nom?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-800 text-sm">{p.prenom} {p.nom}</p>
              <span className={`badge shrink-0 ${dispo ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500'}`}>
                {dispo ? 'Disponible' : 'Complet'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {domaines.slice(0, 3).map((d) => (
                <span key={d} className="badge bg-slate-100 text-slate-600">{d}</span>
              ))}
              {domaines.length > 3 && <span className="badge bg-slate-100 text-slate-400">+{domaines.length - 3}</span>}
            </div>
          </div>
          <IconChevron className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {domaines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Domaines de recherche</p>
              <div className="flex flex-wrap gap-1">
                {domaines.map((d) => <span key={d} className="badge bg-slate-100 text-slate-700 border border-slate-200">{d}</span>)}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">Capacité d'encadrement</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-600 w-14 text-right">{p.quotaActuel}/{p.quotaMax}</span>
            </div>
          </div>
          {p.biographie && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{p.biographie}</p>}
        </div>
      )}
    </div>
  );
}

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function IconSearch() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>; }
function IconChevron({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>; }
