"use strict";

const fs = require("fs");
const solc = require("solc");
const { ethers } = require("ethers");

async function main() {
  const source =
    fs.readFileSync(
      "Asset.sol",
      "utf8",
    );

  const input = {
    language: "Solidity",

    sources: {
      "Asset.sol": {
        content: source,
      },
    },

    settings: {
      evmVersion: "paris",

      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
          ],
        },
      },
    },
  };

  const output =
    JSON.parse(
      solc.compile(
        JSON.stringify(input),
      ),
    );

  if (output.errors) {
    for (const compilerMessage of output.errors) {
      console.error(
        compilerMessage.formattedMessage,
      );
    }

    const hasCompilationError =
      output.errors.some(
        (compilerMessage) =>
          compilerMessage.severity ===
          "error",
      );

    if (hasCompilationError) {
      throw new Error(
        "Solidity compilation failed.",
      );
    }
  }

  const contractFile =
    output
      ?.contracts
      ?.[
        "Asset.sol"
      ]
      ?.Asset;

  if (!contractFile) {
    throw new Error(
      "Compiled Asset contract was not found.",
    );
  }

  const abi =
    contractFile.abi;

  const bytecode =
    contractFile
      .evm
      .bytecode
      .object;

  if (!bytecode) {
    throw new Error(
      "The compiled contract bytecode is empty.",
    );
  }

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

  console.log(
    "Deploying from:",
    wallet.address,
  );

  const factory =
    new ethers.ContractFactory(
      abi,
      bytecode,
      wallet,
    );

  const contract =
    await factory.deploy({
      gasLimit: 6000000,
    });

  await contract.waitForDeployment();

  const address =
    await contract.getAddress();

  const deploymentTransaction =
    contract.deploymentTransaction();

  console.log(
    "Deployment transaction:",
    deploymentTransaction?.hash,
  );

  console.log(
    "Contract deployed at:",
    address,
  );

  fs.writeFileSync(
    "besu-asset.json",

    JSON.stringify(
      {
        address,
        abi,
      },
      null,
      2,
    ),
  );

  console.log(
    "Updated besu-asset.json",
  );
}

main().catch((error) => {
  console.error(
    "Contract deployment failed:",
    error,
  );

  process.exitCode = 1;
});
