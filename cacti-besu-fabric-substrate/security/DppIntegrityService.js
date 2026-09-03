"use strict";

const crypto = require("crypto");

/**
 * Provides deterministic serialization, hashing, and integrity
 * verification for Digital Product Passports.
 */
class DppIntegrityService {
  /**
   * Recursively sorts the keys of plain JavaScript objects.
   *
   * Array element order is preserved because array ordering is
   * semantically significant.
   */
  canonicalize(value) {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.canonicalize(item),
      );
    }

    if (
      value !== null &&
      typeof value === "object"
    ) {
      return Object.keys(value)
        .sort()
        .reduce(
          (canonicalObject, key) => {
            canonicalObject[key] =
              this.canonicalize(
                value[key],
              );

            return canonicalObject;
          },
          {},
        );
    }

    return value;
  }

  /**
   * Produces a deterministic JSON representation of a DPP.
   */
  serialize(dpp) {
    this.validateDpp(dpp);

    return JSON.stringify(
      this.canonicalize(dpp),
    );
  }

  /**
   * Calculates a SHA-256 fingerprint over canonical DPP JSON.
   */
  calculateHash(dpp) {
    const canonicalJson =
      this.serialize(dpp);

    return (
      "0x" +
      crypto
        .createHash("sha256")
        .update(
          canonicalJson,
          "utf8",
        )
        .digest("hex")
    );
  }

  assertRequiredString(value, fieldName) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `The Digital Product Passport field "${fieldName}" is required.`,
    );
  }
}

assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(
      `The Digital Product Passport field "${fieldName}" must be an array.`,
    );
  }
}

  /**
   * Compares the locally calculated DPP hash with an expected hash.
   */
  verify(dpp, expectedHash) {
    if (
      typeof expectedHash !==
        "string" ||
      expectedHash.length === 0
    ) {
      throw new Error(
        "An expected DPP hash is required.",
      );
    }

    const calculatedHash =
      this.calculateHash(dpp);

    return {
      valid:
        calculatedHash ===
        expectedHash,

      expectedHash,
      calculatedHash,
    };
  }

  /**
   * Throws an error if the DPP fingerprint does not match.
   */
  assertIntegrity(
    dpp,
    expectedHash,
  ) {
    const verification =
      this.verify(
        dpp,
        expectedHash,
      );

    if (!verification.valid) {
      throw new Error(
        "DPP integrity verification failed. " +
        "The locally calculated SHA-256 hash " +
        "does not match the hash stored in " +
        "the Fabric relay record.",
      );
    }

    return verification;
  }
/*
  validateDpp(dpp) {
    if (
      !dpp ||
      typeof dpp !== "object" ||
      Array.isArray(dpp)
    ) {
      throw new Error(
        "The Digital Product Passport must be an object.",
      );
    }

    const requiredFields = [
      "productId",
      "manufacturer",
      "serialNumber",
      "batchNumber",
      "origin",
      "productionDate",
      "status",
      "metadataUri",
    ];

    for (
      const field of requiredFields
    ) {
      if (
        typeof dpp[field] !==
          "string" ||
        dpp[field].trim().length ===
          0
      ) {
        throw new Error(
          `The Digital Product Passport field ` +
          `"${field}" is required.`,
        );
      }
    }
  }*/

  validateDpp(dpp) {
  if (
    !dpp ||
    typeof dpp !== "object" ||
    Array.isArray(dpp)
  ) {
    throw new Error(
      "A valid Digital Product Passport object is required.",
    );
  }

  this.assertRequiredString(
    dpp.productId,
    "productId",
  );

  if (
    !dpp.product ||
    typeof dpp.product !== "object" ||
    Array.isArray(dpp.product)
  ) {
    throw new Error(
      'The Digital Product Passport field "product" is required.',
    );
  }

  this.assertRequiredString(
    dpp.product.name,
    "product.name",
  );

  this.assertRequiredString(
    dpp.product.serialNumber,
    "product.serialNumber",
  );

  this.assertRequiredString(
    dpp.product.batchNumber,
    "product.batchNumber",
  );

  this.assertRequiredString(
    dpp.product.origin,
    "product.origin",
  );

  this.assertRequiredString(
    dpp.product.productionDate,
    "product.productionDate",
  );

  if (
    !dpp.manufacturer ||
    typeof dpp.manufacturer !== "object" ||
    Array.isArray(dpp.manufacturer)
  ) {
    throw new Error(
      'The Digital Product Passport field "manufacturer" is required.',
    );
  }

  this.assertRequiredString(
    dpp.manufacturer.id,
    "manufacturer.id",
  );

  this.assertRequiredString(
    dpp.manufacturer.name,
    "manufacturer.name",
  );

  if (
    !dpp.currentOwner ||
    typeof dpp.currentOwner !== "object" ||
    Array.isArray(dpp.currentOwner)
  ) {
    throw new Error(
      'The Digital Product Passport field "currentOwner" is required.',
    );
  }

  this.assertRequiredString(
    dpp.currentOwner.id,
    "currentOwner.id",
  );

  this.assertRequiredString(
    dpp.currentOwner.name,
    "currentOwner.name",
  );

  this.assertRequiredString(
    dpp.currentChain,
    "currentChain",
  );

  this.assertRequiredString(
    dpp.status,
    "status",
  );

  this.assertRequiredString(
    dpp.metadataUri,
    "metadataUri",
  );

  this.assertArray(
    dpp.events,
    "events",
  );

  this.assertArray(
    dpp.transformations,
    "transformations",
  );

  this.assertArray(
    dpp.originatedProductIds,
    "originatedProductIds",
  );

  this.assertArray(
    dpp.transfers,
    "transfers",
  );

  this.assertArray(
    dpp.history,
    "history",
  );
}
}

module.exports = {
  DppIntegrityService,
};
