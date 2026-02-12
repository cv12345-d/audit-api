'use client';

import { useEffect, useState, useCallback } from 'react';
import { etudiants as etudiantsApi, documents as documentsApi } from '@/lib/api';

const ETAPE_LABEL = {
  DEPOT_SUJET: 'Dépôt du sujet', VALIDATION_SUJET: 'Validation', DEPOT_PLAN: 'Plan',
  FEEDBACK_PLAN: 'Feedback', DEPOT_INTERMEDIAIRE: 'Intermédiaire', DEPOT_FINAL: 'Final',
};

export default function PromoteurHome() {
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await etudiantsApi.list();
      setEtudiants(res.etudiants || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function selectEtudiant(e) {
    if (selectedId === e.id) { setSelectedId(null); setSelectedDocs([]); return; }
    setSelectedId(e.id);
    setDocsLoading(true);
    try {
      const res = await documentsApi.etudiant(e.id);
      setSelectedDocs(res.documents || []);
    } finally {
      setDocsLoading(false);
    }
  }

  async function handleDownload(doc) {
    setDownloading(doc.id);
    try { await documentsApi.telecharger(doc.id, doc.nom); }
    catch (err) { console.error(err); }
    finally { setDownloading(''); }
  }

  const displayed = etudiants.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.nom?.toLowerCase().includes(q) || e.prenom?.toLowerCase().includes(q) ||
      (e.titreMémoire || '').toLowerCase().includes(q);
  });

  const selectedEtudiant = etudiants.find((e) => e.id === selectedId);

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mes mémorants</h1>
        <p className="text-slate-500 text-sm mt-1">
          {etudiants.length} étudiant{etudiants.length !== 1 ? 's' : ''} sous votre encadrement
        </p>
      </div>

      {/* Stats rapides */}
      {etudiants.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MiniStat label="En cours" value={etudiants.filter(e => e.statut === 'EN_COURS').length} color="bg-blue-100 text-blue-700" />
          <MiniStat label="En attente" value={etudiants.filter(e => e.statut === 'EN_ATTENTE').length} color="bg-yellow-100 text-yellow-700" />
          <MiniStat label="Validés" value={etudiants.filter(e => e.statut === 'VALIDE').length} color="bg-green-100 text-green-700" />
        </div>
      )}

      <div className="flex gap-6">
        {/* ── Liste étudiants ── */}
        <div className="flex-1 min-w-0">
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
            <input className="input pl-9 h-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="card flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">{etudiants.length === 0 ? 'Aucun étudiant assigné pour le moment.' : 'Aucun résultat.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((e) => (
                <EtudiantRow
                  key={e.id}
                  etudiant={e}
                  isSelected={selectedId === e.id}
                  onSelect={() => selectEtudiant(e)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Panneau documents ── */}
        {selectedId && (
          <div className="w-80 shrink-0">
            <div className="card sticky top-8">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{selectedEtudiant?.prenom} {selectedEtudiant?.nom}</p>
                    <p className="text-xs text-slate-500 truncate max-w-48">
                      {selectedEtudiant?.titreMémoire || <span className="italic">Sans sujet</span>}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedId(null); setSelectedDocs([]); }} className="text-slate-400 hover:text-slate-600">
                    <IconClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Documents déposés</p>
                {docsLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : selectedDocs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Aucun document déposé.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedDocs.map((doc) => (
                      <DocItem key={doc.id} doc={doc} onDownload={handleDownload} downloading={downloading} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composants ──────────────────────────────

function EtudiantRow({ etudiant: e, isSelected, onSelect }) {
  const domaines = Array.isArray(e.domaines) ? e.domaines : [];
  const STATUT = { EN_ATTENTE: ['bg-yellow-100 text-yellow-800', 'En attente'], EN_COURS: ['bg-blue-100 text-blue-800', 'En cours'], VALIDE: ['bg-green-100 text-green-800', 'Validé'], REJETE: ['bg-red-100 text-red-800', 'Rejeté'] };
  const [cls, label] = STATUT[e.statut] || ['bg-slate-100 text-slate-600', e.statut];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left card p-4 hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-violet-400 shadow-violet-100' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-sm font-bold shrink-0">
          {e.prenom?.charAt(0)}{e.nom?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-800 text-sm">{e.prenom} {e.nom}</p>
            <span className={`badge ${cls} shrink-0`}>{label}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {e.titreMémoire || <span className="italic text-slate-400">Pas encore de sujet</span>}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
              {ETAPE_LABEL[e.etapeActuelle] || e.etapeActuelle}
            </span>
            {domaines.length > 0 && domaines.slice(0, 2).map((d) => (
              <span key={d} className="text-xs text-slate-400">{d}</span>
            ))}
          </div>
        </div>
        <IconChevron className={`w-4 h-4 text-slate-300 shrink-0 mt-1 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );
}

function DocItem({ doc, onDownload, downloading }) {
  const isDown = downloading === doc.id;
  const date = new Date(doc.createdAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
  return (
    <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
      <div className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
        <IconFile className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">{doc.nom}</p>
        <p className="text-xs text-slate-400">{doc.etape} · {date}</p>
      </div>
      <button onClick={() => onDownload(doc)} disabled={isDown} className="p-1 text-slate-400 hover:text-violet-600 transition-colors disabled:opacity-50">
        {isDown ? <span className="w-3.5 h-3.5 border border-violet-400 border-t-transparent rounded-full animate-spin inline-block" /> : <IconDownload className="w-3.5 h-3.5" />}
      </button>
    </li>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className={`card p-4 flex items-center gap-3 ${color.split(' ')[0]}/20`}>
      <span className={`text-2xl font-bold ${color.split(' ')[1]}`}>{value}</span>
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  );
}

function IconSearch() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>; }
function IconFile({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>; }
function IconDownload({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>; }
function IconChevron({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>; }
function IconClose({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>; }
