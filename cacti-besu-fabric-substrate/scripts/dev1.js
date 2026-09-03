const fs = require("fs");
const path = require("path");

const { PluginRegistry } = require("@hyperledger/cactus-core");

const {
  PluginLedgerConnectorFabric,
} = require("@hyperledger/cactus-plugin-ledger-connector-fabric");

const {
  PluginKeychainMemory,
} = require("@hyperledger/cactus-plugin-keychain-memory");

const {
   FabricContractInvocationType,
} = require("@hyperledger/cactus-plugin-ledger-connector-fabric");

async function main() {
  let connector;

  try {
    const fabricBase =
      "/home/admin/Desktop/joaosousa/fabric-samples/test-network";

    const ccpPath = path.join(
      fabricBase,
      "organizations/peerOrganizations/org1.example.com/connection-org1.json"
    );

    const connectionProfile = JSON.parse(
      fs.readFileSync(ccpPath, "utf8")
    );

    const keychain = new PluginKeychainMemory({
      instanceId: "memory-keychain",
      keychainId: "fabric-keychain",
      logLevel: "INFO",
      backend: new Map(),
    });

    const pluginRegistry = new PluginRegistry({
      plugins: [keychain],
    });

    connector = new PluginLedgerConnectorFabric({
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
/*    
    const fabricBase =
  "/home/admin/Desktop/joaosousa/fabric-samples/test-network";
*/
const certPath =
  `${fabricBase}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem`;

const keyDir =
  `${fabricBase}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore`;

const keyFile = fs.readdirSync(keyDir)[0];

const privateKeyPath = `${keyDir}/${keyFile}`;
/*
await keychain.set(
    "adminCert",
    JSON.stringify({
      certificate: fs.readFileSync(certPath, "utf8"),
    })
);


await keychain.set(
    "adminKey",
    JSON.stringify({
      privateKey: fs.readFileSync(privateKeyPath, "utf8"),
   })
);
*/


await keychain.set(
    "adminIdentity",
    JSON.stringify({
      type: "X.509",
      credentials:  {
	certificate: fs.readFileSync(certPath, "utf8"),
	privateKey: fs.readFileSync(privateKeyPath, "utf8"),
      },
      mspId: "Org1MSP",
      gatewayOptions: {
	discovery: {
	  enabled: true,
	  asLocalhost: true,
	},
      },
    })
);

    const res = await connector.transact({
      channelName: "mychannel",
      contractName: "basic",
      invocationType: FabricContractInvocationType.Call,
      methodName: "ReadAsset",
      //methodName: "GetAllAssets",
      params: ["cacti-asset-1782928965912"],
      //params: [],
      //endorsingOrgs: ["Org1MSP"],
      signingCredential: {
        keychainId: "fabric-keychain",
        keychainRef: "adminIdentity",
	type: "X.509",
      	/*gatewayOptions: {
	   discovery: {
	   	enabled: true,
	   	asLocalhost: true,
	   },
	},*/
      },
      /*
      gatewayOption: {
	discovery: {
	  enabled: true,
	  asLocalhost: true,
	},
      },*/
      //endorsingPeers: ["peer0.org1.example.com"],
    });

    console.log("Cacti Fabric GetAllAssets result:");
    console.log(JSON.stringify(res, null, 2));

    await connector.shutdown();
    process.exit(0);
  } catch (err) {
    console.error(err);

    if (connector) {
      await connector.shutdown();
    }

    process.exit(1);
  }
}

main();
