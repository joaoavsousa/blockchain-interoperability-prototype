"use strict";

const {
  PluginLedgerConnectorBesu,
} = require("@hyperledger/cactus-plugin-ledger-connector-besu");

/**
 * Endpoint-ledger adapter for Hyperledger Besu.
 *
 */
class BesuAdapter {
  constructor({
    pluginRegistry,
    account,
    privateKey,
    rpcApiHttpHost = "http://127.0.0.1:8545",
    rpcApiWsHost = "ws://127.0.0.1:8545",
    instanceId = "besu-connector-hardhat",
    logLevel = "INFO",
  }) {
    if (!pluginRegistry) {
      throw new Error("BesuAdapter requires a pluginRegistry.");
    }

    if (!account) {
      throw new Error("BesuAdapter requires an account.");
    }

    if (!privateKey) {
      throw new Error("BesuAdapter requires a privateKey.");
    }

    this.account = account;
    this.privateKey = privateKey;

    this.connector = new PluginLedgerConnectorBesu({
      instanceId,
      pluginRegistry,
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
    });
  }

  getConnector() {
    return this.connector;
  }

  getAccount() {
    return this.account;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  validateAssetId(assetId) {
  const normalizedAssetId =
    Number(assetId);

  if (
    !Number.isSafeInteger(
      normalizedAssetId,
    ) ||
    normalizedAssetId <= 0
  ) {
    throw new Error(
      `Invalid Besu asset ID: ${assetId}.`,
    );
  }

  return normalizedAssetId;
}

validateAmount(amount) {
  const normalizedAmount =
    Number(amount);

  if (
    !Number.isSafeInteger(
      normalizedAmount,
    ) ||
    normalizedAmount <= 0
  ) {
    throw new Error(
      `Invalid Besu asset amount: ${amount}.`,
    );
  }

  return normalizedAmount;
}

validateArtifact(artifact) {
  if (
    !artifact ||
    typeof artifact !== "object"
  ) {
    throw new Error(
      "A Besu contract artifact is required.",
    );
  }

  if (
    typeof artifact.address !== "string" ||
    !artifact.address
  ) {
    throw new Error(
      "The Besu contract address is required.",
    );
  }

  if (!Array.isArray(artifact.abi)) {
    throw new Error(
      "The Besu contract ABI is required.",
    );
  }
}

async getAssetBalance({
  artifact,
  assetId,
  ownerAddress = this.account,
}) {
  this.validateArtifact(artifact);

  const normalizedAssetId =
    this.validateAssetId(assetId);

  if (
    typeof ownerAddress !== "string" ||
    !ownerAddress
  ) {
    throw new Error(
      "A Besu owner address is required.",
    );
  }

  const response =
    await this.connector
      .invokeContract({
        contractAddress:
          artifact.address,

        contractAbi:
          artifact.abi,

        invocationType:
          "CALL",

        methodName:
          "balanceOf",

        params: [
          normalizedAssetId,
          ownerAddress,
        ],
      });

  return BigInt(
    response.callOutput,
  );
}

async mintAsset({
  artifact,
  assetId,
  ownerAddress = this.account,
  amount,
}) {
  this.validateArtifact(artifact);

  const normalizedAssetId =
    this.validateAssetId(assetId);

  const normalizedAmount =
    this.validateAmount(amount);

  if (
    typeof ownerAddress !== "string" ||
    !ownerAddress
  ) {
    throw new Error(
      "A Besu destination address is required.",
    );
  }

  const nonce =
    await this.getNextNonce();

  const response =
    await this.connector
      .invokeContract({
        contractAddress:
          artifact.address,

        contractAbi:
          artifact.abi,

        invocationType:
          "SEND",

        methodName:
          "mint",

        params: [
          normalizedAssetId,
          ownerAddress,
          normalizedAmount,
        ],

        gas:
          1000000,

        nonce,

        signingCredential: {
          type:
            "PRIVATE_KEY_HEX",

          ethAccount:
            this.account,

          secret:
            this.privateKey,
        },
      });

  const transactionHash =
    response
      ?.out
      ?.transactionReceipt
      ?.transactionHash;

  if (!transactionHash) {
    throw new Error(
      "The Besu mint operation did not return a transaction hash.",
    );
  }

  return {
    response,
    transactionHash,
  };
}

async burnAsset({
  artifact,
  assetId,
  ownerAddress = this.account,
  amount,
}) {
  this.validateArtifact(artifact);

  const normalizedAssetId =
    this.validateAssetId(assetId);

  const normalizedAmount =
    this.validateAmount(amount);

  if (
    typeof ownerAddress !== "string" ||
    !ownerAddress
  ) {
    throw new Error(
      "A Besu source address is required.",
    );
  }

  const nonce =
    await this.getNextNonce();

  const response =
    await this.connector
      .invokeContract({
        contractAddress:
          artifact.address,

        contractAbi:
          artifact.abi,

        invocationType:
          "SEND",

        methodName:
          "burn",

        params: [
          normalizedAssetId,
          ownerAddress,
          normalizedAmount,
        ],

        gas:
          1000000,

        nonce,

        signingCredential: {
          type:
            "PRIVATE_KEY_HEX",

          ethAccount:
            this.account,

          secret:
            this.privateKey,
        },
      });

  const transactionHash =
    response
      ?.out
      ?.transactionReceipt
      ?.transactionHash;

  if (!transactionHash) {
    throw new Error(
      "The Besu burn operation did not return a transaction hash.",
    );
  }

  return {
    response,
    transactionHash,
  };
}

  async getNextNonce() {
    return this.connector.web3.eth.getTransactionCount(
      this.account,
      "pending",
    );
  }
}

module.exports = {
  BesuAdapter,
};
