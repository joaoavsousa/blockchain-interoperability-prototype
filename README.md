# Consortium-Mediated Blockchain Interoperability Prototype

Proof-of-concept implementation developed as part of a Master's
dissertation in Informatics Engineering at the University of Coimbra.

## Overview

This prototype implements a consortium-mediated interoperability
architecture for heterogeneous blockchain environments.

The evaluated workflow uses:

- Hardhat Network as an EVM-compatible source environment
- Hyperledger Fabric as the consortium relay
- Substrate as the destination environment
- Hyperledger Cacti for blockchain connectivity
- Node.js for application-level coordination

## Architecture

The prototype separates cross-chain orchestration from
blockchain-specific connectivity through:

- Cross-Chain Coordinator
- Blockchain-specific application adapters
- Hyperledger Cacti ledger connectors
- DPP repository and integrity services
- Hyperledger Fabric transfer records

## Cross-Chain Workflow

The implemented proof of concept evaluates the following route:

EVM/Hardhat → Hyperledger Fabric → Substrate

The inverse direction was not evaluated.

## Requirements

See the project documentation and dependency files for the required
software and package versions.

## Dissertation

This software was developed as the proof of concept for the Master's
dissertation:

"Blockchain to Support History of Things Throughout a Supply Chain"

Department of Informatics Engineering  
University of Coimbra  
2026

## Limitations

This repository contains an experimental proof of concept and is not
intended for production deployment.
