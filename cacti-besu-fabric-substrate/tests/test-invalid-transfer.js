"use strict";

const {
  CrossChainTransferService,
} = require(
  "./services/CrossChainTransferService",
);

async function main() {
  const transferService =
    new CrossChainTransferService();

  await transferService.executeTransfer({
    assetId: "",
    amount: -3,
  });
}

main().catch((error) => {
  console.error(
    "Expected validation error:",
    error.message,
  );
});
