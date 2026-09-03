"use strict";

const fs = require("fs");
const path = require("path");

const {
  PluginLedgerConnectorFabric,
  FabricContractInvocationType,
} = require("@hyperledger/cactus-plugin-ledger-connector-fabric");

class FabricRelayAdapter {
  constructor({
    pluginRegistry,
    keychain,
    fabricBase,
    channelName = "mychannel",
    contractName = "interopcc",
  }) {
    if (!pluginRegistry) {
      throw new Error("FabricRelayAdapter requires a pluginRegistry.");
    }

    if (!keychain) {
      throw new Error("FabricRelayAdapter requires a keychain.");
    }

    if (!fabricBase) {
      throw new Error("FabricRelayAdapter requires fabricBase.");
    }

    this.pluginRegistry = pluginRegistry;
    this.keychain = keychain;
    this.fabricBase = fabricBase;
    this.channelName = channelName;
    this.contractName = contractName;
    this.connector = null;
  }

  async connect() {
    const ccpPath = path.join(
      this.fabricBase,
      "organizations/peerOrganizations/org1.example.com/connection-org1.json",
    );

    const connectionProfile = JSON.parse(
      fs.readFileSync(ccpPath, "utf8"),
    );

    this.connector = new PluginLedgerConnectorFabric({
      instanceId: "fabric-connector-org1",
      pluginRegistry: this.pluginRegistry,
      connectionProfile,
      peerBinary: path.join(this.fabricBase, "../bin/peer"),
      logLevel: "DEBUG",
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
    });

    const identityBase = path.join(
      this.fabricBase,
      "organizations/peerOrganizations/org1.example.com",
      "users/Admin@org1.example.com/msp",
    );

    const certPath = path.join(
      identityBase,
      "signcerts/cert.pem",
    );

    const keyDir = path.join(identityBase, "keystore");
    const keyFiles = fs.readdirSync(keyDir);

    if (keyFiles.length === 0) {
      throw new Error(`No Fabric private key found in ${keyDir}.`);
    }

    const privateKeyPath = path.join(keyDir, keyFiles[0]);

    await this.keychain.set(
      "adminIdentity",
      JSON.stringify({
        type: "X.509",
        credentials: {
          certificate: fs.readFileSync(certPath, "utf8"),
          privateKey: fs.readFileSync(privateKeyPath, "utf8"),
        },
        mspId: "Org1MSP",
      }),
    );

    return this;
  }

  getSigningCredential() {
    return {
      keychainId: "fabric-keychain",
      keychainRef: "adminIdentity",
      type: "X.509",
    };
  }

  async createTransferRecord(transfer) {
    this.assertConnected();

    return this.connector.transact({
      channelName: this.channelName,
      contractName: this.contractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "CreateTransferRecord",
      params: transfer.toFabricCreateParams(),
      signingCredential: this.getSigningCredential(),
    });
  }

  async readTransferRecord(transferId) {
    this.assertConnected();

    const response = await this.connector.transact({
      channelName: this.channelName,
      contractName: this.contractName,
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadTransferRecord",
      params: [transferId],
      signingCredential: this.getSigningCredential(),
    });

    const record = JSON.parse(response.functionOutput);

    return {
	...record,
	transferId:
	  record.transferId ??
	  record.transactionId,
	};
  }

  async updateDestinationTxHash(transferId, destinationTxHash) {
    this.assertConnected();

    return this.connector.transact({
      channelName: this.channelName,
      contractName: this.contractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "UpdateDestinationTxHash",
      params: [transferId, destinationTxHash],
      signingCredential: this.getSigningCredential(),
    });
  }

  async shutdown() {
    if (this.connector) {
      await this.connector.shutdown();
      this.connector = null;
    }
  }

  assertConnected() {
    if (!this.connector) {
      throw new Error(
        "FabricRelayAdapter is not connected. Call connect() first.",
      );
    }
  }
}

module.exports = {
  FabricRelayAdapter,
};
