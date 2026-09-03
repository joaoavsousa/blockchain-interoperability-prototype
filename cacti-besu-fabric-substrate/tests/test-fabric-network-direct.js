const fs = require("fs");
const path = require("path");
const { Gateway, Wallets } = require("fabric-network");

async function main() {
  const fabricBase =
    "/home/admin/Desktop/joaosousa/fabric-samples/test-network";

  const ccpPath = path.join(
    fabricBase,
    "organizations/peerOrganizations/org1.example.com/connection-org1.json"
  );

  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  const certPath = path.join(
    fabricBase,
    "organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem"
  );

  const keyDir = path.join(
    fabricBase,
    "organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore"
  );

  const keyFile = fs.readdirSync(keyDir)[0];
  const keyPath = path.join(keyDir, keyFile);

  const identity = {
    credentials: {
      certificate: fs.readFileSync(certPath, "utf8"),
      privateKey: fs.readFileSync(keyPath, "utf8"),
    },
    mspId: "Org1MSP",
    type: "X.509",
  };

  const wallet = await Wallets.newInMemoryWallet();
  await wallet.put("admin", identity);

  const gateway = new Gateway();

  await gateway.connect(ccp, {
    wallet,
    identity: "admin",
    discovery: {
      enabled: true,
      asLocalhost: true,
    },
  });

  const network = await gateway.getNetwork("mychannel");
  const contract = network.getContract("basic");

  console.log("Querying ReadAsset(asset2) with fabric-network directly...");

  const result = await contract.evaluateTransaction("ReadAsset", "asset2");

  console.log(result.toString());

  gateway.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
