/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * JSON objects for transaction arguments (draft)
 * Can be passed as a single JSON string argument in CLI
 */

export type EvidenceStatus = "CREATED" | "CHECKED_OUT" | "IN_CUSTODY" | "REMOVED";

export interface EvidenceRecord {
  evidenceId: string;
  caseIdHash: string;               // never store raw case id
  description?: string;
  metadata?: Record<string, string>;
  createdBy: string;                // clientId/MSP of creator
  createdAt: number;                // unix millis
  updatedAt: number;                // unix millis
  currentCustodian: string;         // logical custodian id (string)
  status: EvidenceStatus;
  removedReason?: string;
}

export interface CreateEvidenceInput {
  evidenceId: string;
  caseIdHash: string;
  description?: string;
  metadata?: Record<string, string>;
  initialCustodian: string;
}

export interface CheckoutInput {
  evidenceId: string;
  byCustodian: string;              // who takes custody
  reason?: string;
}

export interface TransferInput {
  evidenceId: string;
  newCustodian: string;
  note?: string;
}

export interface CheckinInput {
  evidenceId: string;
  toCustodyLocation?: string;       // optional note/location
}

export interface RemoveInput {
  evidenceId: string;
  reason: string;
}
