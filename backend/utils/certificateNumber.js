function generateCertificateNumber() {
  const timestamp = Date.now();
  const random4digit = Math.floor(1000 + Math.random() * 9000);
  return `CERT-${timestamp}-${random4digit}`;
}

module.exports = { generateCertificateNumber };
