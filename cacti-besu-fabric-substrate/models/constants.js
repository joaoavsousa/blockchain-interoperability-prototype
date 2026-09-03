"use strict";

const ChainId = Object.freeze({
  BESU: "BESU",
  FABRIC: "FABRIC",
  SUBSTRATE: "SUBSTRATE",
});

const EndpointChainId = Object.freeze({
  BESU: ChainId.BESU,
  SUBSTRATE: ChainId.SUBSTRATE,
});

function isEndpointChainId(chainId) {
  return Object.values(EndpointChainId).includes(chainId);
}

module.exports = {
  ChainId,
  EndpointChainId,
  isEndpointChainId,
};
