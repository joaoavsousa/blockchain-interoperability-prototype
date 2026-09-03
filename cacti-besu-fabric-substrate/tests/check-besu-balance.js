"use strict";

const fs = require("fs");

const {
  PluginRegistry,
} = require("@hyperledger/cactus-core");

const {
  BesuAdapter,
} = require("./adapters/BesuAdapter");

async function main() {
  const artifact =
    JSON.parse(
      fs.readFileSync(
        "../besu-contract/besu-asset.json",
        "utf8",
      ),
    );

  const pluginRegistry =
    new PluginRegistry({
      plugins: [],
    });

  const account =
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const besuAdapter =
    new BesuAdapter({
      pluginRegistry,
      account,
      privateKey,
    });

  try {
    const balance =
      await besuAdapter
        .getAssetBalance({
          artifact,
          assetId: 2001,
          ownerAddress:
            account,
        });

    console.log(
      "Asset ID:",
      2001,
    );

    console.log(
      "Owner:",
      account,
    );

    console.log(
      "Besu/EVM balance:",
      balance.toString(),
    );
  } finally {
    const connector =
      besuAdapter.getConnector();

    if (connector) {
      await connector.shutdown();
    }
  }
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
