'use client';

const SECTIONS = [
  {
    title: 'Guides de direction',
    color: 'bg-violet-50 border-violet-200',
    iconColor: 'text-violet-500',
    icon: IconBook,
    items: [
      {
        label: 'Charte UCLouvain de direction de mémoire',
        desc: 'Règles et bonnes pratiques officielles pour l\'encadrement des travaux de fin d\'études.',
        badge: 'PDF',
      },
      {
        label: 'Guide méthodologique — accompagnement étudiant',
        desc: 'Conseils pour structurer les réunions de suivi, formuler un feedback constructif et gérer les délais.',
        badge: 'Guide',
      },
      {
        label: 'Critères d\'évaluation du mémoire',
        desc: 'Grille officielle d\'évaluation : fond, forme, présentation orale et positionnement critique.',
        badge: 'Grille',
      },
    ],
  },
  {
    title: 'Délais et calendrier académique',
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
    icon: IconCalendar,
    items: [
      {
        label: 'Calendrier des dépôts — Session de juin',
        desc: 'Dates limites pour le dépôt du sujet, du plan, des versions intermédiaires et finales.',
        badge: 'Janv–Juin',
      },
      {
        label: 'Calendrier des dépôts — Session de septembre',
        desc: 'Délais pour la session de rattrapage — dépôt final au plus tard fin août.',
        badge: 'Juil–Sept',
      },
      {
        label: 'Procédure de prolongation',
        desc: 'Conditions et formulaire pour demander un report de délai exceptionnel.',
        badge: 'Procédure',
      },
    ],
  },
  {
    title: 'Outils et modèles',
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-500',
    icon: IconTemplate,
    items: [
      {
        label: 'Modèle de rapport de suivi semestriel',
        desc: 'Template Word à compléter à chaque point semestriel avec l\'étudiant.',
        badge: 'DOCX',
      },
      {
        label: 'Fiche d\'évaluation intermédiaire',
        desc: 'Formulaire structuré pour évaluer l\'avancement après le dépôt du plan de recherche.',
        badge: 'Formulaire',
      },
      {
        label: 'Modèle de lettre d\'approbation du sujet',
        desc: 'Courrier type pour confirmer l\'acceptation officielle d\'un sujet de mémoire.',
        badge: 'Modèle',
      },
    ],
  },
  {
    title: 'Formation et accompagnement',
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    icon: IconAcademic,
    items: [
      {
        label: 'Formation « Encadrement et feedback efficaces »',
        desc: 'Session en ligne animée par le Service de pédagogie universitaire — 2h, auto-rythmé.',
        badge: 'En ligne',
      },
      {
        label: 'FAQ — Problèmes courants en direction de mémoire',
        desc: 'Réponses aux questions fréquentes : plagiat, abandon, conflits de sujet, co-direction.',
        badge: 'FAQ',
      },
    ],
  },
];

export default function PromoteurRessources() {
  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Ressources</h1>
        <p className="text-slate-500 text-sm mt-1">
          Guides, modèles et informations pratiques pour la direction de mémoire à UCLouvain.
        </p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl mb-8">
        <span className="text-violet-500 mt-0.5 shrink-0"><IconInfo /></span>
        <p className="text-sm text-violet-800">
          Ces ressources sont fournies à titre indicatif. Les documents officiels sont disponibles
          sur le portail intranet UCLouvain. En cas de doute, contactez le secrétariat de l&apos;École de communication.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <section.icon className={`w-5 h-5 ${section.iconColor}`} />
              <h2 className="font-semibold text-slate-700">{section.title}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <ResourceCard key={item.label} item={item} borderColor={section.color} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="mt-10 card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <IconMail className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Besoin d&apos;aide ?</p>
            <p className="text-sm text-slate-500 mt-1">
              Le secrétariat de l&apos;École de communication est disponible pour toute question relative à la direction de mémoire.
            </p>
            <p className="text-sm text-violet-600 font-medium mt-2">memoires-ecom@uclouvain.be</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({ item, borderColor }) {
  return (
    <div className={`card p-4 border ${borderColor} hover:shadow-md transition-shadow cursor-default`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{item.label}</p>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
          {item.badge}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
    </div>
  );
}

function IconBook({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>; }
function IconCalendar({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
function IconTemplate({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>; }
function IconAcademic({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>; }
function IconInfo() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function IconMail({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
