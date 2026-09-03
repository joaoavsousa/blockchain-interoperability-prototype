"use strict";

const {
  CrossChainTransferService,
  createApplicationDependencies,
} = require("./services/CrossChainTransferService");

async function main() {
  const dependencies =
    createApplicationDependencies();

  const service =
    new CrossChainTransferService(
      dependencies,
    );

  const {
    dppRepository,
  } = dependencies;

  const transferRequest = {
    assetId: 2001,
    amount: 1,
    destinationChain:
      "Substrate",
    notes:
      "T03 integrity failure test",
  };

  console.log(
    "Starting source-to-relay phase...",
  );

  const transferId =
    await service
      .sourceToRelayTransfer(
        transferRequest,
      );

  console.log(
    "Transfer registered in Fabric:",
    transferId,
  );

  const dpp =
    await dppRepository
      .findByAssetId(
        "2001",
      );

  console.log(
    "Original DPP product name:",
    dpp.product.name,
  );

  const tamperedDpp =
    structuredClone(dpp);

  tamperedDpp.product.name =
    "TAMPERED PRODUCT";

  await dppRepository.update(
    "2001",
    tamperedDpp,
  );

  console.log(
    "DPP deliberately modified.",
  );

  console.log(
    "Attempting relay-to-destination phase...",
  );

  try {
    await service
      .relayToDestinationTransfer(
        transferId,
      );

    console.error(
      "TEST FAILED: destination phase was allowed.",
    );

    process.exitCode = 1;
  } catch (error) {
    console.log(
      "Expected integrity failure detected.",
    );

    console.log(
      "Error:",
      error.message,
    );

    console.log(
      "T03 PASSED.",
    );
  }
}

main().catch(
  (error) => {
    console.error(
      "Unexpected test error:",
      error,
    );

    process.exit(1);
  },
);
