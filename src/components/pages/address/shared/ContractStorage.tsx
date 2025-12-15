import type React from "react";
import { useCallback, useState } from "react";
import type { Address } from "../../../../types";

interface ContractStorageProps {
  address: Address;
}

const ContractStorage: React.FC<ContractStorageProps> = ({ address }) => {
  const [storageSlot, setStorageSlot] = useState("");
  const [storageValue, setStorageValue] = useState("");

  const handleGetStorage = useCallback(() => {
    if (address.storageAt?.[storageSlot]) {
      setStorageValue(address.storageAt[storageSlot]);
    } else {
      setStorageValue("0x0000000000000000000000000000000000000000000000000000000000000000");
    }
  }, [address.storageAt, storageSlot]);

  return (
    <div className="block-display-card">
      <div className="block-display-header">
        <span className="block-label">Contract Storage</span>
      </div>
      <div className="tx-details">
        <div className="tx-row">
          <span className="tx-label">Storage Slot:</span>
          <span className="tx-value">
            <div className="storage-input-row">
              <input
                type="text"
                placeholder="e.g., 0x0"
                value={storageSlot}
                onChange={(e) => setStorageSlot(e.target.value)}
                className="storage-input"
              />
              <button type="button" onClick={handleGetStorage} className="storage-button">
                Get
              </button>
            </div>
          </span>
        </div>
        {storageValue && (
          <div className="tx-row">
            <span className="tx-label">Value:</span>
            <span className="tx-value">
              <div className="storage-value-display">{storageValue}</div>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractStorage;
