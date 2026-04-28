import type { EmailAttachment, IvosDocumentOption } from './types';

function invoiceDocuments(): IvosDocumentOption[] {
  try {
    const raw = localStorage.getItem('ivos_finance_invoices_v2') || localStorage.getItem('ivos_invoices_v1');
    if (!raw) return [];
    const invoices = JSON.parse(raw) as Array<Record<string, unknown>>;

    return invoices.slice(0, 20).map((invoice, index) => {
      const number = String(invoice.invoiceNumber || invoice.number || `FAC-${index + 1}`);
      return {
        id: `invoice-${number}`,
        label: `Facture ${number}`,
        type: 'invoice' as const,
        fileName: `${number}.pdf`,
        mimeType: 'application/pdf',
        downloadUrl: `/billing?invoice=${encodeURIComponent(number)}`,
      };
    });
  } catch {
    return [];
  }
}

function incidentReports(): IvosDocumentOption[] {
  return [
    {
      id: 'incident-template-1',
      label: 'Rapport de sinistre (template)',
      type: 'incident_report',
      fileName: 'rapport-sinistre-template.pdf',
      mimeType: 'application/pdf',
      downloadUrl: '/sinistres',
    },
  ];
}

function certificates(): IvosDocumentOption[] {
  return [
    {
      id: 'certificate-verification-guide',
      label: 'Certificat - Verification',
      type: 'certificate',
      fileName: 'certificat-verification.html',
      mimeType: 'text/html',
      downloadUrl: '/certificate/verify',
    },
  ];
}

export function listIvosDocuments(): IvosDocumentOption[] {
  const docs = [...invoiceDocuments(), ...incidentReports(), ...certificates()];

  if (docs.length > 0) return docs;

  return [
    {
      id: 'fallback-invoice-doc',
      label: 'Facture recente',
      type: 'invoice',
      fileName: 'facture-recente.pdf',
      mimeType: 'application/pdf',
      downloadUrl: '/billing',
    },
    {
      id: 'fallback-incident-doc',
      label: 'Rapport de sinistre recent',
      type: 'incident_report',
      fileName: 'rapport-sinistre.pdf',
      mimeType: 'application/pdf',
      downloadUrl: '/sinistres',
    },
    {
      id: 'fallback-certificate-doc',
      label: 'Certificat recent',
      type: 'certificate',
      fileName: 'certificat.html',
      mimeType: 'text/html',
      downloadUrl: '/certificate/verify',
    },
  ];
}

export function mapDocToAttachment(doc: IvosDocumentOption): EmailAttachment {
  return {
    id: doc.id,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    size: 0,
    downloadUrl: doc.downloadUrl,
    source: 'ivos',
  };
}
