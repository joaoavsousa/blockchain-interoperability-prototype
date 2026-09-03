"use strict";

const fs = require("fs");
const { ethers } = require("ethers");

async function main() {
  const artifact =
    JSON.parse(
      fs.readFileSync(
        "besu-asset.json",
        "utf8",
      ),
    );

  const provider =
    new ethers.JsonRpcProvider(
      "http://localhost:8545",
    );

  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const wallet =
    new ethers.Wallet(
      privateKey,
      provider,
    );

  const contract =
    new ethers.Contract(
      artifact.address,
      artifact.abi,
      wallet,
    );

  const owner =
    wallet.address;

  const assetId = 3001;

  console.log(
    "Owner:",
    owner,
  );

  console.log(
    "Asset ID:",
    assetId,
  );

  let nonce =
    await provider
      .getTransactionCount(
        owner,
        "pending",
      );

  let transaction =
    await contract.mint(
      assetId,
      owner,
      10,
      {
        nonce:
          nonce++,
      },
    );

  let receipt =
    await transaction.wait();

  console.log(
    "Mint transaction:",
    receipt.hash,
  );

  let balance =
    await contract.balanceOf(
      assetId,
      owner,
    );

  console.log(
    "Balance after mint:",
    balance.toString(),
  );

  transaction =
    await contract.burn(
      assetId,
      owner,
      5,
      {
        nonce:
          nonce++,
      },
    );

  receipt =
    await transaction.wait();

  console.log(
    "Burn transaction:",
    receipt.hash,
  );

  balance =
    await contract.balanceOf(
      assetId,
      owner,
    );

  console.log(
    "Final asset balance:",
    balance.toString(),
  );
}

main().catch((error) => {
  console.error(
    "Contract interaction failed:",
    error,
  );

  process.exitCode = 1;
});
