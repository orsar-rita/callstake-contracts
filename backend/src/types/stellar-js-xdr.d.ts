// @stellar/js-xdr ships no TypeScript declarations of its own (only its
// consumers, like @stellar/stellar-base, redeclare the pieces they use).
// This covers the one export contract-spec-registry.ts needs directly.
declare module '@stellar/js-xdr' {
  export class XdrReader {
    constructor(buffer: Buffer | Uint8Array);
    readonly eof: boolean;
  }
}
