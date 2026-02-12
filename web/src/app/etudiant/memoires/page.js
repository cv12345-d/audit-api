'use client';

import { useState, useEffect, useCallback } from 'react';
import { memoires as memoiresApi } from '@/lib/api';

const DOMAINES_POPULAIRES = ['Communication', 'Médias', 'Journalisme', 'Politique', 'Publicité', 'Numérique', 'Culture', 'Santé'];

export default function MemoiresPage() {
  const [memoiresList, setMemoiresList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [domaineFiltres, setDomaineFiltres] = useState([]);
  const [annee, setAnnee] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.q = search;
      if (annee) params.annee = annee;
      if (domaineFiltres.length === 1) params.domaine = domaineFiltres[0];
      const res = await memoiresApi.list(params);
      let items = res.memoires || [];
      // Filtrage multi-domaines côté client si plusieurs sélectionnés
      if (domaineFiltres.length > 1) {
        items = items.filter((m) => {
          const d = Array.isArray(m.domaines) ? m.domaines : [];
          return domaineFiltres.some((f) => d.some((x) => x.toLowerCase().includes(f.toLowerCase())));
        });
      }
      setMemoiresList(items);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, annee, domaineFiltres, page]);

  useEffect(() => { load(); }, [load]);

  function toggleDomaine(d) {
    setPage(1);
    setDomaineFiltres((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  const annees = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 10; y--) annees.push(y);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Mémoires antérieurs</h1>
        <p className="text-slate-500 text-sm mt-1">Inspirez-vous des travaux des années précédentes.</p>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
        <input
          className="input pl-9"
          placeholder="Rechercher par titre, auteur, résumé..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Filtres domaines */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {DOMAINES_POPULAIRES.map((d) => (
          <button
            key={d}
            onClick={() => toggleDomaine(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              domaineFiltres.includes(d)
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Filtre année */}
      <div className="flex items-center gap-2 mb-5">
        <select
          className="input w-auto text-sm h-9"
          value={annee}
          onChange={(e) => { setAnnee(e.target.value); setPage(1); }}
        >
          <option value="">Toutes les années</option>
          {annees.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-slate-400">{total} résultat{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : memoiresList.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-sm">Aucun mémoire ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memoiresList.map((m) => (
            <MemoireCard
              key={m.id}
              memoire={m}
              isExpanded={expanded === m.id}
              onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >← Précédent</button>
          <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >Suivant →</button>
        </div>
      )}
    </div>
  );
}

// ─── Carte mémoire ────────────────────────────

function MemoireCard({ memoire: m, isExpanded, onToggle }) {
  const domaines = Array.isArray(m.domaines) ? m.domaines : [];

  return (
    <div className="card overflow-hidden">
      <button className="w-full text-left p-4" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
            <IconBook />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm line-clamp-2">{m.titre}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span>{m.auteur}</span>
              <span>·</span>
              <span>{m.annee}</span>
              <span>·</span>
              <span className="truncate">{m.promoteur}</span>
            </div>
            {domaines.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {domaines.slice(0, 3).map((d) => (
                  <span key={d} className="badge bg-amber-50 text-amber-700 border border-amber-100 text-xs">{d}</span>
                ))}
              </div>
            )}
          </div>
          <IconChevron className={`w-4 h-4 text-slate-300 shrink-0 transition-transform mt-1 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {m.resume ? (
            <>
              <p className="text-xs font-semibold text-slate-500 mb-2">Résumé</p>
              <p className="text-sm text-slate-700 leading-relaxed">{m.resume}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 italic">Pas de résumé disponible.</p>
          )}

          {domaines.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Domaines</p>
              <div className="flex flex-wrap gap-1">
                {domaines.map((d) => <span key={d} className="badge bg-amber-50 text-amber-700 border border-amber-100">{d}</span>)}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {m.mention && <div><span className="text-slate-400">Mention : </span><span className="font-medium text-slate-700">{m.mention}</span></div>}
            {m.note && <div><span className="text-slate-400">Note : </span><span className="font-medium text-slate-700">{m.note}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function IconSearch() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>; }
function IconBook() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>; }
function IconChevron({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>; }
