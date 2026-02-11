'use client';

import { useEffect, useState, useRef } from 'react';
import { etudiants as etudiantsApi, workflow as workflowApi, documents as documentsApi } from '@/lib/api';

const ETAPE_LABEL = {
  DEPOT_SUJET:         'Dépôt du sujet',
  VALIDATION_SUJET:    'Validation du sujet',
  DEPOT_PLAN:          'Dépôt du plan',
  FEEDBACK_PLAN:       'Feedback sur le plan',
  DEPOT_INTERMEDIAIRE: 'Dépôt intermédiaire',
  DEPOT_FINAL:         'Dépôt final',
};

const ETAPE_DESC = {
  DEPOT_SUJET:         'Déposez votre proposition de sujet de mémoire avec une brève description.',
  VALIDATION_SUJET:    'Votre sujet est en cours d\'examen par la direction du master.',
  DEPOT_PLAN:          'Déposez le plan détaillé de votre mémoire.',
  FEEDBACK_PLAN:       'Votre promoteur va vous faire un retour sur votre plan.',
  DEPOT_INTERMEDIAIRE: 'Déposez une version intermédiaire de votre mémoire pour feedback.',
  DEPOT_FINAL:         'Déposez la version finale et complète de votre mémoire.',
};

export default function SuiviPage() {
  const [etudiant, setEtudiant] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [etudiantId, setEtudiantId] = useState(null);

  // Upload
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('thesismatch_user');
    if (!stored) { setLoading(false); return; }
    const user = JSON.parse(stored);
    const id = user.profil?.id;
    if (!id) { setLoading(false); return; }
    setEtudiantId(id);

    Promise.all([
      etudiantsApi.get(id),
      workflowApi.etapes(),
      documentsApi.etudiant(id),
    ]).then(([e, w, d]) => {
      setEtudiant(e);
      setEtapes((w.etapes || []).sort((a, b) => a.ordre - b.ordre));
      setDocs(d.documents || []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !etudiantId || !etudiant) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      await documentsApi.upload(etudiantId, file, etudiant.etapeActuelle, file.name);
      setUploadSuccess('Document déposé avec succès !');
      // Rafraîchir les docs
      const d = await documentsApi.etudiant(etudiantId);
      setDocs(d.documents || []);
      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDownload(doc) {
    setDownloading(doc.id);
    try {
      await documentsApi.telecharger(doc.id, doc.nom);
    } catch (err) {
      console.error('Erreur téléchargement:', err);
    } finally {
      setDownloading('');
    }
  }

  if (loading) return <PageLoader />;

  if (!etudiant) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-12 text-center text-slate-500">
        <p className="text-sm">Votre profil étudiant n'est pas encore configuré.</p>
      </div>
    );
  }

  const idxCourant = etapes.findIndex((e) => e.code === etudiant.etapeActuelle);
  const docsCourants = docs.filter((d) => d.etape === etudiant.etapeActuelle);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Mon suivi</h1>
        <p className="text-slate-500 text-sm mt-1">Progression par étapes et dépôt de documents.</p>
      </div>

      {/* Barre de progression */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-600">Progression globale</span>
          <span className="text-sm font-bold text-emerald-600">
            {etapes.length > 0 ? Math.round(((idxCourant + 1) / etapes.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
          <div
            className="h-2.5 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${etapes.length > 0 ? Math.round(((idxCourant + 1) / etapes.length) * 100) : 0}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge statut={etudiant.statut} />
          {etudiant.promoteur && (
            <span className="text-xs text-slate-500">· Promoteur : <span className="font-medium text-slate-700">{etudiant.promoteur.prenom} {etudiant.promoteur.nom}</span></span>
          )}
        </div>
      </div>

      {/* Timeline des étapes */}
      <div className="space-y-3 mb-8">
        {etapes.map((etape, i) => {
          const isCourant = etape.code === etudiant.etapeActuelle;
          const isDone = i < idxCourant;
          const isFutur = i > idxCourant;
          const docsEtape = docs.filter((d) => d.etape === etape.code);

          return (
            <EtapeCard
              key={etape.id}
              etape={etape}
              numero={i + 1}
              isCourant={isCourant}
              isDone={isDone}
              isFutur={isFutur}
              docs={docsEtape}
              onDownload={handleDownload}
              downloading={downloading}
            />
          );
        })}
      </div>

      {/* Zone de dépôt — étape courante */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-800 mb-1">
          Déposer un document
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Étape en cours : <span className="font-medium text-slate-700">
            {ETAPE_LABEL[etudiant.etapeActuelle] || etudiant.etapeActuelle}
          </span>
        </p>

        {/* Zone de drop */}
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
            uploading ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.txt,.jpg,.png"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-emerald-600 font-medium">Envoi en cours...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3 text-slate-400">
                <IconUpload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700 text-center">Cliquez pour sélectionner un fichier</p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word, images — max 20 Mo</p>
            </>
          )}
        </label>

        {uploadError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{uploadError}</p>
        )}
        {uploadSuccess && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
            ✓ {uploadSuccess}
          </p>
        )}

        {/* Documents déposés pour cette étape */}
        {docsCourants.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Documents déposés pour cette étape</p>
            <ul className="space-y-1.5">
              {docsCourants.map((doc) => (
                <DocItem key={doc.id} doc={doc} onDownload={handleDownload} downloading={downloading} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composants ──────────────────────────────

function EtapeCard({ etape, numero, isCourant, isDone, isFutur, docs, onDownload, downloading }) {
  const [open, setOpen] = useState(isCourant);

  return (
    <div className={`card overflow-hidden transition-all ${
      isCourant ? 'border-emerald-200 shadow-emerald-100' : ''
    }`}>
      <button className="w-full text-left p-4" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          {/* Indicateur */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
            isDone ? 'bg-emerald-100 text-emerald-700' :
            isCourant ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
            'bg-slate-100 text-slate-400'
          }`}>
            {isDone ? '✓' : numero}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isFutur ? 'text-slate-400' : 'text-slate-800'}`}>
              {ETAPE_LABEL[etape.code] || etape.label}
            </p>
            {isCourant && (
              <p className="text-xs text-emerald-600 font-medium">Étape en cours</p>
            )}
            {isDone && (
              <p className="text-xs text-emerald-500">Complétée · {docs.length} document{docs.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          {!isFutur && (
            <IconChevron className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {open && !isFutur && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-sm text-slate-600 mb-3">
            {ETAPE_DESC[etape.code] || etape.description || 'Suivez les instructions de votre promoteur.'}
          </p>
          {docs.length > 0 ? (
            <ul className="space-y-1.5">
              {docs.map((doc) => (
                <DocItem key={doc.id} doc={doc} onDownload={onDownload} downloading={downloading} />
              ))}
            </ul>
          ) : (
            !isCourant && <p className="text-xs text-slate-400 italic">Aucun document déposé pour cette étape.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DocItem({ doc, onDownload, downloading }) {
  const isDownloading = downloading === doc.id;
  const taille = doc.taille ? `${Math.round(doc.taille / 1024)} Ko` : '';
  const date = new Date(doc.createdAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
        <IconFile className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">{doc.nom}</p>
        <p className="text-xs text-slate-400">{date}{taille && ` · ${taille}`}</p>
      </div>
      <button
        onClick={() => onDownload(doc)}
        disabled={isDownloading}
        className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
        title="Télécharger"
      >
        {isDownloading ? (
          <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin inline-block" />
        ) : (
          <IconDownload className="w-4 h-4" />
        )}
      </button>
    </li>
  );
}

function StatusBadge({ statut }) {
  const cfg = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
    EN_COURS:   'bg-blue-100 text-blue-800',
    VALIDE:     'bg-green-100 text-green-800',
    REJETE:     'bg-red-100 text-red-800',
  };
  const labels = { EN_ATTENTE: 'En attente', EN_COURS: 'En cours', VALIDE: 'Validé', REJETE: 'Rejeté' };
  return (
    <span className={`badge ${cfg[statut] || 'bg-slate-100 text-slate-600'}`}>
      {labels[statut] || statut}
    </span>
  );
}

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function IconUpload({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>; }
function IconFile({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>; }
function IconDownload({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>; }
function IconChevron({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>; }
