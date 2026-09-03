"use strict";

const fs = require("fs");

const {
  PluginRegistry,
} = require("@hyperledger/cactus-core");

const {
  PluginKeychainMemory,
} = require(
  "@hyperledger/cactus-plugin-keychain-memory",
);

const {
  BesuAdapter,
} = require("../adapters/BesuAdapter");

const {
  FabricRelayAdapter,
} = require("../adapters/FabricRelayAdapter");

const {
  SubstrateAdapter,
} = require("../adapters/SubstrateAdapter");

const {
  CrossChainTransfer,
} = require("../models/CrossChainTransfer");

const {
  DigitalProductPassportRepository,
} = require(
  "../repositories/DigitalProductPassportRepository",
);

const {
  DppIntegrityService,
} = require(
  "../security/DppIntegrityService",
);

// ============================================================
// Configuration
// ============================================================

const evmAccount =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const evmPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

//const amount = 3;
//const assetId = "2001";

const fabricBase =
  "/home/admin/Desktop/joaosousa/fabric-samples/test-network";

const evmArtifactPath =
  "../besu-contract/besu-asset.json";

const substrateWsUrl =
  "ws://127.0.0.1:9944";

const substrateSignerUri =
  "//Alice";

// ============================================================
// Shared dependencies
// ============================================================

function createApplicationDependencies() {
  return {
    dppRepository:
      new DigitalProductPassportRepository(),

    dppIntegrityService:
      new DppIntegrityService(),
  };
}

function createPluginRegistryAndKeychain() {
  const keychain =
    new PluginKeychainMemory({
      instanceId:
        "memory-keychain",

      keychainId:
        "fabric-keychain",

      logLevel:
        "INFO",

      backend:
        new Map(),
    });

  const pluginRegistry =
    new PluginRegistry({
      plugins: [
        keychain,
      ],
    });

  return {
    keychain,
    pluginRegistry,
  };
}

// ============================================================
// Phase 1: Besu → Fabric
// ============================================================

async function sourceToRelayTransfer(
  transferRequest,
  dependencies,
) {
  let besuConnector;
  let fabricRelay;

  const {
	assetId,
	amount,
	notes = "",
  } = transferRequest;

  const {
    dppRepository,
    dppIntegrityService,
  } = dependencies;

  const {
    keychain,
    pluginRegistry,
  } =
    createPluginRegistryAndKeychain();

  try {
    const artifact =
      JSON.parse(
        fs.readFileSync(
          evmArtifactPath,
          "utf8",
        ),
      );

    const besuAdapter =
      new BesuAdapter({
        pluginRegistry,
        account:
          evmAccount,
        privateKey:
          evmPrivateKey,
      });

    besuConnector =
      besuAdapter.getConnector();

    fabricRelay =
      new FabricRelayAdapter({
        pluginRegistry,
        keychain,
        fabricBase,
      });

    await fabricRelay.connect();

    console.log(
      "=== PHASE 1: Besu → Fabric ===",
    );

    // --------------------------------------------------------
    // Retrieve and fingerprint the DPP
    // --------------------------------------------------------

    const dpp =
      await dppRepository
        .findByAssetId(assetId);

    const canonicalDppJson =
      dppIntegrityService
        .serialize(dpp);

    const originalDppHash =
      dppIntegrityService
        .calculateHash(dpp);

    console.log(
      "Digital Product Passport retrieved from repository:",
    );

    console.log(
      JSON.stringify(
        dpp,
        null,
        2,
      ),
    );

    console.log(
      "Canonical DPP JSON:",
      canonicalDppJson,
    );

    console.log(
      "Calculated DPP SHA-256 hash:",
      originalDppHash,
    );

    // --------------------------------------------------------
    // Check source balance
    // --------------------------------------------------------

    const balanceBefore =
  await besuAdapter.getAssetBalance({
    artifact,
    assetId,
    ownerAddress:
      evmAccount,
  });
    console.log(
      `Besu balance for asset ${assetId} before burn:`,
      balanceBefore.toString(),
    );

    if (
      balanceBefore <
      BigInt(amount)
    ) {
      
    console.log(
  `Insufficient balance for asset ${assetId}. ` +
  "Minting 10 units first...",
);

const mintResult =
  await besuAdapter.mintAsset({
    artifact,
    assetId,
    ownerAddress:
      evmAccount,
    amount:
      10,
  });

console.log(
  "Initial Besu mint transaction:",
  mintResult.transactionHash,
);
    }

    // --------------------------------------------------------
    // Burn source representation
    // --------------------------------------------------------

   console.log(
  `Burning ${amount} units of asset ${assetId} ` +
  "on source Besu through Cacti...",
);

const burnResult =
  await besuAdapter.burnAsset({
    artifact,
    assetId,
    ownerAddress:
      evmAccount,
    amount,
  });

const sourceTxHash =
  burnResult.transactionHash;

console.log(
  "Source Besu burn transaction:",
  sourceTxHash,
);

    // --------------------------------------------------------
    // Create Fabric relay record
    // --------------------------------------------------------

    const transferId =
      `transfer-${Date.now()}`;

    

    //Hash change after dpp history changes
    const currentDpp =
  await dppRepository
    .findByAssetId(
      assetId,
    );

const transferDpp =
  markDppTransferStarted(
    currentDpp,
    {
      transferId,
      sourceChain:
        "Besu",
      destinationChain:
        "Substrate",
      amount,
      notes,
    },
  );

await dppRepository.update(
  assetId,
  transferDpp,
);

const dppHash =
  dppIntegrityService
    .calculateHash(
      transferDpp,
    );


    const timestamp =
      new Date().toISOString();

    const transfer =
      new CrossChainTransfer({
        transferId,
        timestamp,

        sourceChain:
          "Besu",

        destinationChain:
          "Substrate",

        assetId:
          String(assetId),

        amount,

        sourceTxHash,

        destinationTxHash:
          "",

        dppHash,

        status:
          "BURN_CONFIRMED",

        notes:
	  [
          	`Digital Product Passport URI: ${dpp.metadataUri}`,
		notes,
	  ]
		.filter(Boolean)
		.join(" | "),

        secret:
          "",

        route: [
          "Besu",
          "Fabric",
          "Substrate",
        ],
      });

    console.log(
      "Writing Fabric transfer record...",
    );

    console.log(
      JSON.stringify(
        transfer,
        null,
        2,
      ),
    );

    const fabricWriteResponse =
      await fabricRelay
        .createTransferRecord(
          transfer,
        );

    console.log(
      "Fabric transfer record write result:",
    );

    console.log(
      JSON.stringify(
        fabricWriteResponse,
        null,
        2,
      ),
    );

    console.log(
      "Besu → Fabric phase complete.",
    );

    console.log(
      "Transfer ID:",
      transferId,
    );

    return transferId;
  } finally {
    if (besuConnector) {
      await besuConnector.shutdown();
    }

    if (fabricRelay) {
      await fabricRelay.shutdown();
    }
  }
}

// ============================================================
// Phase 2: Fabric → Substrate
// ============================================================

async function relayToDestinationTransfer(
  transferId,
  dependencies,
) {
  let fabricRelay;
  let substrateAdapter;

  const {
    dppRepository,
    dppIntegrityService,
  } = dependencies;

  const {
    keychain,
    pluginRegistry,
  } =
    createPluginRegistryAndKeychain();

  try {
    fabricRelay =
      new FabricRelayAdapter({
        pluginRegistry,
        keychain,
        fabricBase,
      });

    substrateAdapter =
      new SubstrateAdapter({
        pluginRegistry,

        wsProviderUrl:
          substrateWsUrl,

        signerUri:
          substrateSignerUri,
      });

    await fabricRelay.connect();
    await substrateAdapter.connect();

    console.log(
      "=== PHASE 2: Fabric → Substrate ===",
    );

    // --------------------------------------------------------
    // Read relay record
    // --------------------------------------------------------

    console.log(
      "Reading Fabric transfer record...",
    );

    const transferRecord =
      await fabricRelay
        .readTransferRecord(
          transferId,
        );

    console.log(
      "Fabric transfer record:",
    );

    console.log(
      JSON.stringify(
        transferRecord,
        null,
        2,
      ),
    );

    // --------------------------------------------------------
    // Validate relay state
    // --------------------------------------------------------

    if (
      transferRecord.status !==
      "BURN_CONFIRMED"
    ) {
      throw new Error(
        `Invalid transfer status: ` +
        `${transferRecord.status}. ` +
        `Expected BURN_CONFIRMED.`,
      );
    }

    if (
      transferRecord.sourceChain !==
      "Besu"
    ) {
      throw new Error(
        `Invalid source chain: ` +
        `${transferRecord.sourceChain}. ` +
        `Expected Besu.`,
      );
    }

    if (
      transferRecord
        .destinationChain !==
      "Substrate"
    ) {
      throw new Error(
        `Invalid destination chain: ` +
        `${transferRecord.destinationChain}. ` +
        `Expected Substrate.`,
      );
    }

    if (
      !transferRecord.sourceTxHash
    ) {
      throw new Error(
        "The Fabric relay record does not " +
        "contain a source transaction hash.",
      );
    }

    if (
      transferRecord
        .destinationTxHash
    ) {
      throw new Error(
        "The Fabric relay record already " +
        "contains a destination transaction hash.",
      );
    }

    if (
      !transferRecord.dppHash
    ) {
      throw new Error(
        "The Fabric relay record does not " +
        "contain a DPP hash.",
      );
    }

    // --------------------------------------------------------
    // Validate destination parameters
    // --------------------------------------------------------

    const destinationAssetId =
      Number(
        transferRecord.assetId,
      );

    if (
      !Number.isSafeInteger(
        destinationAssetId,
      ) ||
      destinationAssetId < 0
    ) {
      throw new Error(
        `Invalid Substrate asset ID: ` +
        `${transferRecord.assetId}.`,
      );
    }

    const mintAmount =
      Number(
        transferRecord.amount,
      );

    if (
      !Number.isSafeInteger(
        mintAmount,
      ) ||
      mintAmount <= 0
    ) {
      throw new Error(
        `Invalid transfer amount: ` +
        `${transferRecord.amount}.`,
      );
    }

    // --------------------------------------------------------
    // Retrieve and verify DPP
    // --------------------------------------------------------

    const dpp =
      await dppRepository
        .findByAssetId(
          transferRecord.assetId,
        );

    const canonicalDppJson =
      dppIntegrityService
        .serialize(dpp);

    const verification =
      dppIntegrityService
        .assertIntegrity(
          dpp,
          transferRecord.dppHash,
        );

    console.log(
      "Digital Product Passport retrieved from repository:",
    );

    console.log(
      JSON.stringify(
        dpp,
        null,
        2,
      ),
    );

    console.log(
      "Reconstructed canonical DPP JSON:",
      canonicalDppJson,
    );

    console.log(
      "DPP hash stored in Fabric:",
      verification.expectedHash,
    );

    console.log(
      "DPP hash recalculated locally:",
      verification.calculatedHash,
    );

    console.log(
      "DPP integrity verification passed.",
    );

    // --------------------------------------------------------
    // Determine destination owner
    // --------------------------------------------------------

    if (
      !substrateAdapter.signer ||
      !substrateAdapter.signer.address
    ) {
      throw new Error(
        "The Substrate signer address is unavailable.",
      );
    }

    const destinationOwner =
      substrateAdapter
        .signer
        .address;

    console.log(
      "Substrate destination owner:",
      destinationOwner,
    );

    // --------------------------------------------------------
    // Mint destination representation
    // --------------------------------------------------------

    console.log(
      `Creating or updating Substrate DPP asset ` +
      `${destinationAssetId}...`,
    );

    console.log(
      `Minting ${mintAmount} destination units...`,
    );

    const substrateResult =
      await substrateAdapter
        .createDigitalProductPassport({
          assetId:
            destinationAssetId,

          ownerAddress:
            destinationOwner,

          productId:
            dpp.productId,

          manufacturer:
            dpp.manufacturer.name,

          serialNumber:
            dpp.product.serialNumber,

          batchNumber:
            dpp.product.batchNumber,

          origin:
            dpp.product.origin,

          productionDate:
            dpp.product.productionDate,

          status:
            dpp.status,

          dppHash:
            transferRecord.dppHash,

          metadataUri:
            dpp.metadataUri,

          amount:
            mintAmount,
        });

    console.log(
      "Substrate DPP creation result:",
    );

    console.log(
      JSON.stringify(
        substrateResult,
        null,
        2,
      ),
    );

    if (
      !substrateResult ||
      substrateResult.success !== true
    ) {
      throw new Error(
        "Substrate DPP creation was unsuccessful.",
      );
    }

    const destinationTxHash =
      substrateResult
        .substrate
        .mintResult
        .txHash;

    if (!destinationTxHash) {
      throw new Error(
        "The Substrate mint operation did not " +
        "return a transaction hash.",
      );
    }

    console.log(
      "Destination Substrate transaction:",
      destinationTxHash,
    );

    // --------------------------------------------------------
    // Verify destination state
    // --------------------------------------------------------

    const substrateRepresentation =
      await substrateAdapter
        .readDigitalProductPassport({
          assetId:
            destinationAssetId,

          ownerAddress:
            destinationOwner,
        });

    console.log(
      "Substrate DPP representation:",
    );

    console.log(
      JSON.stringify(
        substrateRepresentation,
        null,
        2,
      ),
    );

    if (!substrateRepresentation) {
      throw new Error(
        "The destination Substrate asset " +
        "could not be found after minting.",
      );
    }

    const destinationBalance =
      Number(
        substrateRepresentation.balance,
      );

    if (
      !Number.isFinite(
        destinationBalance,
      )
    ) {
      throw new Error(
        "The destination Substrate balance " +
        "could not be interpreted as a number.",
      );
    }

    if (
      destinationBalance <
      mintAmount
    ) {
      throw new Error(
        `Destination balance verification failed. ` +
        `Expected at least ${mintAmount}, ` +
        `received ${destinationBalance}.`,
      );
    }

    console.log(
      "Destination asset verification passed.",
    );

    // --------------------------------------------------------
    // Finalize relay record
    // --------------------------------------------------------

    console.log(
      "Updating Fabric transfer record...",
    );

    const updateResponse =
      await fabricRelay
        .updateDestinationTxHash(
          transferId,
          destinationTxHash,
        );

    console.log(
      "Fabric update result:",
    );

    console.log(
      JSON.stringify(
        updateResponse,
        null,
        2,
      ),
    );

    const finalTransferRecord =
      await fabricRelay
        .readTransferRecord(
          transferId,
        );

    console.log(
      "Final Fabric transfer record:",
    );

    console.log(
      JSON.stringify(
        finalTransferRecord,
        null,
        2,
      ),
    );

    if (
      finalTransferRecord
        .destinationTxHash !==
      destinationTxHash
    ) {
      throw new Error(
        "The destination transaction hash was not " +
        "correctly persisted in the Fabric record.",
      );
    }

	const currentDpp =
  await dppRepository
    .findByAssetId(
      transferRecord.assetId,
    );

const completedDpp =
  markDppTransferCompleted(
    currentDpp,
    {
      transferId,
      sourceChain:
        transferRecord.sourceChain,
      destinationChain:
        transferRecord.destinationChain,
      amount:
        mintAmount,
      sourceTxHash:
        transferRecord.sourceTxHash,
      destinationTxHash,
      destinationOwner,
      notes:
        transferRecord.notes,
    },
  );

await dppRepository.update(
  transferRecord.assetId,
  completedDpp,
);

const finalDppHash =
  dppIntegrityService
    .calculateHash(
      completedDpp,
    );

console.log(
  "Final DPP hash after completed transfer:",
  finalDppHash,
);

    console.log(
      "Fabric → Substrate phase complete.",
    );

    return destinationTxHash;
  } finally {
    if (substrateAdapter) {
      await substrateAdapter.shutdown();
    }

    if (fabricRelay) {
      await fabricRelay.shutdown();
    }
  }
}

// ============================================================
// Cross-chain coordinator
// ============================================================

function validateTransferRequest(
  transferRequest,
) {
  if (
    !transferRequest ||
    typeof transferRequest !== "object" ||
    Array.isArray(transferRequest)
  ) {
    throw new Error(
      "A transfer request object is required.",
    );
  }

  const assetId =
    String(
      transferRequest.assetId ?? "",
    ).trim();

  const amount =
    Number(
      transferRequest.amount,
    );

  const notes =
    typeof transferRequest.notes === "string"
      ? transferRequest.notes.trim()
      : "";

  if (!assetId) {
    throw new Error(
      "The asset ID is required.",
    );
  }

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "The transfer amount must be a positive integer.",
    );
  }

  return {
    assetId,
    amount,
    notes,
  };
}


function validateAssetCreationRequest(
  assetRequest,
) {
  if (
    !assetRequest ||
    typeof assetRequest !== "object" ||
    Array.isArray(assetRequest)
  ) {
    throw new Error(
      "An asset creation request object is required.",
    );
  }

  const normalized = {
    assetId:
      String(
        assetRequest.assetId ?? "",
      ).trim(),

    productName:
      String(
        assetRequest.productName ?? "",
      ).trim(),

    serialNumber:
      String(
        assetRequest.serialNumber ?? "",
      ).trim(),

    batchNumber:
      String(
        assetRequest.batchNumber ?? "",
      ).trim(),

    productionDate:
      String(
        assetRequest.productionDate ?? "",
      ).trim(),

    origin:
      String(
        assetRequest.origin ?? "",
      ).trim(),

    manufacturerId:
      String(
        assetRequest.manufacturerId ?? "",
      ).trim(),

    manufacturerName:
      String(
        assetRequest.manufacturerName ?? "",
      ).trim(),

    ownerId:
      String(
        assetRequest.ownerId ?? "",
      ).trim(),

    ownerName:
      String(
        assetRequest.ownerName ?? "",
      ).trim(),

    metadataUri:
      String(
        assetRequest.metadataUri ?? "",
      ).trim(),

    notes:
      typeof assetRequest.notes === "string"
        ? assetRequest.notes.trim()
        : "",

    initialAmount:
      Number(
        assetRequest.initialAmount,
      ),
  };

  const requiredStringFields = [
    "assetId",
    "productName",
    "serialNumber",
    "batchNumber",
    "productionDate",
    "origin",
    "manufacturerId",
    "manufacturerName",
    "ownerId",
    "ownerName",
    "metadataUri",
  ];

  for (
    const field
    of requiredStringFields
  ) {
    if (!normalized[field]) {
      throw new Error(
        `The field "${field}" is required.`,
      );
    }
  }

  if (
    !Number.isSafeInteger(
      normalized.initialAmount,
    ) ||
    normalized.initialAmount <= 0
  ) {
    throw new Error(
      "The initial amount must be a positive integer.",
    );
  }

  return normalized;
}

function markDppTransferStarted(
  dpp,
  {
    transferId,
    sourceChain,
    destinationChain,
    amount,
    notes,
  },
) {
  const timestamp =
    new Date().toISOString();

  return {
    ...dpp,

    status:
      "IN_TRANSFER",

    history: [
      ...dpp.history,

      {
        type:
          "TRANSFER_STARTED",

        timestamp,

        transferId,

        sourceChain,

        destinationChain,

        amount,

        previousStatus:
          dpp.status,

        newStatus:
          "IN_TRANSFER",

        notes,
      },
    ],
  };
}

function markDppTransferCompleted(
  dpp,
  {
    transferId,
    sourceChain,
    destinationChain,
    amount,
    sourceTxHash,
    destinationTxHash,
    destinationOwner,
    notes,
  },
) {
  const timestamp =
    new Date().toISOString();

  const transferEntry = {
    transferId,
    timestamp,
    sourceChain,
    destinationChain,
    amount,
    sourceTxHash,
    destinationTxHash,

    integrityVerified:
	true,

    previousOwner:
      dpp.currentOwner,

    newOwner: {
      id:
        destinationOwner,

      name:
        destinationOwner,
    },

    notes,
  };

  return {
    ...dpp,

    currentOwner: {
      id:
        destinationOwner,

      name:
        destinationOwner,
    },

    currentChain:
      destinationChain,

    status:
      "ACTIVE",

    transfers: [
      ...dpp.transfers,
      transferEntry,
    ],

    history: [
      ...dpp.history,

      {
        type:
          "TRANSFER_COMPLETED",

        ...transferEntry,

        previousStatus:
          dpp.status,

        newStatus:
          "ACTIVE",
      },
    ],
  };
}

class CrossChainTransferService {
  constructor(
    dependencies =
      createApplicationDependencies(),
  ) {
    this.dependencies =
      dependencies;
  }

  async sourceToRelayTransfer(
    transferRequest,
  ) {
    return sourceToRelayTransfer(
      transferRequest,
      this.dependencies,
    );
  }

  async relayToDestinationTransfer(
    transferId,
  ) {
    return relayToDestinationTransfer(
      transferId,
      this.dependencies,
    );
  }

  async getAllDigitalProductPassports() {
  const {
    dppRepository,
    dppIntegrityService,
  } = this.dependencies;

  const passports =
    await dppRepository.findAll();

  return passports.map(
    (dpp) => ({
      assetId:
        dpp.productId,

      productName:
        dpp.product.name,

      manufacturer:
        dpp.manufacturer.name,

      owner:
        dpp.currentOwner.name,

      chain:
        dpp.currentChain,

      status:
        dpp.status,

      productionDate:
        dpp.product.productionDate,

      dppHash:
        dppIntegrityService.calculateHash(
          dpp,
        ),
    }),
  );
}

  async getTransfer(transferId) {

    if (!transferId) {
        throw new Error("Transfer ID is required.");
    }

    let fabricRelay;

    const {
        keychain,
        pluginRegistry,
    } = createPluginRegistryAndKeychain();

    try {

        fabricRelay =
            new FabricRelayAdapter({
                pluginRegistry,
                keychain,
                fabricBase,
            });

        await fabricRelay.connect();

        return await fabricRelay.readTransferRecord(
            transferId,
        );

    } finally {

        if (fabricRelay) {
            await fabricRelay.shutdown();
        }

    }

}

async getDigitalProductPassport(
  assetId,
) {
  const normalizedAssetId =
    String(
      assetId ?? "",
    ).trim();

  if (!normalizedAssetId) {
    throw new Error(
      "Asset ID is required.",
    );
  }

  const {
    dppRepository,
    dppIntegrityService,
  } = this.dependencies;

  const dpp =
    await dppRepository
      .findByAssetId(
        normalizedAssetId,
      );

  const dppHash =
    dppIntegrityService
      .calculateHash(dpp);

  return {
    assetId:
      normalizedAssetId,

    dpp,

    dppHash,
  };
}

async createAsset(assetRequest) {
  const validatedRequest =
    validateAssetCreationRequest(
      assetRequest,
    );

  const {
    dppRepository,
    dppIntegrityService,
  } = this.dependencies;

  let besuConnector;

  const {
    pluginRegistry,
  } =
    createPluginRegistryAndKeychain();

  try {
    const artifact =
      JSON.parse(
        fs.readFileSync(
          evmArtifactPath,
          "utf8",
        ),
      );

    const besuAdapter =
      new BesuAdapter({
        pluginRegistry,
        account: evmAccount,
        privateKey: evmPrivateKey,
      });

    besuConnector =
      besuAdapter.getConnector();

    const timestamp =
      new Date().toISOString();

    const dpp = {
      productId:
        validatedRequest.assetId,

      product: {
        name:
          validatedRequest.productName,

        serialNumber:
          validatedRequest.serialNumber,

        batchNumber:
          validatedRequest.batchNumber,

        productionDate:
          validatedRequest.productionDate,

        origin:
          validatedRequest.origin,
      },

      manufacturer: {
        id:
          validatedRequest.manufacturerId,

        name:
          validatedRequest.manufacturerName,
      },

      currentOwner: {
        id:
          validatedRequest.ownerId,

        name:
          validatedRequest.ownerName,
      },

      currentChain:
        "Besu",

      status:
        "ACTIVE",

      metadataUri:
        validatedRequest.metadataUri,

      events: [],

      transformations: [],

      originatedProductIds: [],

      transfers: [],

      history: [
        {
          type:
            "CREATED",

          timestamp,

          chain:
            "Besu",

          owner: {
            id:
              validatedRequest.ownerId,

            name:
              validatedRequest.ownerName,
          },

          notes:
            validatedRequest.notes,
        },
      ],
    };

    const dppHash =
      dppIntegrityService
        .calculateHash(dpp);

    const createdDpp =
      await dppRepository
        .create(dpp);

    const mintResult =
  await besuAdapter.mintAsset({
    artifact,

    assetId:
      validatedRequest.assetId,

    ownerAddress:
      evmAccount,

    amount:
      validatedRequest.initialAmount,
  });

const sourceTxHash =
  mintResult.transactionHash;


    return {
      assetId:
        validatedRequest.assetId,

      dpp:
        createdDpp,

      dppHash,

      sourceChain:
        "Besu",

      sourceTxHash,

      initialAmount:
        validatedRequest.initialAmount,
    };
  } catch (error) {
    const exists =
      await dppRepository
        .exists(
          validatedRequest.assetId,
        );

    if (exists) {
    }

    throw error;
  } finally {
    if (besuConnector) {
      await besuConnector.shutdown();
    }
  }
}
/*
  async executeTransfer(transferRequest,) {
    
    const validatedRequest =
    validateTransferRequest(
      transferRequest,
    );
    
    const transferId =
      await this.sourceToRelayTransfer(
    	   validatedRequest,
	);
/*
    console.log(
      "Waiting 2 seconds before starting " +
      "the destination phase...",
    );

    await new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          2000,
        );
      },
    );

    const destinationTxHash =
      await this
        .relayToDestinationTransfer(
          transferId,
        );

    console.log(
      "==============================================",
    );

    console.log(
      "Full interoperability flow completed.",
    );

    console.log(
      "Route: Besu → Fabric → Substrate",
    );

    console.log(
      "DPP repository retrieval completed.",
    );

    console.log(
      "DPP integrity verification passed.",
    );

    console.log(
      "Transfer finalized successfully.",
    );

    console.log(
      "Transfer ID:",
      transferId,
    );

    console.log(
      "Destination transaction:",
      destinationTxHash,
    );

    console.log(
      "==============================================",
    );

    return {
      transferId,
      destinationTxHash,
    };
  }

}*/

async executeTransfer(transferRequest) {

  const validatedRequest =
    validateTransferRequest(
      transferRequest,
    );

  const totalStart =
    performance.now();

  const sourceRelayStart =
    performance.now();

  const transferId =
    await this.sourceToRelayTransfer(
      validatedRequest,
    );

  const sourceRelayEnd =
    performance.now();

  const relayDestinationStart =
    performance.now();

  const destinationTxHash =
    await this
      .relayToDestinationTransfer(
        transferId,
      );

  const relayDestinationEnd =
    performance.now();

  const totalEnd =
    performance.now();

  const performanceMetrics = {
    sourceToRelayMs:
      sourceRelayEnd -
      sourceRelayStart,

    relayToDestinationMs:
      relayDestinationEnd -
      relayDestinationStart,

    totalMs:
      totalEnd -
      totalStart,
  };

  console.log(
    "Performance metrics:",
    performanceMetrics,
  );

  console.log(
    "==============================================",
  );

  console.log(
    "Full interoperability flow completed.",
  );

  console.log(
    "Route: Besu → Fabric → Substrate",
  );

  console.log(
    "DPP repository retrieval completed.",
  );

  console.log(
    "DPP integrity verification passed.",
  );

  console.log(
    "Transfer finalized successfully.",
  );

  console.log(
    "Transfer ID:",
    transferId,
  );

  console.log(
    "Destination transaction:",
    destinationTxHash,
  );

  console.log(
    "==============================================",
  );

  return {
    transferId,
    destinationTxHash,
    performance:
      performanceMetrics,
  };
}}

module.exports = {
  CrossChainTransferService,
  createApplicationDependencies,
};
