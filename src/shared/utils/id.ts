// Générateur simple d'ID unique pour certificats
export function generateCertificateNumber() {
  const now = new Date();
  return `CERT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(
    Math.random() * 10000
  )
    .toString()
    .padStart(4, '0')}`;
}
