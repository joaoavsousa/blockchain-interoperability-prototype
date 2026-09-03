#!/bin/bash

set -e

echo "======================================"
echo "Starting Fabric Network"
echo "======================================"

./network.sh up createChannel -ca

echo "======================================"
echo "Loading Fabric Environment"
echo "======================================"

export PATH=$PWD/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

sleep 1

echo "======================================"
echo "Checking chaincode"
echo "======================================"

if ! peer lifecycle chaincode querycommitted --channelID mychannel | grep -q "Name: basic"; then
    echo "Deploying chaincode..."

    ./network.sh deployCC \
      -ccn basic \
      -ccp ../asset-transfer-basic/chaincode-go \
      -ccl go
else
    echo "Chaincode already deployed."
fi

sleep 3

echo "======================================"
echo "Fabric Ready"
echo "======================================"

peer lifecycle chaincode querycommitted --channelID mychannel
