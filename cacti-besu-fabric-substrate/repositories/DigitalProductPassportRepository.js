"use strict";

class DigitalProductPassportRepository {
  constructor() {
    this.dpps = new Map();

    this.seedInitialData();
  }

  seedInitialData() {
    const initialDpp = {
      productId: "2001",

      product: {
        name: "Example Product",
	serialNumber: "SN-2001",
	batchNumber: "BATCH-001",
	productionDate: "2026-01-15",
        origin: "Portugal",
      },

      manufacturer: {
        id: "manufacturer-001",
        name: "Example Manufacturer",
      },

      currentOwner: {
        id: "manufacturer-001",
        name: "Example Manufacturer",
      },

      currentChain: "Besu",

      status: "ACTIVE",

      metadataUri:
        "https://example.org/dpp/PRODUCT-2001.json",

      events: [],

      transformations: [],

      originatedProductIds: [],

      transfers: [],

      history: [
        {
          type: "CREATED",
          timestamp: new Date().toISOString(),
          chain: "Besu",
          owner: {
            id: "manufacturer-001",
            name: "Example Manufacturer",
          },
          notes: "Initial prototype asset.",
        },
      ],
    };

    this.dpps.set(
      initialDpp.productId,
      initialDpp,
    );
  }

  async create(dpp) {
    this.validateDpp(dpp);

    const productId =
      String(dpp.productId).trim();

    if (this.dpps.has(productId)) {
      throw new Error(
        `A DPP for asset ${productId} already exists.`,
      );
    }

    const storedDpp =
      structuredClone({
        ...dpp,
        productId,
      });

    this.dpps.set(
      productId,
      storedDpp,
    );

    return structuredClone(storedDpp);
  }

  async findByAssetId(assetId) {
    const normalizedAssetId =
      String(assetId ?? "").trim();

    if (!normalizedAssetId) {
      throw new Error(
        "Asset ID is required.",
      );
    }

    const dpp =
      this.dpps.get(normalizedAssetId);

    if (!dpp) {
      throw new Error(
        `No DPP was found for asset ${normalizedAssetId}.`,
      );
    }

    return structuredClone(dpp);
  }

  async update(assetId, updatedDpp) {
    const normalizedAssetId =
      String(assetId ?? "").trim();

    if (!this.dpps.has(normalizedAssetId)) {
      throw new Error(
        `No DPP was found for asset ${normalizedAssetId}.`,
      );
    }

    this.validateDpp(updatedDpp);

    const storedDpp =
      structuredClone({
        ...updatedDpp,
        productId: normalizedAssetId,
      });

    this.dpps.set(
      normalizedAssetId,
      storedDpp,
    );

    return structuredClone(storedDpp);
  }

  async findAll() {
    return Array.from(
      this.dpps.values(),
      dpp => structuredClone(dpp),
    );
  }

  async exists(assetId) {
    const normalizedAssetId =
      String(assetId ?? "").trim();

    return this.dpps.has(
      normalizedAssetId,
    );
  }

  validateDpp(dpp) {
  
    if (
      !dpp ||
      typeof dpp !== "object" ||
      Array.isArray(dpp)
    ) {
      throw new Error(
        "A valid DPP object is required.",
      );
    }

    if (
      !dpp.productId ||
      !String(dpp.productId).trim()
    ) {
      throw new Error(
        "The DPP product ID is required.",
      );
    }

    if (
      !dpp.product ||
      !dpp.product.name ||
      !String(dpp.product.name).trim()
    ) {
      throw new Error(
        "The product name is required.",
      );
    }

    if (
      !dpp.manufacturer ||
      !dpp.manufacturer.name
    ) {
      throw new Error(
        "The manufacturer is required.",
      );
    }

    if (!Array.isArray(dpp.history)) {
      throw new Error(
        "The DPP history must be an array.",
      );
    }

    if (
    !dpp.product.serialNumber ||
    !String(dpp.product.serialNumber).trim()
) {
    throw new Error(
        "The product serial number is required."
    );
	}

    if (
    !dpp.product.batchNumber ||
    !String(dpp.product.batchNumber).trim()
) {
    throw new Error(
        "The product batch number is required."
    );
	}

    if (
    !dpp.product.origin ||
    !String(dpp.product.origin).trim()
) {
    throw new Error(
        "The product origin is required."
    );
	}

    if (
    !dpp.product.productionDate ||
    !String(dpp.product.productionDate).trim()
) {
    throw new Error(
        "The product productionDate is required."
    );
	}

  }
}

module.exports = {
  DigitalProductPassportRepository,
};
