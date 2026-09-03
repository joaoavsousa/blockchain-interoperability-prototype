"use strict";

const {
  CrossChainTransferService,
} = require("./services/CrossChainTransferService");

async function main() {
  const transferService =
    new CrossChainTransferService();

  const result =
    await transferService.executeTransfer({
      assetId: "2001",
      amount: 3,
      notes: "Parameterized transfer service test",
    });

  console.log(
    "Transfer service result:",
    JSON.stringify(result, null, 2),
  );
}

main().catch((error) => {
  console.error(
    "Transfer service test failed:",
    error,
  );

  process.exitCode = 1;
});
