/* ═══════ BADGE SERVICE — QR Code Generation & Badge PDF ═══════ */
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import type { PersonnelAgent } from '../../fleet/services/personnelStore';

/* ═══════ HMAC-like signature (browser-compatible) ═══════ */
const SECRET = 'IVOS-SN-2026-KIGNABOUR-SECURE';

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function verifyQRPayload(
  raw: string
): Promise<{ valid: boolean; employeId: string; matricule: string }> {
  try {
    const parsed = JSON.parse(raw);
    const { id, matricule, sig } = parsed;
    if (!id || !matricule || !sig) return { valid: false, employeId: '', matricule: '' };
    const expected = await hmacSign(`${id}:${matricule}`);
    return { valid: sig === expected, employeId: id, matricule };
  } catch {
    // Fallback: plain ID (for backwards compatibility with BornePointage)
    return { valid: false, employeId: raw, matricule: '' };
  }
}

/* ═══════ QR DATA GENERATION ═══════ */
export async function generateQRPayload(agent: PersonnelAgent): Promise<string> {
  const sig = await hmacSign(`${agent.id}:${agent.matricule}`);
  return JSON.stringify({ id: agent.id, matricule: agent.matricule, sig });
}

export async function generateQRDataUrl(agent: PersonnelAgent): Promise<string> {
  const payload = await generateQRPayload(agent);
  return QRCode.toDataURL(payload, {
    width: 256,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

/* ═══════ BADGE DOWNLOAD (PNG) ═══════ */
export async function downloadBadgePNG(
  agent: PersonnelAgent,
  badgeElement: HTMLElement
): Promise<void> {
  const canvas = await html2canvas(badgeElement, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = `Badge_${agent.firstName}_${agent.lastName}_${agent.matricule}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
