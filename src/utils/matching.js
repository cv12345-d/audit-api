// src/utils/matching.js
// Algorithme de matching promoteur ↔ projet étudiant
//
// Score = domaine_score * 0.7 + quota_score * 0.3
//
// domaine_score = similarité de Jaccard entre domaines du projet et du promoteur
//   |A ∩ B| / |A ∪ B|  (0 si aucun domaine renseigné)
//
// quota_score = capacité restante normalisée
//   (quotaMax - quotaActuel) / quotaMax

/**
 * Calcule la similarité de Jaccard entre deux tableaux de domaines.
 * Comparaison insensible à la casse.
 */
function jaccardSimilarity(domainesA, domainesB) {
  if (!domainesA.length || !domainesB.length) return 0;

  const setA = new Set(domainesA.map(d => d.toLowerCase().trim()));
  const setB = new Set(domainesB.map(d => d.toLowerCase().trim()));

  const intersection = new Set([...setA].filter(d => setB.has(d)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calcule le score de capacité d'un promoteur.
 * Retourne 0 si le promoteur est plein.
 */
function capaciteScore(promoteur) {
  if (promoteur.quotaMax <= 0) return 0;
  const restant = promoteur.quotaMax - promoteur.quotaActuel;
  if (restant <= 0) return 0;
  return restant / promoteur.quotaMax;
}

/**
 * Calcule le score de matching entre un projet étudiant et un promoteur.
 *
 * @param {string[]} domainesEtudiant - Domaines du projet étudiant
 * @param {Object} promoteur - Objet promoteur complet
 * @returns {Object} { score, domaineScore, quotaScore, details }
 */
function calculerScore(domainesEtudiant, promoteur) {
  // Parse domaines si stockés en JSON string
  let domainesPromoteur = promoteur.domaines;
  if (typeof domainesPromoteur === 'string') {
    try {
      domainesPromoteur = JSON.parse(domainesPromoteur);
    } catch {
      domainesPromoteur = [];
    }
  }
  if (!Array.isArray(domainesPromoteur)) domainesPromoteur = [];

  let etudiantDomaines = domainesEtudiant;
  if (typeof etudiantDomaines === 'string') {
    try {
      etudiantDomaines = JSON.parse(etudiantDomaines);
    } catch {
      etudiantDomaines = [];
    }
  }
  if (!Array.isArray(etudiantDomaines)) etudiantDomaines = [];

  const domaineScore = jaccardSimilarity(etudiantDomaines, domainesPromoteur);
  const quotaScore = capaciteScore(promoteur);
  const score = domaineScore * 0.7 + quotaScore * 0.3;

  // Domaines communs pour affichage
  const setEtudiant = new Set(etudiantDomaines.map(d => d.toLowerCase().trim()));
  const setPromoteur = new Set(domainesPromoteur.map(d => d.toLowerCase().trim()));
  const domainesCommuns = domainesPromoteur.filter(d => setEtudiant.has(d.toLowerCase().trim()));

  return {
    score: Math.round(score * 100) / 100,
    domaineScore: Math.round(domaineScore * 100) / 100,
    quotaScore: Math.round(quotaScore * 100) / 100,
    details: {
      domainesCommuns,
      domainesEtudiant: etudiantDomaines,
      domainesPromoteur,
      quotaRestant: promoteur.quotaMax - promoteur.quotaActuel,
      quotaMax: promoteur.quotaMax,
    },
  };
}

/**
 * Classe et filtre les promoteurs disponibles pour un projet étudiant.
 *
 * @param {string[]|string} domainesEtudiant - Domaines du projet
 * @param {Object[]} tousPromoteurs - Liste complète des promoteurs
 * @returns {Object[]} Promoteurs classés par score décroissant (disponibles uniquement)
 */
function classerPromoteurs(domainesEtudiant, tousPromoteurs) {
  const resultats = tousPromoteurs
    .filter(p => p.disponible && p.quotaActuel < p.quotaMax)
    .map(p => {
      const { score, domaineScore, quotaScore, details } = calculerScore(domainesEtudiant, p);
      return {
        promoteur: {
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          email: p.email,
          domaines: details.domainesPromoteur,
          quotaActuel: p.quotaActuel,
          quotaMax: p.quotaMax,
          disponible: p.disponible,
          biographie: p.biographie || null,
        },
        score,
        domaineScore,
        quotaScore,
        domainesCommuns: details.domainesCommuns,
        quotaRestant: details.quotaRestant,
      };
    })
    .sort((a, b) => b.score - a.score);

  return resultats;
}

module.exports = { classerPromoteurs, calculerScore, jaccardSimilarity };
