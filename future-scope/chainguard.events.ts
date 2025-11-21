/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Event definitions for lifecycle notifications (draft)
 * Always emit hashes: never raw caseId
 */

export const EVIDENCE_CREATED = "forensic.evidence.created";
export const EVIDENCE_CHECKED_OUT = "forensic.evidence.checked_out";
export const EVIDENCE_TRANSFERRED = "forensic.evidence.transferred";
export const EVIDENCE_CHECKED_IN = "forensic.evidence.checked_in";
export const EVIDENCE_REMOVED = "forensic.evidence.removed";

export interface EvidenceEventPayload {
  evidenceId: string;
  caseIdHash: string;            // store only a hash/fingerprint of a case id
  by?: string;                   // clientId / MSP ID of actor
  fromCustodian?: string;
  toCustodian?: string;
  statusAfter?: string;
  note?: string;
  reason?: string;
  txId: string;
  timestamp: number;
}
