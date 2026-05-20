/**
 * Service d'Exportation Web — Génération de Contenu pour Site Web
 * Génère des résumés textuels et infographies pour publication
 */

import type { ImpactMetrics } from './dataAnalyticsService';

// Ce service gère l’export de données (CSV, anonymisation, conformité RGPD).
// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WebExportContent {
  // Texte
  headline: string; // Titre accrocheur
  summary: string; // Résumé court (1-2 phrases)
  fullDescription: string; // Description complète
  keyFigures: string[]; // Chiffres clés en bullet points

  // Données pour infographie
  infographicData: {
    mainNumber: string; // Chiffre principal (ex: "1,275 tonnes")
    mainLabel: string; // Label (ex: "Déchets Collectés")
    subStats: Array<{
      value: string;
      label: string;
    }>;
    period: string; // "Janvier 2026"
    brandingText: string; // "IVOS Sénégal"
  };

  // Export
  htmlSnippet: string; // Code HTML prêt à copier
  textOnly: string; // Texte brut pour réseaux sociaux

  // Méta
  generatedAt: string;
  isAnonymized: boolean; // Confirme que les clients sont anonymisés
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES DE TEXTE
// ═══════════════════════════════════════════════════════════════════════════

const HEADLINE_TEMPLATES = [
  'IVOS sécurise le traitement de {tonnage} de déchets industriels',
  '{tonnage} de déchets dangereux traités par IVOS',
  'Impact environnemental : IVOS traite {tonnage} de déchets',
  'Bilan {period} : {tonnage} de déchets industriels sécurisés',
];

const SUMMARY_TEMPLATES = [
  "Ce mois-ci, IVOS a sécurisé le traitement de {tonnage} de déchets industriels, évitant ainsi un impact environnemental majeur. Avec un taux de valorisation de {valorisation}%, l'entreprise continue de placer l'économie circulaire au cœur de ses activités.",

  "Durant {period}, IVOS a collecté et traité {tonnage} de déchets provenant de {sectors} secteurs d'activité. Grâce à nos processus de traitement innovants, {valorisation}% de ces déchets ont pu être valorisés.",

  "Nouveau record pour IVOS : {tonnage} de déchets industriels sécurisés durant {period}. L'engagement environnemental de l'entreprise se traduit par un taux de valorisation de {valorisation}%, bien au-delà des standards de l'industrie.",
];

// ═══════════════════════════════════════════════════════════════════════════
// FONCTIONS D'EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formate un tonnage pour affichage
 */
function formatTonnage(kg: number): string {
  const tonnes = kg / 1000;

  if (tonnes >= 1000) {
    return `${(tonnes / 1000).toFixed(1)} kilotonnes`;
  } else if (tonnes >= 100) {
    return `${Math.round(tonnes)} tonnes`;
  } else if (tonnes >= 10) {
    return `${tonnes.toFixed(1)} tonnes`;
  } else {
    return `${tonnes.toFixed(2)} tonnes`;
  }
}

/**
 * Formate un nombre pour affichage compact
 */
function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return Math.round(value).toString();
}

/**
 * Sélectionne un template aléatoire
 */
function selectRandomTemplate<T>(templates: T[]): T {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Remplace les placeholders dans un template
 */
function fillTemplate(template: string, data: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return result;
}

/**
 * Génère une liste des secteurs principaux
 */
function getSectorsList(metrics: ImpactMetrics, maxCount: number = 3): string {
  const topSectors = metrics.sectorBreakdown.slice(0, maxCount);

  if (topSectors.length === 0) return 'plusieurs';
  if (topSectors.length === 1) return `le ${topSectors[0].sector}`;
  if (topSectors.length === 2) return `les ${topSectors[0].sector} et ${topSectors[1].sector}`;

  const lastSector = topSectors[topSectors.length - 1].sector;
  const otherSectors = topSectors
    .slice(0, -1)
    .map((s) => s.sector)
    .join(', ');
  return `les ${otherSectors} et ${lastSector}`;
}

/**
 * Génère le contenu pour export web
 */
export function generateWebExportContent(metrics: ImpactMetrics): WebExportContent {
  const tonnageFormatted = formatTonnage(metrics.totalTonnage);
  const valorisationFormatted = Math.round(metrics.valorisationRate);
  const sectorsCount = metrics.sectorBreakdown.length;
  const sectorsList = getSectorsList(metrics);

  // Données pour remplacement
  const data = {
    tonnage: tonnageFormatted,
    period: metrics.period.label.toLowerCase(),
    valorisation: String(valorisationFormatted),
    sectors: String(sectorsCount),
    sectorsList,
  };

  // 1. Headline
  const headline = fillTemplate(selectRandomTemplate(HEADLINE_TEMPLATES), data);

  // 2. Summary
  const summary = fillTemplate(selectRandomTemplate(SUMMARY_TEMPLATES), data);

  // 3. Description complète
  const fullDescription = `
Durant ${metrics.period.label}, IVOS - Sénégal Oilfield Services a renforcé son engagement en faveur de l'environnement en collectant et traitant ${tonnageFormatted} de déchets industriels provenant de ${sectorsCount} secteurs d'activité différents.

Parmi les ${metrics.totalOperations} opérations réalisées, ${metrics.wasteBreakdown[0]?.categoryLabel || 'les déchets dangereux'} représentent la majorité des volumes traités (${Math.round(metrics.wasteBreakdown[0]?.percentage || 0)}%), démontrant l'importance de notre expertise en gestion de déchets à risque.

Grâce à nos installations certifiées et nos processus innovants, nous avons atteint un taux de valorisation de ${valorisationFormatted}%, contribuant ainsi à l'économie circulaire et à la réduction de l'empreinte environnementale du Sénégal.

Cette performance s'inscrit dans notre objectif de protéger l'environnement tout en accompagnant les acteurs économiques dans leur transition écologique.
  `.trim();

  // 4. Chiffres clés
  const keyFigures = [
    `✅ ${tonnageFormatted} de déchets collectés et traités`,
    `♻️ ${valorisationFormatted}% de taux de valorisation`,
    `📋 ${metrics.totalOperations} opérations sécurisées`,
    `🏭 ${sectorsCount} secteurs d'activité accompagnés`,
  ];

  // Top 3 catégories
  metrics.wasteBreakdown.slice(0, 3).forEach((wb, i) => {
    if (i < 3) {
      keyFigures.push(
        `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${wb.categoryLabel} : ${formatTonnage(wb.tonnage)}`
      );
    }
  });

  // 5. Données infographie
  const infographicData = {
    mainNumber: tonnageFormatted.toUpperCase(),
    mainLabel: 'DÉCHETS COLLECTÉS',
    subStats: [
      {
        value: `${valorisationFormatted}%`,
        label: 'Taux de Valorisation',
      },
      {
        value: String(metrics.totalOperations),
        label: 'Opérations BSD',
      },
      {
        value: String(sectorsCount),
        label: 'Secteurs',
      },
    ],
    period: metrics.period.label.toUpperCase(),
    brandingText: 'IVOS — Sénégal Oilfield Services',
  };

  // 6. HTML Snippet
  const htmlSnippet = `
<div class="ivos-impact-report" style="background: linear-gradient(135deg, #1a5f3e 0%, #2d8659 100%); color: white; padding: 40px; border-radius: 16px; max-width: 800px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
  <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 16px;">${headline}</h2>
  <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">${summary}</p>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 32px;">
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center;">
      <div style="font-size: 36px; font-weight: bold;">${tonnageFormatted}</div>
      <div style="font-size: 14px; opacity: 0.9;">Déchets Collectés</div>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center;">
      <div style="font-size: 36px; font-weight: bold;">${valorisationFormatted}%</div>
      <div style="font-size: 14px; opacity: 0.9;">Valorisation</div>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center;">
      <div style="font-size: 36px; font-weight: bold;">${metrics.totalOperations}</div>
      <div style="font-size: 14px; opacity: 0.9;">Opérations BSD</div>
    </div>
  </div>
  
  <p style="text-align: center; margin-top: 32px; font-size: 14px; opacity: 0.8;">
    ${metrics.period.label} — IVOS Sénégal Oilfield Services
  </p>
</div>
  `.trim();

  // 7. Texte pour réseaux sociaux
  const textOnly = `
🌍 ${headline}

${summary}

📊 Chiffres clés ${metrics.period.label} :
${keyFigures.join('\n')}

#IVOS #Environnement #DéchetsIndustriels #Sénégal #ÉconomieCirculaire #RSE
  `.trim();

  return {
    headline,
    summary,
    fullDescription,
    keyFigures,
    infographicData,
    htmlSnippet,
    textOnly,
    generatedAt: new Date().toISOString(),
    isAnonymized: true, // Confirmé : secteurs utilisés au lieu de noms clients
  };
}

/**
 * Génère une image infographique (Canvas HTML5)
 * Retourne une data URL PNG
 */
export function generateInfographicImage(
  metrics: ImpactMetrics,
  width: number = 1200,
  height: number = 630
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Fond gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a5f3e');
    gradient.addColorStop(1, '#2d8659');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Titre
    ctx.fillStyle = 'white';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IMPACT ENVIRONNEMENTAL', width / 2, 100);

    // Période
    ctx.font = '32px system-ui, sans-serif';
    ctx.fillText(metrics.period.label.toUpperCase(), width / 2, 150);

    // Chiffre principal
    ctx.font = 'bold 120px system-ui, sans-serif';
    const tonnageText = formatTonnage(metrics.totalTonnage).toUpperCase();
    ctx.fillText(tonnageText, width / 2, 300);

    ctx.font = '36px system-ui, sans-serif';
    ctx.fillText('DÉCHETS COLLECTÉS ET TRAITÉS', width / 2, 360);

    // Stats secondaires
    const stats = [
      { value: `${Math.round(metrics.valorisationRate)}%`, label: 'Valorisation' },
      { value: String(metrics.totalOperations), label: 'Opérations BSD' },
      { value: String(metrics.sectorBreakdown.length), label: 'Secteurs' },
    ];

    const boxWidth = 300;
    const boxHeight = 120;
    const spacing = 50;
    const startX = (width - (stats.length * boxWidth + (stats.length - 1) * spacing)) / 2;
    const startY = 420;

    stats.forEach((stat, i) => {
      const x = startX + i * (boxWidth + spacing);

      // Box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, startY, boxWidth, boxHeight);

      // Value
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stat.value, x + boxWidth / 2, startY + 55);

      // Label
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(stat.label, x + boxWidth / 2, startY + 90);
    });

    // Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IVOS — Sénégal Oilfield Services', width / 2, height - 40);

    // Export
    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Télécharge l'infographie en tant que fichier PNG
 */
export async function downloadInfographic(metrics: ImpactMetrics): Promise<void> {
  const dataUrl = await generateInfographicImage(metrics);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `IVOS-Impact-${metrics.period.label.replace(/\s/g, '-')}.png`;
  link.click();
}

/**
 * Copie le HTML snippet dans le presse-papiers
 */
export async function copyHtmlToClipboard(content: WebExportContent): Promise<void> {
  await navigator.clipboard.writeText(content.htmlSnippet);
}

/**
 * Copie le texte pour réseaux sociaux dans le presse-papiers
 */
export async function copyTextToClipboard(content: WebExportContent): Promise<void> {
  await navigator.clipboard.writeText(content.textOnly);
}

export default {
  generateWebExportContent,
  generateInfographicImage,
  downloadInfographic,
  copyHtmlToClipboard,
  copyTextToClipboard,
};
