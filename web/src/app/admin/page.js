'use client';

import { useEffect, useState } from 'react';
import { stats as statsApi } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    statsApi.global()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} />;

  const { etudiants: e, promoteurs: p } = data;

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500 text-sm mt-1">Vue d'ensemble — École de communication UCLouvain</p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Étudiants total"
          value={e.total}
          sub={`${e.avecPromoteur} assigné${e.avecPromoteur > 1 ? 's' : ''}`}
          color="blue"
          icon={<IconUsers />}
        />
        <StatCard
          title="Sans promoteur"
          value={e.sansPromoteur}
          sub={e.sansPromoteur > 0 ? 'En attente d\'assignation' : 'Tous assignés ✓'}
          color={e.sansPromoteur > 0 ? 'yellow' : 'green'}
          icon={<IconAlert />}
        />
        <StatCard
          title="Promoteurs actifs"
          value={p.total}
          sub={`${p.disponibles} disponible${p.disponibles > 1 ? 's' : ''}`}
          color="indigo"
          icon={<IconProf />}
        />
        <StatCard
          title="Capacité utilisée"
          value={`${p.tauxRemplissageGlobal}%`}
          sub={`${p.totalEncadrements} / ${p.totalCapacite} encadrements`}
          color={p.tauxRemplissageGlobal > 90 ? 'red' : p.tauxRemplissageGlobal > 70 ? 'yellow' : 'green'}
          icon={<IconChart />}
        />
      </div>

      {/* Taux d'assignation */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">Taux d'assignation des étudiants</h2>
          <span className="text-2xl font-bold text-ucl-blue">{e.tauxAssignation}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all bg-ucl-blue"
            style={{ width: `${e.tauxAssignation}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {e.avecPromoteur} étudiant{e.avecPromoteur > 1 ? 's' : ''} assigné{e.avecPromoteur > 1 ? 's' : ''} sur {e.total}
        </p>
      </div>

      {/* Répartition par statut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Répartition par statut</h2>
          <div className="space-y-2">
            {Object.entries(e.parStatut || {}).map(([statut, count]) => (
              <StatutRow key={statut} statut={statut} count={count} total={e.total} />
            ))}
            {Object.keys(e.parStatut || {}).length === 0 && (
              <p className="text-sm text-slate-400">Aucune donnée</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Répartition par étape</h2>
          <div className="space-y-2">
            {Object.entries(e.parEtape || {}).map(([etape, count]) => (
              <EtapeRow key={etape} etape={etape} count={count} total={e.total} />
            ))}
            {Object.keys(e.parEtape || {}).length === 0 && (
              <p className="text-sm text-slate-400">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Link href="/admin/etudiants" className="card p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ucl-sky rounded-xl flex items-center justify-center group-hover:bg-ucl-blue/10 transition-colors">
              <span className="text-ucl-blue"><IconUsers /></span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Gérer les étudiants</p>
              <p className="text-xs text-slate-500">Assignation, matching, suivi</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/promoteurs" className="card p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <span className="text-indigo-600"><IconProf /></span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Gérer les promoteurs</p>
              <p className="text-xs text-slate-500">Quotas, domaines, disponibilité</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────

const COLORS = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500'  },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500'    },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500' },
};

function StatCard({ title, value, sub, color, icon }) {
  const c = COLORS[color] || COLORS.blue;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

const STATUT_UI = {
  EN_ATTENTE:  { label: 'En attente',  color: 'bg-yellow-400' },
  EN_COURS:    { label: 'En cours',    color: 'bg-blue-500'   },
  VALIDE:      { label: 'Validé',      color: 'bg-green-500'  },
  REJETE:      { label: 'Rejeté',      color: 'bg-red-500'    },
};

function StatutRow({ statut, count, total }) {
  const ui = STATUT_UI[statut] || { label: statut, color: 'bg-gray-400' };
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ui.color}`} />
          <span className="text-slate-600">{ui.label}</span>
        </span>
        <span className="font-semibold text-slate-700">{count}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${ui.color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const ETAPE_LABEL = {
  DEPOT_SUJET:         'Dépôt du sujet',
  VALIDATION_SUJET:    'Validation',
  DEPOT_PLAN:          'Dépôt du plan',
  FEEDBACK_PLAN:       'Feedback',
  DEPOT_INTERMEDIAIRE: 'Intermédiaire',
  DEPOT_FINAL:         'Dépôt final',
};

function EtapeRow({ etape, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-600">{ETAPE_LABEL[etape] || etape}</span>
        <span className="font-semibold text-slate-700">{count}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-ucl-blue" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-ucl-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="p-8">
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{message}</div>
    </div>
  );
}

// Icônes
function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function IconProf() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
