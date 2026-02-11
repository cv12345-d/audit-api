// Libellés et couleurs pour les statuts et étapes

export const STATUT_CONFIG = {
  EN_ATTENTE:  { label: 'En attente',  bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  EN_COURS:    { label: 'En cours',    bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  VALIDE:      { label: 'Validé',      bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  REJETE:      { label: 'Rejeté',      bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
};

export const ETAPE_LABEL = {
  DEPOT_SUJET:         'Dépôt du sujet',
  VALIDATION_SUJET:    'Validation',
  DEPOT_PLAN:          'Dépôt du plan',
  FEEDBACK_PLAN:       'Feedback',
  DEPOT_INTERMEDIAIRE: 'Dépôt intermédiaire',
  DEPOT_FINAL:         'Dépôt final',
};

export function statutBadge(statut) {
  return STATUT_CONFIG[statut] || { label: statut, bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
}

export function scoreColor(score) {
  if (score >= 0.7) return 'text-green-700 bg-green-50 border-green-200';
  if (score >= 0.4) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

export function scoreBarColor(score) {
  if (score >= 0.7) return 'bg-green-500';
  if (score >= 0.4) return 'bg-yellow-400';
  return 'bg-red-400';
}

export function formatScore(score) {
  return `${Math.round(score * 100)}%`;
}

export function initiales(nom, prenom) {
  return `${(prenom || '').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase();
}
