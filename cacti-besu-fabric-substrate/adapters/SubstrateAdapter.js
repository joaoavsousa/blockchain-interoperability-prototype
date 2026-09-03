const {
  ApiPromise,
  WsProvider,
  Keyring,
} = require("@polkadot/api");

const {
  PluginLedgerConnectorPolkadot,
  Web3SigningCredentialType,
} = require(
  "@hyperledger/cactus-plugin-ledger-connector-polkadot"
);

class SubstrateAdapter {
  constructor({
    pluginRegistry,
    wsProviderUrl = "ws://127.0.0.1:9944",
    signerUri = "//Alice",
    instanceId = `substrate-adapter-${Date.now()}`,
    logLevel = "INFO",
  }) {
    if (!pluginRegistry) {
      throw new Error("SubstrateAdapter requires pluginRegistry");
    }

    this.wsProviderUrl = wsProviderUrl;
    this.signerUri = signerUri;

    this.connector = new PluginLedgerConnectorPolkadot({
      instanceId,
      wsProviderUrl,
      pluginRegistry,
      logLevel,
      autoConnect: false,
    });

    this.provider = null;
    this.api = null;
    this.signer = null;
  }

  async connect() {
    await this.connector.onPluginInit();

    this.provider = new WsProvider(this.wsProviderUrl);
    this.api = await ApiPromise.create({
      provider: this.provider,
    });

    const keyring = new Keyring({
      type: "sr25519",
    });

    this.signer = keyring.addFromUri(this.signerUri);
  }

  async submitSignedExtrinsic(extrinsic) {
    if (!this.api || !this.signer) {
      throw new Error(
        "SubstrateAdapter is not connected",
      );
    }

    await extrinsic.signAsync(this.signer);

    const signedTransactionHex = extrinsic.toHex();

    const response = await this.connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      transactionConfig: {
        transferSubmittable:
          signedTransactionHex,
      },
    });

    if (!response.success) {
      throw new Error(
        "Substrate transaction failed",
      );
    }

    return response;
  }

  async assetExists(assetId) {
    const asset =
      await this.api.query.assets.asset(assetId);

    return !asset.isNone;
  }

  async createAsset({
    assetId,
    adminAddress,
    minimumBalance = 1,
  }) {
    const exists = await this.assetExists(assetId);

    if (exists) {
      return {
        skipped: true,
        reason: `Asset ${assetId} already exists`,
      };
    }

    const extrinsic = this.api.tx.assets.create(
      assetId,
      adminAddress,
      minimumBalance,
    );

    return this.submitSignedExtrinsic(extrinsic);
  }

  async mintAsset({
    assetId,
    beneficiaryAddress,
    amount = 1,
  }) {
    const extrinsic = this.api.tx.assets.mint(
      assetId,
      beneficiaryAddress,
      amount,
    );

    return this.submitSignedExtrinsic(extrinsic);
  }

  async setAssetMetadata({
  assetId,
  name,
  symbol,
  decimals = 0,
}) {
  if (!this.api) {
    throw new Error(
      "SubstrateAdapter is not connected",
    );
  }

  const extrinsic =
    this.api.tx.assets.setMetadata(
      assetId,
      name,
      symbol,
      decimals,
    );

  return this.submitSignedExtrinsic(extrinsic);
}

async createDigitalProductPassport({
  assetId,
  ownerAddress,
  productId,
  manufacturer,
  dppHash,
  metadataUri,
  amount = 1,
}) {
  if (!assetId && assetId !== 0) {
    throw new Error("DPP assetId is required");
  }

  if (!ownerAddress) {
    throw new Error(
      "DPP ownerAddress is required",
    );
  }

  if (!productId) {
    throw new Error(
      "DPP productId is required",
    );
  }

  if (!dppHash) {
    throw new Error(
      "DPP dppHash is required",
    );
  }

  if (!metadataUri) {
    throw new Error(
      "DPP metadataUri is required",
    );
  }

  const createResult =
    await this.createAsset({
      assetId,
      adminAddress: this.signer.address,
      minimumBalance: 1,
    });

  const assetName =
    String(productId).slice(0, 32);

  const assetSymbol =
    `DPP${assetId}`.slice(0, 10);

  const metadataResult =
    await this.setAssetMetadata({
      assetId,
      name: assetName,
      symbol: assetSymbol,
      decimals: 0,
    });

  const mintResult =
    await this.mintAsset({
      assetId,
      beneficiaryAddress: ownerAddress,
      amount,
    });

  return {
    success:
      mintResult.success === true &&
      metadataResult.success === true,

    assetId,
    ownerAddress,
    amount,

    dpp: {
      productId,
      manufacturer,
      dppHash,
      metadataUri,
    },

    substrate: {
      createResult,
      metadataResult,
      mintResult,
    },
  };
}

async readAssetMetadata(assetId) {
  if (!this.api) {
    throw new Error(
      "SubstrateAdapter is not connected",
    );
  }

  const metadata =
    await this.api.query.assets.metadata(
      assetId,
    );

  return {
    name: metadata.name.toUtf8(),
    symbol: metadata.symbol.toUtf8(),
    decimals: metadata.decimals.toNumber(),
    isFrozen: metadata.isFrozen.valueOf(),
  };
}

async readDigitalProductPassport({
  assetId,
  ownerAddress,
}) {
  const exists =
    await this.assetExists(assetId);

  if (!exists) {
    return null;
  }

  const metadata =
    await this.readAssetMetadata(assetId);

  const balance =
    await this.readAssetBalance({
      assetId,
      accountAddress: ownerAddress,
    });

  return {
    assetId,
    ownerAddress,
    balance,
    metadata,
  };
}

  async readAssetBalance({
    assetId,
    accountAddress,
  }) {
    const account =
      await this.api.query.assets.account(
        assetId,
        accountAddress,
      );

    if (account.isNone) {
      return 0;
    }

    return Number(account.unwrap().balance.toString());
  }

  async shutdown() {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }

    if (
      typeof this.connector
        .shutdownConnectionToSubstrate === "function"
    ) {
      await this.connector
        .shutdownConnectionToSubstrate();
    } else {
      await this.connector.shutdown();
    }
  }

  getConnector() {
    return this.connector;
  }
}

module.exports = {
  SubstrateAdapter,
};
