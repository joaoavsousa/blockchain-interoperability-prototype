const { PluginRegistry } = require("@hyperledger/cactus-core");
const { PluginLedgerConnectorBesu } = require(
  "@hyperledger/cactus-plugin-ledger-connector-besu"
);

async function main() {
  const pluginRegistry = new PluginRegistry({ plugins: [] });

  const connector = new PluginLedgerConnectorBesu({
    instanceId: "besu-connector-hardhat",
    pluginRegistry,
    rpcApiHttpHost: "http://127.0.0.1:8545",
    rpcApiWsHost: "ws://127.0.0.1:8545",
    logLevel: "INFO"
  });

  console.log("Connector created.");

  console.log(
    "Available methods:",
    Object.getOwnPropertyNames(Object.getPrototypeOf(connector))
  );

  const res = await connector.getBlock({
    blockHashOrBlockNumber: "latest"
  });

  console.log("Cacti Besu connector reached EVM.");
  console.log(JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
