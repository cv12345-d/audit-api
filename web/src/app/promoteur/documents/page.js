'use client';

import { useEffect, useState, useCallback } from 'react';
import { etudiants as etudiantsApi, documents as documentsApi } from '@/lib/api';

const ETAPE_LABEL = {
  DEPOT_SUJET: 'Dépôt du sujet', VALIDATION_SUJET: 'Validation', DEPOT_PLAN: 'Plan',
  FEEDBACK_PLAN: 'Feedback', DEPOT_INTERMEDIAIRE: 'Intermédiaire', DEPOT_FINAL: 'Final',
};

export default function PromoteurDocuments() {
  const [etudiants, setEtudiants] = useState([]);
  const [docs, setDocs] = useState({});          // { etudiantId: [doc, ...] }
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [search, setSearch] = useState('');
  const [etapeFilter, setEtapeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await etudiantsApi.list();
      const list = res.etudiants || [];
      setEtudiants(list);

      // Fetch documents for each student in parallel
      const entries = await Promise.all(
        list.map(async (e) => {
          try {
            const r = await documentsApi.etudiant(e.id);
            return [e.id, r.documents || []];
          } catch {
            return [e.id, []];
          }
        })
      );
      setDocs(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDownload(doc) {
    setDownloading(doc.id);
    try { await documentsApi.telecharger(doc.id, doc.nom); }
    catch (err) { console.error(err); }
    finally { setDownloading(''); }
  }

  // Flatten all docs with student info
  const allDocs = etudiants.flatMap((e) =>
    (docs[e.id] || []).map((d) => ({ ...d, etudiant: e }))
  );

  const filtered = allDocs.filter((d) => {
    if (etapeFilter && d.etape !== etapeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.nom?.toLowerCase().includes(q) ||
        d.etudiant?.nom?.toLowerCase().includes(q) ||
        d.etudiant?.prenom?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const etapesPresentes = [...new Set(allDocs.map((d) => d.etape))].filter(Boolean);

  const totalDocs = allDocs.length;
  const etudiantsAvecDocs = etudiants.filter((e) => (docs[e.id] || []).length > 0).length;

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
        <p className="text-slate-500 text-sm mt-1">
          {totalDocs} document{totalDocs !== 1 ? 's' : ''} déposé{totalDocs !== 1 ? 's' : ''} par {etudiantsAvecDocs} étudiant{etudiantsAvecDocs !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
          <input
            className="input pl-9 h-9 w-full"
            placeholder="Rechercher un document ou un étudiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input h-9 w-auto pr-8"
          value={etapeFilter}
          onChange={(e) => setEtapeFilter(e.target.value)}
        >
          <option value="">Toutes les étapes</option>
          {etapesPresentes.map((ep) => (
            <option key={ep} value={ep}>{ETAPE_LABEL[ep] || ep}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 text-slate-400">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-sm">
            {totalDocs === 0 ? 'Aucun document déposé pour le moment.' : 'Aucun résultat pour ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onDownload={handleDownload}
              downloading={downloading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, onDownload, downloading }) {
  const isDown = downloading === doc.id;
  const date = new Date(doc.createdAt).toLocaleDateString('fr-BE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const e = doc.etudiant;

  return (
    <div className="card p-4 flex items-center gap-4">
      {/* Icône fichier */}
      <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center shrink-0">
        <IconFile className="w-5 h-5 text-violet-500" />
      </div>

      {/* Infos document */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{doc.nom}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-500">{date}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
            {ETAPE_LABEL[doc.etape] || doc.etape}
          </span>
        </div>
      </div>

      {/* Étudiant */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
          {e?.prenom?.charAt(0)}{e?.nom?.charAt(0)}
        </div>
        <span className="text-sm text-slate-600">{e?.prenom} {e?.nom}</span>
      </div>

      {/* Bouton télécharger */}
      <button
        onClick={() => onDownload(doc)}
        disabled={isDown}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
      >
        {isDown
          ? <span className="w-4 h-4 border border-violet-400 border-t-transparent rounded-full animate-spin inline-block" />
          : <IconDownload className="w-4 h-4" />
        }
        <span className="hidden sm:inline">Télécharger</span>
      </button>
    </div>
  );
}

function IconSearch() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>; }
function IconFile({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>; }
function IconDownload({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>; }
