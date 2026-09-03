"use strict";

const {
  PluginRegistry,
} = require("@hyperledger/cactus-core");

const {
  SubstrateAdapter,
} = require("./adapters/SubstrateAdapter");

async function main() {
  const pluginRegistry =
    new PluginRegistry({
      plugins: [],
    });

  const substrateAdapter =
    new SubstrateAdapter({
      pluginRegistry,
      wsProviderUrl:
        "ws://127.0.0.1:9944",
      signerUri:
        "//Alice",
      logLevel:
	"ERROR",
    });

  try {
    await substrateAdapter.connect();

    const ownerAddress =
      substrateAdapter.signer.address;

    const representation =
      await substrateAdapter
        .readDigitalProductPassport({
          assetId: 2001,
          ownerAddress,
        });

    console.log(
      "Asset ID:",
      2001,
    );

    console.log(
      "Destination owner:",
      ownerAddress,
    );

    if (!representation) {
      console.log(
        "Substrate asset: NOT PRESENT",
      );

      console.log(
        "Substrate balance: 0",
      );

      return;
    }

    console.log(
      "Substrate asset: PRESENT",
    );

    console.log(
      "Substrate balance:",
      representation.balance,
    );

    console.log(
      "Metadata:",
      representation.metadata,
    );
  } finally {
    await substrateAdapter.shutdown();
  }
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
