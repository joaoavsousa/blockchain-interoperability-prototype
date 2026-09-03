const {
  PluginRegistry,
} = require("@hyperledger/cactus-core");

const {
  SubstrateAdapter,
} = require("../adapters/SubstrateAdapter");

async function main() {
  const pluginRegistry =
    new PluginRegistry({
      plugins: [],
    });

  const substrate =
    new SubstrateAdapter({
      pluginRegistry,
      wsProviderUrl:
        "ws://127.0.0.1:9944",
      signerUri: "//Alice",
    });

  try {
    await substrate.connect();

    const bobAddress =
      "5FHneW46xGXgs5mUiveU4sbTyGBzmstX11Mr6rdFJ6QCPp2";

    const assetId = 1001;

    console.log(
      `Creating asset ${assetId}...`,
    );

    const createResult =
      await substrate.createAsset({
        assetId,
        adminAddress:
          substrate.signer.address,
        minimumBalance: 1,
      });

    console.log(
      "Create result:",
      createResult,
    );

    console.log(
      `Minting asset ${assetId} to Bob...`,
    );

    const mintResult =
      await substrate.mintAsset({
        assetId,
        beneficiaryAddress:
          bobAddress,
        amount: 1,
      });

    console.log(
      "Mint result:",
      mintResult,
    );

    const balance =
      await substrate.readAssetBalance({
        assetId,
        accountAddress:
          bobAddress,
      });

    console.log(
      `Bob asset balance: ${balance}`,
    );
  } finally {
    await substrate.shutdown();
  }
}

main().catch((error) => {
  console.error(
    "Substrate adapter test failed:",
  );

  if (error.response?.data) {
    console.error(
      JSON.stringify(
        error.response.data,
        null,
        2,
      ),
    );
  } else {
    console.error(error);
  }

  process.exit(1);
});
