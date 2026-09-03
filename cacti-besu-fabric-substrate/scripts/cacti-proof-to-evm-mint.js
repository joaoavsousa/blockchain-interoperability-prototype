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
    const evmPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const amount = 3;
    const proofId = "transfer-1783535758385";

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

    


    console.log("Reading Fabric proof...");


    //===========================================
    // FABRIC READ SECTION
    //============================================
    const fabricReadRes = await fabricConnector.transact({
      channelName: "mychannel",
      contractName: "interopcc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadTransferRecord",
      params: [proofId],
      signingCredential: {
        keychainId: "fabric-keychain",
        keychainRef: "adminIdentity",
        type: "X.509",
      },
    });

    const proof = JSON.parse(fabricReadRes.functionOutput);

    console.log("Fabric proof:");
    console.log(proof);
    

    if(proof.status !== "BURN_CONFIRMED") {
      throw new Error(`Invalid transfer status: ${proof.status}`);
    }

    const mintAmount = Number(proof.amount);


    console.log(`Minting ${mintAmount} on destination EVM...`);



    const mintRes = await besuConnector.invokeContract({
  	  contractAddress: artifact.address,
	  contractAbi: artifact.abi,
	  invocationType: "SEND",
	  methodName: "mint",
	  params: [evmAccount, mintAmount],
	  gas: 1000000,
	  signingCredential: {
	    type: "PRIVATE_KEY_HEX",
	    ethAccount: evmAccount,
	    secret: evmPrivateKey,
	  },
	});

    const mintTxHash = mintRes.out.transactionReceipt.transactionHash;

    console.log("Destination mint tx:");
    console.log(mintTxHash);

    // =====================================
    // Update Fabric transfer status
    // =====================================


    console.log("Updating Fabric transfer status...");

	await fabricConnector.transact({
	  channelName: "mychannel",
	  contractName: "interopcc",
	  invocationType: FabricContractInvocationType.Send,
	  methodName: "UpdateDestinationTxHash",
	  params: [
	    proof.transactionId,
	    mintTxHash,
	  ],
	  signingCredential: {
	    keychainId: "fabric-keychain",
	    keychainRef: "adminIdentity",
	    type: "X.509",
	  },
	});

	console.log("Fabric status updated to COMPLETED");


    console.log("Proof-gated destination mint complete.");



    //console.log("Cacti forward interoperability flow complete.");
    console.log("Fabric proof ID:", proofId);
    console.log("Destination mint amount:", mintAmount);
    

    
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
