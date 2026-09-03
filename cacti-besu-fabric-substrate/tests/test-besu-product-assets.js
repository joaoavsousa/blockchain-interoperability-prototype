"use strict";

const fs = require("fs");

const {
  PluginRegistry,
} = require("@hyperledger/cactus-core");

const {
  BesuAdapter,
} = require("../adapters/BesuAdapter");

async function main() {
  const artifact =
    JSON.parse(
      fs.readFileSync(
        "../besu-contract/besu-asset.json",
        "utf8",
      ),
    );

  const account =
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const pluginRegistry =
    new PluginRegistry({
      plugins: [],
    });

  const besuAdapter =
    new BesuAdapter({
      pluginRegistry,
      account,
      privateKey,
    });

  const assetId = 5001;

  try {
    const balanceBefore =
      await besuAdapter
        .getAssetBalance({
          artifact,
          assetId,
        });

    console.log(
      "Balance before mint:",
      balanceBefore.toString(),
    );

    const mintResult =
      await besuAdapter
        .mintAsset({
          artifact,
          assetId,
          amount: 10,
        });

    console.log(
      "Mint transaction:",
      mintResult.transactionHash,
    );

    const balanceAfterMint =
      await besuAdapter
        .getAssetBalance({
          artifact,
          assetId,
        });

    console.log(
      "Balance after mint:",
      balanceAfterMint.toString(),
    );

    const burnResult =
      await besuAdapter
        .burnAsset({
          artifact,
          assetId,
          amount: 4,
        });

    console.log(
      "Burn transaction:",
      burnResult.transactionHash,
    );

    const finalBalance =
      await besuAdapter
        .getAssetBalance({
          artifact,
          assetId,
        });

    console.log(
      "Final balance:",
      finalBalance.toString(),
    );

    if (
      balanceAfterMint !==
      balanceBefore + 10n
    ) {
      throw new Error(
        "Unexpected balance after mint.",
      );
    }

    if (
      finalBalance !==
      balanceAfterMint - 4n
    ) {
      throw new Error(
        "Unexpected balance after burn.",
      );
    }

    console.log(
      "Besu product-specific adapter test passed.",
    );
  } finally {
    await besuAdapter
      .getConnector()
      .shutdown();
  }
}

main().catch((error) => {
  console.error(
    "Besu product-specific adapter test failed:",
    error,
  );

  process.exitCode = 1;
});
