// Where a worker pairing stands. Internal (never exposed over GraphQL); matches
// `worker_pairing.status`.
export const PairingStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
} as const;
export type PairingStatus = (typeof PairingStatus)[keyof typeof PairingStatus];
