/*const fs = require("fs");
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

async function main() {
  let besuConnector;
  let fabricConnector;

  try {
    const evmAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const evmPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const amount = 3;

    const artifact = JSON.parse(
      fs.readFileSync("../besu-contract/besu-asset.json", "utf8")
    );

    const fabricBase =
      "/home/admin/Desktop/joaosousa/fabric-samples/test-network";

    const keychain = new PluginKeychainMemory({
      instanceId: "memory-keychain",
      keychainId: "fabric-keychain",
      logLevel: "INFO",
      backend: new Map(),
    });

    const pluginRegistry = new PluginRegistry({
      plugins: [keychain],
    });

    // =========================
    // Cacti EVM connector
    // =========================

    besuConnector = new PluginLedgerConnectorBesu({
      instanceId: "besu-connector-hardhat",
      pluginRegistry,
      rpcApiHttpHost: "http://127.0.0.1:8545",
      rpcApiWsHost: "ws://127.0.0.1:8545",
      logLevel: "INFO",
    });

    const balanceBefore = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "CALL",
      methodName: "balanceOf",
      params: [evmAccount],
    });

    console.log("EVM balance before:", balanceBefore.callOutput);

    if (BigInt(balanceBefore.callOutput) < BigInt(amount)) {
      console.log("Insufficient EVM balance. Minting 10 first...");

      await besuConnector.invokeContract({
        contractAddress: artifact.address,
        contractAbi: artifact.abi,
        invocationType: "SEND",
        methodName: "mint",
        params: [evmAccount, 10],
        gas: 1000000,
        signingCredential: {
          type: "PRIVATE_KEY_HEX",
          ethAccount: evmAccount,
          secret: evmPrivateKey,
        },
      });

      console.log("Minted 10.");
    }

    console.log("Burning on EVM through Cacti...");

    const burnRes = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "SEND",
      methodName: "burn",
      params: [evmAccount, amount],
      gas: 1000000,
      signingCredential: {
        type: "PRIVATE_KEY_HEX",
        ethAccount: evmAccount,
        secret: evmPrivateKey,
      },
    });

    const evmTxHash =
      burnRes.out.transactionReceipt.transactionHash;

    console.log("EVM burn tx hash:", evmTxHash);

    // =========================
    // Cacti Fabric connector
    // =========================

    const ccpPath = path.join(
      fabricBase,
      "organizations/peerOrganizations/org1.example.com/connection-org1.json"
    );

    const connectionProfile = JSON.parse(
      fs.readFileSync(ccpPath, "utf8")
    );

    fabricConnector = new PluginLedgerConnectorFabric({
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

    const proofId = `cacti-proof-${Date.now()}`;

    console.log("Writing Fabric proof through Cacti...");

    const fabricWriteRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "basic",
      invocationType: FabricContractInvocationType.Send,
      methodName: "CreateAsset",
      params: [
        proofId,
        "evm-burn",
        String(amount),
        evmTxHash,
        "0",
      ],
      signingCredential: {
        keychainId: "fabric-keychain",
        keychainRef: "adminIdentity",
        type: "X.509",
      },
    });

    console.log("Fabric proof write result:");
    console.log(JSON.stringify(fabricWriteRes, null, 2));

    console.log("Reading Fabric proof back...");

    const fabricReadRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "basic",
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadAsset",
      params: [proofId],
      signingCredential: {
        keychainId: "fabric-keychain",
        keychainRef: "adminIdentity",
        type: "X.509",
      },
    });

    console.log("Fabric proof read-back:");
    console.log(JSON.stringify(fabricReadRes, null, 2));

    console.log("Cacti forward interoperability flow complete.");
    console.log("Proof ID:", proofId);
    console.log("EVM burn tx:", evmTxHash);

    await besuConnector.shutdown();
    await fabricConnector.shutdown();
    process.exit(0);
  } catch (err) {
    console.error(err);

    if (besuConnector) {
      await besuConnector.shutdown();
    }

    if (fabricConnector) {
      await fabricConnector.shutdown();
    }

    process.exit(1);
  }
}

main();
*/


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

async function main() {
  let besuConnector;
  let fabricConnector;

  try {
    const evmAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const evmPrivateKey =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    const amount = 3;
    const assetId = "asset-001";
    const dppHash = "DPP_HASH_PLACEHOLDER";

    const artifact = JSON.parse(
      fs.readFileSync("../besu-contract/besu-asset.json", "utf8")
    );

    const fabricBase =
      "/home/admin/Desktop/joaosousa/fabric-samples/test-network";

    const keychain = new PluginKeychainMemory({
      instanceId: "memory-keychain",
      keychainId: "fabric-keychain",
      logLevel: "INFO",
      backend: new Map(),
    });

    const pluginRegistry = new PluginRegistry({
      plugins: [keychain],
    });

    // =========================
    // Cacti EVM connector
    // =========================

    besuConnector = new PluginLedgerConnectorBesu({
      instanceId: "besu-connector-hardhat",
      pluginRegistry,
      rpcApiHttpHost: "http://127.0.0.1:8545",
      rpcApiWsHost: "ws://127.0.0.1:8545",
      logLevel: "INFO",
    });

    const balanceBefore = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "CALL",
      methodName: "balanceOf",
      params: [evmAccount],
    });

    console.log("EVM balance before:", balanceBefore.callOutput);

    if (BigInt(balanceBefore.callOutput) < BigInt(amount)) {
      console.log("Insufficient EVM balance. Minting 10 first...");

      await besuConnector.invokeContract({
        contractAddress: artifact.address,
        contractAbi: artifact.abi,
        invocationType: "SEND",
        methodName: "mint",
        params: [evmAccount, 10],
        gas: 1000000,
        signingCredential: {
          type: "PRIVATE_KEY_HEX",
          ethAccount: evmAccount,
          secret: evmPrivateKey,
        },
      });

      console.log("Minted 10.");
    }

    console.log("Burning on EVM through Cacti...");

    const burnRes = await besuConnector.invokeContract({
      contractAddress: artifact.address,
      contractAbi: artifact.abi,
      invocationType: "SEND",
      methodName: "burn",
      params: [evmAccount, amount],
      gas: 1000000,
      signingCredential: {
        type: "PRIVATE_KEY_HEX",
        ethAccount: evmAccount,
        secret: evmPrivateKey,
      },
    });

    const evmTxHash = burnRes.out.transactionReceipt.transactionHash;

    console.log("EVM burn tx hash:", evmTxHash);

    // =========================
    // Cacti Fabric connector
    // =========================

    const ccpPath = path.join(
      fabricBase,
      "organizations/peerOrganizations/org1.example.com/connection-org1.json"
    );

    const connectionProfile = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    fabricConnector = new PluginLedgerConnectorFabric({
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

    const transferId = `transfer-${Date.now()}`;
    const timestamp = new Date().toISOString();

    console.log("Writing Fabric transfer record through Cacti...");

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
        evmTxHash,
        "",
        dppHash,
        "BURN_CONFIRMED",
        "Transfer registered through Fabric relay",
        "",
        JSON.stringify(["Besu", "Fabric"]),
      ],
      signingCredential: {
        keychainId: "fabric-keychain",
        keychainRef: "adminIdentity",
        type: "X.509",
      },
    });

    console.log("Fabric transfer record write result:");
    console.log(JSON.stringify(fabricWriteRes, null, 2));

    console.log("Reading Fabric transfer record back...");

    const fabricReadRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "interopcc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadTransferRecord",
      params: [transferId],
      signingCredential: {
        keychainId: "fabric-keychain",
        keychainRef: "adminIdentity",
        type: "X.509",
      },
    });

    console.log("Fabric transfer record read-back:");
    console.log(JSON.stringify(fabricReadRes, null, 2));

    console.log("Cacti forward interoperability flow complete.");
    console.log("Transfer ID:", transferId);
    console.log("EVM burn tx:", evmTxHash);

    await besuConnector.shutdown();
    await fabricConnector.shutdown();
    process.exit(0);
  } catch (err) {
    console.error(err);

    if (besuConnector) {
      await besuConnector.shutdown();
    }

    if (fabricConnector) {
      await fabricConnector.shutdown();
    }

    process.exit(1);
  }
}

main();
