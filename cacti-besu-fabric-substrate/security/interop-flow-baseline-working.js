"use strict";

const {
  CrossChainTransferService,
} = require("./services/CrossChainTransferService");

async function main() {
  try {
    const transferService = new CrossChainTransferService();

    await transferService.executeTransfer();

    process.exit(0);
  } catch (err) {
    console.error("====================================");
    console.error("Interop flow failed:");
    console.error(err);
    console.error("====================================");

    process.exit(1);
  }
}

main();
