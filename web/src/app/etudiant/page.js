'use client';

import { useEffect, useState } from 'react';
import { etudiants as etudiantsApi, workflow as workflowApi } from '@/lib/api';
import Link from 'next/link';

const ETAPE_LABEL = {
  DEPOT_SUJET:         'Dépôt du sujet',
  VALIDATION_SUJET:    'Validation du sujet',
  DEPOT_PLAN:          'Dépôt du plan',
  FEEDBACK_PLAN:       'Feedback sur le plan',
  DEPOT_INTERMEDIAIRE: 'Dépôt intermédiaire',
  DEPOT_FINAL:         'Dépôt final',
};

export default function EtudiantHome() {
  const [etudiant, setEtudiant] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('thesismatch_user');
    if (!stored) return;
    const user = JSON.parse(stored);
    const etudiantId = user.profil?.id;
    if (!etudiantId) { setLoading(false); return; }

    Promise.all([
      etudiantsApi.get(etudiantId),
      workflowApi.etapes(),
    ]).then(([e, w]) => {
      setEtudiant(e);
      setEtapes((w.etapes || []).sort((a, b) => a.ordre - b.ordre));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const user = JSON.parse(localStorage.getItem('thesismatch_user') || '{}');

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      {/* Message de bienvenue */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white mb-6 shadow-lg shadow-emerald-100">
        <p className="text-emerald-100 text-sm mb-1">Bonjour 👋</p>
        <h1 className="text-2xl font-bold mb-1">{user.prenom} {user.nom}</h1>
        <p className="text-emerald-100 text-sm">
          {etudiant?.programme || 'Master en communication'} · {etudiant?.annee || ''}
        </p>
      </div>

      {/* Statut du mémoire */}
      {etudiant ? (
        <>
          {/* Étape actuelle */}
          <EtapeActuelleCard etudiant={etudiant} etapes={etapes} />

          {/* Promoteur */}
          <PromoteurCard promoteur={etudiant.promoteur} />

          {/* Sujet du mémoire */}
          {etudiant.titreMémoire ? (
            <div className="card p-5 mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Votre sujet</p>
              <p className="font-semibold text-slate-800">{etudiant.titreMémoire}</p>
              {(etudiant.domaines?.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {etudiant.domaines.map((d) => (
                    <span key={d} className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">{d}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link href="/etudiant/profil" className="block card p-5 mb-4 border-dashed border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <IconPencil className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700">Décrivez votre projet de mémoire</p>
                  <p className="text-sm text-emerald-600/80">Titre, résumé, domaines — cela aide à trouver votre promoteur idéal</p>
                </div>
                <IconArrow className="w-5 h-5 text-emerald-400 ml-auto shrink-0" />
              </div>
            </Link>
          )}
        </>
      ) : (
        <div className="card p-6 text-center text-slate-500 mb-4">
          <p className="text-sm">Votre profil étudiant n'est pas encore configuré.</p>
          <p className="text-xs mt-1">Contactez la direction du master.</p>
        </div>
      )}

      {/* Raccourcis */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Accès rapides</h2>
      <div className="grid grid-cols-2 gap-3">
        <QuickLink href="/etudiant/exploration" icon={<IconCompass />} color="bg-sky-50 text-sky-600" title="Explorer" sub="Promoteurs & matching" />
        <QuickLink href="/etudiant/memoires" icon={<IconBook />} color="bg-amber-50 text-amber-600" title="Mémoires" sub="Travaux antérieurs" />
        <QuickLink href="/etudiant/suivi" icon={<IconProgress />} color="bg-violet-50 text-violet-600" title="Mon suivi" sub="Étapes & documents" />
        <QuickLink href="/etudiant/profil" icon={<IconPencil />} color="bg-rose-50 text-rose-600" title="Mon projet" sub="Éditer mon profil" />
      </div>
    </div>
  );
}

// ─── Composants ──────────────────────────────

function EtapeActuelleCard({ etudiant, etapes }) {
  const idx = etapes.findIndex((e) => e.code === etudiant.etapeActuelle);
  const total = etapes.length;
  const etapeCourante = etapes[idx];
  const pct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0;

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Avancement</p>
        <span className="text-sm font-bold text-emerald-600">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
        <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
          {idx + 1}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            {etapeCourante ? ETAPE_LABEL[etapeCourante.code] || etapeCourante.label : etudiant.etapeActuelle}
          </p>
          <p className="text-xs text-slate-400">
            Étape {idx + 1} sur {total} · Statut : {
              { EN_ATTENTE: 'en attente', EN_COURS: 'en cours', VALIDE: 'validé', REJETE: 'rejeté' }[etudiant.statut] || etudiant.statut
            }
          </p>
        </div>
        <Link href="/etudiant/suivi" className="ml-auto text-emerald-600 hover:text-emerald-700">
          <IconArrow className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function PromoteurCard({ promoteur }) {
  if (!promoteur) {
    return (
      <div className="card p-4 mb-4 bg-amber-50 border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
            <IconAlert className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Pas encore de promoteur assigné</p>
            <p className="text-xs text-amber-600">La direction du master s'en chargera bientôt.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="card p-4 mb-4 bg-green-50 border-green-100">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
          {promoteur.prenom?.charAt(0)}{promoteur.nom?.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Votre promoteur</p>
          <p className="font-semibold text-green-800 text-sm">{promoteur.prenom} {promoteur.nom}</p>
          <p className="text-xs text-green-600">{promoteur.email}</p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, color, title, sub }) {
  return (
    <Link href={href} className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
    </Link>
  );
}

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
}

// Icônes inline
function IconPencil({ className }) { return <svg className={className || 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>; }
function IconCompass() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconBook() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>; }
function IconProgress() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>; }
function IconArrow({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>; }
function IconAlert({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>; }
