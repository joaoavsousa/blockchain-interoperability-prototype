"use strict";

/**
 * Represents one logical cross-chain transfer.
 *
 * The model is ledger-independent. Conversion to Fabric chaincode
 * parameters is kept in one method to preserve the current contract API.
 */
class CrossChainTransfer {
  constructor({
    transferId,
    timestamp,
    sourceChain,
    destinationChain,
    assetId,
    amount,
    sourceTxHash,
    destinationTxHash = "",
    dppHash,
    status,
    notes = "",
    secret = "",
    route = [],
  }) {
    if (!transferId) {
      throw new Error("CrossChainTransfer requires a transferId.");
    }

    if (!timestamp) {
      throw new Error("CrossChainTransfer requires a timestamp.");
    }

    if (!sourceChain) {
      throw new Error("CrossChainTransfer requires a sourceChain.");
    }

    if (!destinationChain) {
      throw new Error("CrossChainTransfer requires a destinationChain.");
    }

    if (!assetId) {
      throw new Error("CrossChainTransfer requires an assetId.");
    }

    if (amount === undefined || amount === null) {
      throw new Error("CrossChainTransfer requires an amount.");
    }

    if (!sourceTxHash) {
      throw new Error("CrossChainTransfer requires a sourceTxHash.");
    }

    if (!dppHash) {
      throw new Error("CrossChainTransfer requires a dppHash.");
    }

    if (!status) {
      throw new Error("CrossChainTransfer requires a status.");
    }

    if (!Array.isArray(route)) {
      throw new Error("CrossChainTransfer route must be an array.");
    }

    this.transferId = transferId;
    this.timestamp = timestamp;
    this.sourceChain = sourceChain;
    this.destinationChain = destinationChain;
    this.assetId = assetId;
    this.amount = String(amount);
    this.sourceTxHash = sourceTxHash;
    this.destinationTxHash = destinationTxHash;
    this.dppHash = dppHash;
    this.status = status;
    this.notes = notes;
    this.secret = secret;
    this.route = [...route];
  }

  /**
   * Converts this model into the positional parameter format expected by
   * the current Fabric CreateTransferRecord chaincode function.
   */
  toFabricCreateParams() {
    return [
      this.transferId,
      this.timestamp,
      this.sourceChain,
      this.destinationChain,
      this.assetId,
      this.amount,
      this.sourceTxHash,
      this.destinationTxHash,
      this.dppHash,
      this.status,
      this.notes,
      this.secret,
      JSON.stringify(this.route),
    ];
  }
}

module.exports = {
  CrossChainTransfer,
};
