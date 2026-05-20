/**
 * Composant de Génération de PDF pour Certificats de Destruction
 * Crée un PDF professionnel avec logo, QR Code et mentions légales
 */

import React from 'react';
import type { Certificate } from '@/shared/types/certificate.types';
import QRCode from 'qrcode';

interface CertificatePDFProps {
  certificate: Certificate;
}

/**
 * Générer le PDF du certificat
 */
export async function generateCertificatePDF(certificate: Certificate): Promise<Blob> {
  // Créer un canvas pour le PDF
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Format A4 en pixels (300 DPI)
  const width = 2480;
  const height = 3508;
  canvas.width = width;
  canvas.height = height;

  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Bordure principale
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 20;
  ctx.strokeRect(80, 80, width - 160, height - 160);

  // Bordure secondaire
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 4;
  ctx.strokeRect(100, 100, width - 200, height - 200);

  let y = 200;

  // En-tête : Logo + Titre
  ctx.fillStyle = '#059669';
  ctx.fillRect(150, y, width - 300, 150);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('IVOS - Gestion des Déchets', width / 2, y + 100);

  y += 250;

  // Titre du document
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 100px Arial';
  ctx.fillText('CERTIFICAT DE DESTRUCTION', width / 2, y);

  y += 150;

  // Numéro de certificat
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 70px Arial';
  ctx.fillText(certificate.certificateNumber, width / 2, y);

  y += 200;

  // Séparateur
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, y);
  ctx.lineTo(width - 300, y);
  ctx.stroke();

  y += 150;

  // Informations principales
  ctx.textAlign = 'left';
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 50px Arial';

  const leftMargin = 300;
  const lineHeight = 100;

  const fields = [
    { label: 'Référence BSD', value: certificate.bsdReference },
    { label: 'Client', value: certificate.clientName },
    { label: 'Type de déchet', value: certificate.wasteType },
    { label: 'Tonnage traité', value: `${(certificate.finalTonnage / 1000).toFixed(2)} tonnes` },
    {
      label: 'Date de collecte',
      value: new Date(certificate.collectionDate).toLocaleDateString('fr-FR'),
    },
    {
      label: 'Date de traitement',
      value: new Date(certificate.treatmentDate).toLocaleDateString('fr-FR'),
    },
    { label: 'Méthode de traitement', value: certificate.treatmentMethod },
    { label: 'Lieu de traitement', value: certificate.treatmentLocation },
  ];

  fields.forEach((field, index) => {
    const fieldY = y + index * lineHeight;

    // Label
    ctx.fillStyle = '#6b7280';
    ctx.font = '45px Arial';
    ctx.fillText(field.label + ' :', leftMargin, fieldY);

    // Valeur
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 45px Arial';
    ctx.fillText(field.value, leftMargin + 600, fieldY);
  });

  y += fields.length * lineHeight + 150;

  // Séparateur
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, y);
  ctx.lineTo(width - 300, y);
  ctx.stroke();

  y += 150;

  // Mention légale
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATION OFFICIELLE', width / 2, y);

  y += 120;

  ctx.fillStyle = '#374151';
  ctx.font = '40px Arial';

  const legalText = [
    'IVOS certifie que les déchets susmentionnés ont été collectés',
    'et traités conformément aux réglementations environnementales',
    'en vigueur au Sénégal.',
    '',
    'Ce document atteste de la prise en charge complète et de',
    "l'élimination conforme des déchets dans le respect des normes QHSE.",
  ];

  legalText.forEach((line, index) => {
    ctx.fillText(line, width / 2, y + index * 70);
  });

  y += legalText.length * 70 + 150;

  // Date d'émission
  ctx.fillStyle = '#6b7280';
  ctx.font = '38px Arial';
  ctx.fillText(
    `Émis le ${new Date(certificate.generatedAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    width / 2,
    y
  );

  y += 100;

  ctx.fillText(`Par : ${certificate.generatedBy}`, width / 2, y);

  // QR Code
  const qrSize = 350;
  const qrX = width / 2 - qrSize / 2;
  const qrY = height - 600;

  // Générer le QR Code
  const verificationUrl = `${window.location.origin}/certificate/verify/${certificate.verificationCode}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: qrSize,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Charger et dessiner le QR Code
  const qrImage = new Image();
  await new Promise((resolve) => {
    qrImage.onload = resolve;
    qrImage.src = qrDataUrl;
  });

  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  // Texte sous le QR Code
  ctx.fillStyle = '#6b7280';
  ctx.font = '32px Arial';
  ctx.fillText("Scannez pour vérifier l'authenticité", width / 2, qrY + qrSize + 60);
  ctx.fillText(`Code : ${certificate.verificationCode}`, width / 2, qrY + qrSize + 110);

  // Convertir en Blob PDF
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}

/**
 * Télécharger le PDF du certificat
 */
export async function downloadCertificatePDF(certificate: Certificate): Promise<void> {
  const blob = await generateCertificatePDF(certificate);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${certificate.certificateNumber}_Certificat_Destruction.png`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Prévisualiser le certificat
 */
export async function previewCertificatePDF(certificate: Certificate): Promise<string> {
  const blob = await generateCertificatePDF(certificate);
  return URL.createObjectURL(blob);
}

/**
 * Composant de prévisualisation
 */
export default function CertificatePDFPreview({ certificate }: CertificatePDFProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    previewCertificatePDF(certificate).then((url) => {
      setPreviewUrl(url);
      setLoading(false);
    });

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [certificate]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <img
        src={previewUrl!}
        alt="Prévisualisation du certificat"
        className="h-auto w-full rounded-lg border-2 border-gray-300 shadow-lg"
      />
    </div>
  );
}
