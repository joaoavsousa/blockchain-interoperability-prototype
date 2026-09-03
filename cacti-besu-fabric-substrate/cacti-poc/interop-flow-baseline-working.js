const fs = require("fs");
const path = require("path");

const { PluginRegistry } = require("@hyperledger/cactus-core");

const {
  PluginLedgerConnectorBesu,
} = require("@hyperledger/cactus-plugin-ledger-connector-besu");

const {
  PluginLedgerConnectorFabric,
  FabricContractInvocationType,
} = require("@hyperledger/cactus-plugin-ledger-connector-fabric");

const {
  PluginKeychainMemory,
} = require("@hyperledger/cactus-plugin-keychain-memory");

// =========================
// Configuration
// =========================

const evmAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const evmPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const amount = 3;
const assetId = "asset-001";
const dppHash = "DPP_HASH_PLACEHOLDER";

const fabricBase =
  "/home/admin/Desktop/joaosousa/fabric-samples/test-network";

const evmArtifactPath = "../besu-contract/besu-asset.json";

//==========================
// Nonce resolution v1
//==========================

let evmNonce = null;

async function getNextNonce(connector) {
  if (evmNonce === null) {
    evmNonce = await connector.web3.eth.getTransactionCount(evmAccount, "pending");
  }
  
  const nonce = evmNonce;
  evmNonce += 1;
  return nonce;
}



// =========================
// Shared setup
// =========================

function createPluginRegistryAndKeychain() {
  const keychain = new PluginKeychainMemory({
    instanceId: "memory-keychain",
    keychainId: "fabric-keychain",
    logLevel: "INFO",
    backend: new Map(),
  });

  const pluginRegistry = new PluginRegistry({
    plugins: [keychain],
  });

  return { keychain, pluginRegistry };
}

function createBesuConnector(pluginRegistry) {
  return new PluginLedgerConnectorBesu({
    instanceId: "besu-connector-hardhat",
    pluginRegistry,
    rpcApiHttpHost: "http://127.0.0.1:8545",
    rpcApiWsHost: "ws://127.0.0.1:8545",
    logLevel: "INFO",
  });
}

async function createFabricConnectorAndIdentity(pluginRegistry, keychain) {
  const ccpPath = path.join(
    fabricBase,
    "organizations/peerOrganizations/org1.example.com/connection-org1.json"
  );

  const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  const fabricConnector = new PluginLedgerConnectorFabric({
    instanceId: "fabric-connector-org1",
    pluginRegistry,
    connectionProfile,
    peerBinary: path.join(fabricBase, "../bin/peer"),
    logLevel: "DEBUG",

    discoveryOptions: {
      enabled: true,
      asLocalhost: true,
    },
  });

  const certPath =
    `${fabricBase}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem`;

  const keyDir =
    `${fabricBase}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore`;

  const keyFile = fs.readdirSync(keyDir)[0];
  const privateKeyPath = `${keyDir}/${keyFile}`;

  await keychain.set(
    "adminIdentity",
    JSON.stringify({
      type: "X.509",
      credentials: {
        certificate: fs.readFileSync(certPath, "utf8"),
        privateKey: fs.readFileSync(privateKeyPath, "utf8"),
      },
      mspId: "Org1MSP",
    })
  );

  return fabricConnector;
}

function getFabricSigningCredential() {
  return {
    keychainId: "fabric-keychain",
    keychainRef: "adminIdentity",
    type: "X.509",
  };
}

// =========================
// Phase 1: Source → Relay
// =========================

async function sourceToRelayTransfer() {
  let besuConnector;
  let fabricConnector;

  const { keychain, pluginRegistry } = createPluginRegistryAndKeychain();

  try {
    const artifact = JSON.parse(fs.readFileSync(evmArtifactPath, "utf8"));

    besuConnector = createBesuConnector(pluginRegistry);
    fabricConnector = await createFabricConnectorAndIdentity(
      pluginRegistry,
      keychain
    );

    console.log("=== PHASE 1: Source → Relay ===");

    const balanceBefore = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "CALL",
      methodName: "balanceOf",
      params: [evmAccount],
    });

    console.log("EVM balance before burn:", balanceBefore.callOutput);

    if (BigInt(balanceBefore.callOutput) < BigInt(amount)) {
      console.log("Insufficient EVM balance. Minting 10 first...");
      
      const mintfirstnonce = await getNextNonce(besuConnector);
      
      await besuConnector.invokeContract({
        contractAddress: artifact.address,
        contractAbi: artifact.abi,
        invocationType: "SEND",
        methodName: "mint",
        params: [evmAccount, 10],
        gas: 1000000,
	nonce: mintfirstnonce,
        signingCredential: {
          type: "PRIVATE_KEY_HEX",
          ethAccount: evmAccount,
          secret: evmPrivateKey,
        },
      });

      console.log("Minted 10.");
    }

    console.log("Burning on source EVM through Cacti...");

    const burnNonce = await getNextNonce(besuConnector);

    const burnRes = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "SEND",
      methodName: "burn",
      params: [evmAccount, amount],
      gas: 1000000,
      nonce: burnNonce,
      signingCredential: {
        type: "PRIVATE_KEY_HEX",
        ethAccount: evmAccount,
        secret: evmPrivateKey,
      },
    });

    const sourceTxHash = burnRes.out.transactionReceipt.transactionHash;
    console.log("Source EVM burn tx:", sourceTxHash);

    const transferId = `transfer-${Date.now()}`;
    const timestamp = new Date().toISOString();

    console.log("Writing Fabric transfer record...");

    const fabricWriteRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "interopcc",
      invocationType: FabricContractInvocationType.Send,
      methodName: "CreateTransferRecord",
      params: [
        transferId,
        timestamp,
        "Besu",
        "Iroha",
        assetId,
        String(amount),
        sourceTxHash,
        "",
        dppHash,
        "BURN_CONFIRMED",
        "Transfer registered through Fabric relay",
        "",
        JSON.stringify(["Besu", "Fabric"]),
      ],
      signingCredential: getFabricSigningCredential(),
    });

    console.log("Fabric transfer record write result:");
    console.log(JSON.stringify(fabricWriteRes, null, 2));

    console.log("Source → Relay complete.");
    console.log("Transfer ID:", transferId);

    return transferId;
  } finally {
    if (besuConnector) {
      await besuConnector.shutdown();
    }

    if (fabricConnector) {
      await fabricConnector.shutdown();
    }
  }
}

// =========================
// Phase 2: Relay → Destination
// =========================

async function relayToDestinationTransfer(transferId) {
  let besuConnector;
  let fabricConnector;

  const { keychain, pluginRegistry } = createPluginRegistryAndKeychain();

  try {
    const artifact = JSON.parse(fs.readFileSync(evmArtifactPath, "utf8"));

    besuConnector = createBesuConnector(pluginRegistry);
    fabricConnector = await createFabricConnectorAndIdentity(
      pluginRegistry,
      keychain
    );

    console.log("=== PHASE 2: Relay → Destination ===");

    console.log("Reading Fabric transfer record...");

    const fabricReadRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "interopcc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadTransferRecord",
      params: [transferId],
      signingCredential: getFabricSigningCredential(),
    });

    const transferRecord = JSON.parse(fabricReadRes.functionOutput);

    console.log("Fabric transfer record:");
    console.log(transferRecord);

    if (transferRecord.status !== "BURN_CONFIRMED") {
      throw new Error(
        `Invalid transfer status: ${transferRecord.status}. Expected BURN_CONFIRMED.`
      );
    }

    const mintAmount = Number(transferRecord.amount);

    console.log(`Minting ${mintAmount} on destination EVM...`);

    const mintNonce = await getNextNonce(besuConnector);

    const mintRes = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "SEND",
      methodName: "mint",
      params: [evmAccount, mintAmount],
      gas: 1000000,
      nonce: mintNonce,
      signingCredential: {
        type: "PRIVATE_KEY_HEX",
        ethAccount: evmAccount,
        secret: evmPrivateKey,
      },
    });

    const destinationTxHash =
      mintRes.out.transactionReceipt.transactionHash;

    console.log("Destination EVM mint tx:", destinationTxHash);

    console.log("Updating Fabric transfer record to COMPLETED...");

    const updateRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "interopcc",
      invocationType: FabricContractInvocationType.Send,
      methodName: "UpdateDestinationTxHash",
      params: [transferId, destinationTxHash],
      signingCredential: getFabricSigningCredential(),
    });

    console.log("Fabric update result:");
    console.log(JSON.stringify(updateRes, null, 2));

    console.log("Reading final Fabric transfer record...");

    const finalReadRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "interopcc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadTransferRecord",
      params: [transferId],
      signingCredential: getFabricSigningCredential(),
    });

    console.log("Final Fabric transfer record:");
    console.log(JSON.stringify(JSON.parse(finalReadRes.functionOutput), null, 2));

    console.log("Relay → Destination complete.");
    console.log("Transfer ID:", transferId);
    console.log("Destination tx:", destinationTxHash);

    return destinationTxHash;
  } finally {
    if (besuConnector) {
      await besuConnector.shutdown();
    }

    if (fabricConnector) {
      await fabricConnector.shutdown();
    }
  }
}

// =========================
// Main flow
// =========================

async function main() {
  try {
    const transferId = await sourceToRelayTransfer();

    console.log("Waiting 2 seconds before destination step...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await relayToDestinationTransfer(transferId);

    console.log("====================================");
    console.log("Full interoperability flow complete.");
    console.log("Transfer finalized successfully.");
    console.log("====================================");

    process.exit(0);

  } catch (err) {
    console.error("====================================");
    console.error("Interop flow failed:");
    console.error(err);
    console.error("====================================");

    process.exit(1);
  }
}

main();

main();
