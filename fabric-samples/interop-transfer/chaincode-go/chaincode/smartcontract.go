package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing interoperability transfer records.
type SmartContract struct {
	contractapi.Contract
}

// TransferRecord represents a cross-chain transfer proof/audit record stored on Fabric.
type TransferRecord struct {
	TransactionID     string   `json:"transactionId"`
	Timestamp         string   `json:"timestamp"`
	SourceChain       string   `json:"sourceChain"`
	DestinationChain  string   `json:"destinationChain"`
	AssetID           string   `json:"assetId"`
	Amount            int      `json:"amount"`
	SourceTxHash      string   `json:"sourceTxHash"`
	DestinationTxHash string   `json:"destinationTxHash"`
	DppHash           string   `json:"dppHash"`
	Status            string   `json:"status"`
	Notes             string   `json:"notes"`
	Secret            string   `json:"secret"`
	Transfers         []string `json:"transfers"`
}

// InitLedger creates no default records.
// It is kept so deployment/invocation remains simple.
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreateTransferRecord creates a new cross-chain transfer record.
func (s *SmartContract) CreateTransferRecord(
	ctx contractapi.TransactionContextInterface,
	transactionID string,
	timestamp string,
	sourceChain string,
	destinationChain string,
	assetID string,
	amount int,
	sourceTxHash string,
	destinationTxHash string,
	dppHash string,
	status string,
	notes string,
	secret string,
	transfersJSON string,
) error {
	exists, err := s.TransferRecordExists(ctx, transactionID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the transfer record %s already exists", transactionID)
	}

	var transfers []string
	if transfersJSON != "" {
		err = json.Unmarshal([]byte(transfersJSON), &transfers)
		if err != nil {
			return fmt.Errorf("failed to parse transfers JSON: %v", err)
		}
	}

	record := TransferRecord{
		TransactionID:     transactionID,
		Timestamp:         timestamp,
		SourceChain:       sourceChain,
		DestinationChain:  destinationChain,
		AssetID:           assetID,
		Amount:            amount,
		SourceTxHash:      sourceTxHash,
		DestinationTxHash: destinationTxHash,
		DppHash:           dppHash,
		Status:            status,
		Notes:             notes,
		Secret:            secret,
		Transfers:         transfers,
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(transactionID, recordJSON)
}

// ReadTransferRecord returns the transfer record stored in the world state.
func (s *SmartContract) ReadTransferRecord(ctx contractapi.TransactionContextInterface, transactionID string) (*TransferRecord, error) {
	recordJSON, err := ctx.GetStub().GetState(transactionID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("the transfer record %s does not exist", transactionID)
	}

	var record TransferRecord
	err = json.Unmarshal(recordJSON, &record)
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// UpdateTransferStatus updates the status field of an existing transfer record.
func (s *SmartContract) UpdateTransferStatus(ctx contractapi.TransactionContextInterface, transactionID string, status string) error {
	record, err := s.ReadTransferRecord(ctx, transactionID)
	if err != nil {
		return err
	}

	record.Status = status

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(transactionID, recordJSON)
}

// UpdateDestinationTxHash stores the destination-chain transaction hash and optionally marks the transfer complete.
func (s *SmartContract) UpdateDestinationTxHash(ctx contractapi.TransactionContextInterface, transactionID string, destinationTxHash string) error {
	record, err := s.ReadTransferRecord(ctx, transactionID)
	if err != nil {
		return err
	}

	record.DestinationTxHash = destinationTxHash
	record.Status = "COMPLETED"

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(transactionID, recordJSON)
}

// TransferRecordExists returns true when a transfer record with the given ID exists.
func (s *SmartContract) TransferRecordExists(ctx contractapi.TransactionContextInterface, transactionID string) (bool, error) {
	recordJSON, err := ctx.GetStub().GetState(transactionID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return recordJSON != nil, nil
}

// GetAllTransferRecords returns all transfer records found in world state.
func (s *SmartContract) GetAllTransferRecords(ctx contractapi.TransactionContextInterface) ([]*TransferRecord, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []*TransferRecord
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var record TransferRecord
		err = json.Unmarshal(queryResponse.Value, &record)
		if err != nil {
			return nil, err
		}

		records = append(records, &record)
	}

	return records, nil
}
