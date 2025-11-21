/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Forensic Chainguard — Draft Contract
 * Notes:
 *  1. Fabric has a key-value store (World State) + an immutable log (the Ledger). PUT/GET JSON provided by a deterministic "key", and Fabric keeps
 *    a cryptographic history of every change to that key.
 *  2. Each public method with @Transaction is an on-chain function which we can call from the CLI (invoke/query). 
 *    @Transaction(false) = read-only; 
 *    @Transaction() (or @Transaction(true)) = write to the ledger.
 *  3. The Context (ctx) gives access to APIs like ctx.stub.putState/getState and ctx.stub.getHistoryForKey, which are the fundamental for CRUD and
 *     retrieving history.
 */
import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";

interface EvidenceRecord {
  evidenceId: string;
  caseIdHash: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

@Info({
  title: "ForensicChainguardContract",
  description: "MVP contract for a simple evidence record",
})
export class ForensicContract extends Contract {
  private evidenceKey(ctx: Context, evidenceId: string): string {
    return ctx.stub.createCompositeKey("EVIDENCE", [evidenceId]);
  }

  private async put<T>(ctx: Context, key: string, value: T) {
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(value)));
  }

  private async get<T>(ctx: Context, key: string): Promise<T | undefined> {
    const b = await ctx.stub.getState(key);
    if (!b || b.length === 0) return undefined;
    return JSON.parse(b.toString()) as T;
  }

  private now(ctx: Context): number {
    const ts = ctx.stub.getTxTimestamp();
    return Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1e6);
  }

  // Read methods

  @Transaction(false)
  @Returns("string")
  public async GetEvidence(ctx: Context, evidenceId: string): Promise<string> {
    const key = this.evidenceKey(ctx, evidenceId);
    const rec = await this.get<EvidenceRecord>(ctx, key);
    if (!rec) throw new Error(`NOT_FOUND: evidence '${evidenceId}'`);
    return JSON.stringify(rec);
  }

  @Transaction(false)
  @Returns("string")
  public async GetEvidenceHistory(
    ctx: Context,
    evidenceId: string
  ): Promise<string> {
    const key = this.evidenceKey(ctx, evidenceId);
    const iter = await ctx.stub.getHistoryForKey(key);

    const out: Array<{
      txId: string;
      timestamp: number;
      isDelete: boolean;
      value?: EvidenceRecord;
    }> = [];
    for (let res = await iter.next(); !res.done; res = await iter.next()) {
      const r = res.value;
      const ts =
        Number(r.timestamp?.seconds) * 1000 +
        Math.floor((r.timestamp?.nanos ?? 0) / 1e6);
      const value = r.isDelete
        ? undefined
        : (JSON.parse(r.value.toString()) as EvidenceRecord);
      out.push({ txId: r.txId, timestamp: ts, isDelete: r.isDelete, value });
    }
    await iter.close();

    return JSON.stringify(out);
  }

  // Write methods

  @Transaction()
  public async CreateEvidence(ctx: Context, inputJson: string): Promise<void> {
    const input = JSON.parse(inputJson) as {
      evidenceId: string;
      caseIdHash: string;
      description?: string;
    };

    if (!input?.evidenceId || !input?.caseIdHash) {
      throw new Error(
        "VALIDATION_ERROR: evidenceId and caseIdHash are required"
      );
    }

    const key = this.evidenceKey(ctx, input.evidenceId);
    const exists = await this.get<EvidenceRecord>(ctx, key);
    if (exists) throw new Error(`ALREADY_EXISTS: '${input.evidenceId}'`);

    const now = this.now(ctx);
    const rec: EvidenceRecord = {
      evidenceId: input.evidenceId,
      caseIdHash: input.caseIdHash,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };

    await this.put(ctx, key, rec);
  }
}
