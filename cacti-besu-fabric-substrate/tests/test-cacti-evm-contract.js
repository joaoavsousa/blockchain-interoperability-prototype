const fs = require("fs");
const { PluginRegistry } = require("@hyperledger/cactus-core");
const { PluginLedgerConnectorBesu } = require(
  "@hyperledger/cactus-plugin-ledger-connector-besu"
);

async function main() {
  let connector;

  try {
    const artifact = JSON.parse(
      fs.readFileSync("../besu-contract/besu-asset.json", "utf8")
    );

    const pluginRegistry = new PluginRegistry({
      plugins: []
    });

    connector = new PluginLedgerConnectorBesu({
      instanceId: "besu-connector-hardhat",
      pluginRegistry,
      rpcApiHttpHost: "http://127.0.0.1:8545",
      rpcApiWsHost: "ws://127.0.0.1:8545",
      logLevel: "INFO"
    });

    const contractAddress = artifact.address;
    const contractAbi = artifact.abi;

    const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    const res = await connector.invokeContract({
      contractAddress,
      invocationType: "CALL",
      methodName: "balanceOf",
      params: [account],
      contractAbi
    });

    console.log("Cacti balanceOf result:");
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
