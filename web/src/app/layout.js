import './globals.css';

export const metadata = {
  title: 'ThesisMatch — UCLouvain',
  description: 'Plateforme de gestion des mémoires de master — École de communication',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
