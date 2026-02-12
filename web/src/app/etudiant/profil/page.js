'use client';

import { useEffect, useState } from 'react';
import { etudiants as etudiantsApi } from '@/lib/api';

export default function ProfilPage() {
  const [etudiantId, setEtudiantId] = useState(null);
  const [form, setForm] = useState({
    titreMémoire: '', resumeProjet: '', domaines: [],
    lieuImmersion: '', questionRecherche: '', remarques: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('thesismatch_user');
    if (!stored) return;
    const user = JSON.parse(stored);
    const id = user.profil?.id;
    if (!id) { setLoading(false); return; }
    setEtudiantId(id);
    etudiantsApi.get(id).then((e) => {
      setForm({
        titreMémoire: e.titreMémoire || '',
        resumeProjet: e.resumeProjet || '',
        domaines: Array.isArray(e.domaines) ? e.domaines : [],
        lieuImmersion: e.lieuImmersion || '',
        questionRecherche: e.questionRecherche || '',
        remarques: e.remarques || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  function addTag(val) {
    const tag = val.trim();
    if (!tag || form.domaines.includes(tag)) return;
    setForm((f) => ({ ...f, domaines: [...f.domaines, tag] }));
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && form.domaines.length > 0) {
      setForm((f) => ({ ...f, domaines: f.domaines.slice(0, -1) }));
    }
  }

  function removeTag(tag) {
    setForm((f) => ({ ...f, domaines: f.domaines.filter((d) => d !== tag) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!etudiantId) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await etudiantsApi.update(etudiantId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!etudiantId) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-12 text-center text-slate-500">
        <p>Votre profil étudiant n'est pas encore configuré. Contactez la direction.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mon projet de mémoire</h1>
        <p className="text-slate-500 text-sm mt-1">
          Plus votre description est précise, meilleures seront vos suggestions de promoteurs.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Titre */}
        <Field
          label="Titre provisoire de votre mémoire"
          hint="Pas encore de titre ? Un titre indicatif suffit pour l'instant."
          required
        >
          <input
            className="input"
            placeholder="Ex : L'influence des réseaux sociaux sur l'opinion publique lors d'élections..."
            value={form.titreMémoire}
            onChange={(e) => setForm({ ...form, titreMémoire: e.target.value })}
          />
        </Field>

        {/* Résumé */}
        <Field
          label="Description de votre projet"
          hint="Décrivez votre sujet, vos hypothèses, ce que vous souhaitez explorer."
        >
          <textarea
            className="input min-h-[120px] resize-none"
            placeholder="Je souhaite analyser... Ma question de départ est... Je m'intéresse à..."
            value={form.resumeProjet}
            onChange={(e) => setForm({ ...form, resumeProjet: e.target.value })}
          />
        </Field>

        {/* Question de recherche */}
        <Field
          label="Question de recherche"
          hint="Formulez votre question principale si vous l'avez déjà."
        >
          <input
            className="input"
            placeholder="Ex : Dans quelle mesure les fake news influencent-elles..."
            value={form.questionRecherche}
            onChange={(e) => setForm({ ...form, questionRecherche: e.target.value })}
          />
        </Field>

        {/* Domaines / tags */}
        <Field
          label="Domaines et mots-clés"
          hint="Appuyez sur Entrée ou virgule pour ajouter un tag. Ces mots-clés servent au matching."
          required
        >
          <div
            className="min-h-[44px] flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500 cursor-text"
            onClick={() => document.getElementById('tag-input')?.focus()}
          >
            {form.domaines.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-sm">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-emerald-400 hover:text-emerald-700 leading-none ml-0.5"
                >×</button>
              </span>
            ))}
            <input
              id="tag-input"
              className="flex-1 min-w-32 outline-none text-sm text-slate-700 placeholder:text-slate-300 bg-transparent"
              placeholder={form.domaines.length === 0 ? 'Communication, Médias, Journalisme...' : ''}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.replace(',', ''))}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(''); } }}
            />
          </div>
          {form.domaines.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">⚠ Sans domaines, le matching ne pourra pas fonctionner.</p>
          )}
        </Field>

        {/* Lieu d'immersion */}
        <Field
          label="Lieu ou terrain d'immersion envisagé"
          hint="Organisation, entreprise, institution où vous prévoyez de faire votre terrain (facultatif)."
        >
          <input
            className="input"
            placeholder="Ex : RTBF, Le Soir, Parlement européen..."
            value={form.lieuImmersion}
            onChange={(e) => setForm({ ...form, lieuImmersion: e.target.value })}
          />
        </Field>

        {/* Remarques */}
        <Field
          label="Remarques pour la direction"
          hint="Contraintes, préférences de promoteur, questions particulières..."
        >
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="Ex : Je préfère un promoteur spécialisé en communication politique..."
            value={form.remarques}
            onChange={(e) => setForm({ ...form, remarques: e.target.value })}
          />
        </Field>

        {/* Erreur / succès */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}
        {saved && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <span>✓</span> Projet enregistré avec succès !
          </p>
        )}

        {/* Bouton */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Enregistrement...</>
          ) : (
            'Enregistrer mon projet'
          )}
        </button>
      </form>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block font-medium text-slate-700 text-sm mb-1">
        {label}{required && <span className="text-emerald-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
}
