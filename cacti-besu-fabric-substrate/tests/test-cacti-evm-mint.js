const fs = require("fs");

const { PluginRegistry } = require("@hyperledger/cactus-core");

const {
  PluginLedgerConnectorBesu,
} = require("@hyperledger/cactus-plugin-ledger-connector-besu");

/*
const {
  EthContractInvocationType,
  Web3SigningCredentialType,
} = require("@hyperledger/cactus-core-api");
*/

async function main() {
  let connector;

  try {
    const artifact = JSON.parse(
      fs.readFileSync("../besu-contract/besu-asset.json", "utf8")
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [],
    });

    connector = new PluginLedgerConnectorBesu({
      instanceId: "besu-connector-hardhat",
      pluginRegistry,
      rpcApiHttpHost: "http://127.0.0.1:8545",
      rpcApiWsHost: "ws://127.0.0.1:8545",
      logLevel: "INFO",
    });

    const contractAddress = artifact.address;
    const contractAbi = artifact.abi;

    const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    console.log("Minting 5 through Cacti...");

    const mintRes = await connector.invokeContract({
      contractAddress,
      contractAbi,
      invocationType: "SEND",
      methodName: "mint",
      params: [account, 5],
      gas: 1000000,
      signingCredential: {
        type: "PRIVATE_KEY_HEX",
        ethAccount: account,
        secret: privateKey,
      },
    });

    console.log("Mint result:");
    console.log(JSON.stringify(mintRes, null, 2));

    const balanceRes = await connector.invokeContract({
      contractAddress,
      contractAbi,
      invocationType: "CALL",
      methodName: "balanceOf",
      params: [account],
    });

    console.log("Balance after mint:");
    console.log(JSON.stringify(balanceRes, null, 2));

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
