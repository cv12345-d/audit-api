'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/etudiant',            label: 'Accueil',    icon: IconHome      },
  { href: '/etudiant/profil',     label: 'Mon projet', icon: IconPencil    },
  { href: '/etudiant/exploration',label: 'Explorer',   icon: IconCompass   },
  { href: '/etudiant/memoires',   label: 'Mémoires',   icon: IconBook      },
  { href: '/etudiant/suivi',      label: 'Mon suivi',  icon: IconProgress  },
];

export default function EtudiantLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('thesismatch_token');
    const stored = localStorage.getItem('thesismatch_user');
    if (!token || !stored) { router.replace('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'ETUDIANT') { router.replace('/login'); return; }
    setUser(u);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function logout() {
    localStorage.removeItem('thesismatch_token');
    localStorage.removeItem('thesismatch_user');
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* ── Sidebar desktop (md+) ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">TM</span>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">ThesisMatch</p>
              <p className="text-emerald-600 text-xs">Espace étudiant</p>
            </div>
          </div>
        </div>

        {/* Profil rapide */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold shrink-0">
              {user.prenom?.charAt(0)}{user.nom?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{user.prenom} {user.nom}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/etudiant' ? pathname === '/etudiant' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl text-sm transition-colors"
          >
            <IconLogout className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">TM</span>
            </div>
            <span className="font-bold text-slate-800 text-sm">ThesisMatch</span>
          </div>
          <span className="text-sm font-medium text-slate-600">{user.prenom}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-24 md:pb-0">
          {children}
        </main>

        {/* ── Bottom nav mobile ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/etudiant' ? pathname === '/etudiant' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  active ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-none">{label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ─── Icônes ───────────────────────────────────

function IconHome({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
}
function IconPencil({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
}
function IconCompass({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconBook({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>;
}
function IconProgress({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>;
}
function IconLogout({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;
}
