"use strict";

const {
  DigitalProductPassportRepository,
} = require(
  "../repositories/DigitalProductPassportRepository",
);

async function run() {
  const repository =
    new DigitalProductPassportRepository();

  const initialDpp =
    await repository.findByAssetId(
      "2001",
    );

  console.log(
    "Initial DPP:",
    initialDpp,
  );

  const newDpp = {
    productId: "3001",

    product: {
      name: "Test Product",
      origin: "Portugal",
    },

    manufacturer: {
      id: "manufacturer-002",
      name: "Test Manufacturer",
    },

    currentOwner: {
      id: "manufacturer-002",
      name: "Test Manufacturer",
    },

    currentChain: "Besu",

    status: "ACTIVE",

    metadataUri:
      "https://example.org/dpp/PRODUCT-3001.json",

    events: [],

    transformations: [],

    originatedProductIds: [],

    transfers: [],

    history: [
      {
        type: "CREATED",
        timestamp:
          new Date().toISOString(),
        chain: "Besu",
      },
    ],
  };

  await repository.create(newDpp);

  const createdDpp =
    await repository.findByAssetId(
      "3001",
    );

  console.log(
    "Created DPP:",
    createdDpp,
  );

  createdDpp.status =
    "IN_TRANSFER";

  createdDpp.history.push({
    type: "STATUS_CHANGED",
    timestamp:
      new Date().toISOString(),
    previousStatus: "ACTIVE",
    newStatus: "IN_TRANSFER",
  });

  await repository.update(
    "3001",
    createdDpp,
  );

  const updatedDpp =
    await repository.findByAssetId(
      "3001",
    );

  console.log(
    "Updated DPP:",
    updatedDpp,
  );

  console.log(
    "Repository test passed.",
  );
}

run().catch(error => {
  console.error(
    "Repository test failed:",
    error,
  );

  process.exitCode = 1;
});
