import { canonicalHash } from './canonicalHash.js';

/**
 * Deterministic IPFS CIDv1-like helper for canonical agreements & evidence
 */
export function generateIpfsCid(data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = canonicalHash(jsonStr).replace(/^0x/, '');
  // Deterministic CIDv1 base32 representation for demo & presentation
  const base32Prefix = 'bafkreih';
  const cidSuffix = hash.substring(0, 50).toLowerCase();
  const cid = `${base32Prefix}${cidSuffix}`;
  
  return {
    cid,
    uri: `ipfs://${cid}`,
    gatewayUrl: `https://ipfs.io/ipfs/${cid}`,
    dwebUrl: `https://dweb.link/ipfs/${cid}`,
    sizeBytes: new Blob([jsonStr]).size,
    sha256Hex: hash
  };
}

/**
 * Generate cryptographic verifiable certificate metadata
 */
export function generateContractCertificate(agreement) {
  const terms = agreement?.terms || {};
  const ipfsData = generateIpfsCid(terms);
  const termsHash = agreement?.termsHash || canonicalHash(terms);
  
  return {
    certificateId: `SANKALP-CERT-${(termsHash || '0x0000').slice(2, 10).toUpperCase()}`,
    issuedAt: new Date().toISOString(),
    termsHash,
    ipfsCid: ipfsData.cid,
    ipfsUri: ipfsData.uri,
    gatewayUrl: ipfsData.gatewayUrl,
    onchainId: agreement?.onchainId || 'PENDING_DEPLOYMENT',
    txHash: agreement?.txHash || null,
    client: terms.client || '0x0000000000000000000000000000000000000000',
    freelancer: terms.freelancer || '0x0000000000000000000000000000000000000000',
    totalAmount: terms.totalAmount || '0.0',
    currency: terms.currency || 'MATIC',
    milestonesCount: terms.milestones?.length || 0,
    status: agreement?.status || 'Draft'
  };
}
