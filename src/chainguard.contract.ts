/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Forensic Chainguard — Draft Contract
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
  title: "ForensicContract",
  description: "MVP contract for a simple evidence record",
})
export class ForensicContract extends Contract {
  // ---- helpers -------------------------------------------------------------

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

  // ---- READS ---------------------------------------------------------------

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

  // ---- WRITE ---------------------------------------------------------------

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
