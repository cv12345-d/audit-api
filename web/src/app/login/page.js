'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ROLE_REDIRECT = { ADMIN: '/admin', ETUDIANT: '/etudiant', PROMOTEUR: '/promoteur' };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth.login(email, password);
      const { role } = data.utilisateur;
      const dest = ROLE_REDIRECT[role];
      if (!dest) {
        setError('Rôle inconnu, contactez l\'administration.');
        setLoading(false);
        return;
      }
      localStorage.setItem('thesismatch_token', data.token);
      localStorage.setItem('thesismatch_user', JSON.stringify(data.utilisateur));
      router.push(dest);
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ucl-blue to-ucl-light p-4">
      <div className="w-full max-w-md">
        {/* Logo / En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">TM</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ThesisMatch</h1>
          <p className="text-blue-100 text-sm mt-1">Interface de direction — UCLouvain</p>
        </div>

        {/* Formulaire */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Connexion</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@uclouvain.be"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-2.5"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-slate-400">
            Plateforme ThesisMatch — UCLouvain
          </p>
        </div>
      </div>
    </div>
  );
}
