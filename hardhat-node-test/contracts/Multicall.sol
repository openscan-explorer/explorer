// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Multicall
 * @dev Allows batching multiple calls into a single transaction
 */
contract Multicall {
    struct Call {
        address target;
        bytes callData;
    }
    
    struct CallWithValue {
        address target;
        uint256 value;
        bytes callData;
    }
    
    struct Result {
        bool success;
        bytes returnData;
    }
    
    // Events
    event MulticallExecuted(address indexed sender, uint256 callCount, uint256 successCount);
    event CallFailed(uint256 indexed index, address target, bytes returnData);
    
    /**
     * @dev Execute multiple calls, revert if any fails
     */
    function aggregate(Call[] calldata calls) external returns (uint256 blockNumber, bytes[] memory returnData) {
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Multicall: call failed");
            returnData[i] = ret;
        }
        
        emit MulticallExecuted(msg.sender, calls.length, calls.length);
    }
    
    /**
     * @dev Execute multiple calls, return results without reverting
     */
    function tryAggregate(bool requireSuccess, Call[] calldata calls) external returns (Result[] memory results) {
        results = new Result[](calls.length);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            
            if (requireSuccess && !success) {
                revert("Multicall: call failed");
            }
            
            results[i] = Result(success, ret);
            
            if (success) {
                successCount++;
            } else {
                emit CallFailed(i, calls[i].target, ret);
            }
        }
        
        emit MulticallExecuted(msg.sender, calls.length, successCount);
    }
    
    /**
     * @dev Execute multiple calls with ETH values
     */
    function aggregateWithValue(CallWithValue[] calldata calls) external payable returns (bytes[] memory returnData) {
        returnData = new bytes[](calls.length);
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < calls.length; i++) {
            totalValue += calls[i].value;
        }
        require(msg.value >= totalValue, "Multicall: insufficient value");
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call{value: calls[i].value}(calls[i].callData);
            require(success, "Multicall: call failed");
            returnData[i] = ret;
        }
        
        // Refund excess ETH
        uint256 remaining = msg.value - totalValue;
        if (remaining > 0) {
            (bool sent, ) = msg.sender.call{value: remaining}("");
            require(sent, "Multicall: refund failed");
        }
        
        emit MulticallExecuted(msg.sender, calls.length, calls.length);
    }
    
    /**
     * @dev Get current block information
     */
    function getBlockInfo() external view returns (
        uint256 blockNumber,
        uint256 blockTimestamp,
        uint256 blockGasLimit,
        address coinbase,
        uint256 baseFee
    ) {
        blockNumber = block.number;
        blockTimestamp = block.timestamp;
        blockGasLimit = block.gaslimit;
        coinbase = block.coinbase;
        baseFee = block.basefee;
    }
    
    /**
     * @dev Get ETH balance of an address
     */
    function getEthBalance(address addr) external view returns (uint256) {
        return addr.balance;
    }
    
    /**
     * @dev Get ETH balances of multiple addresses
     */
    function getEthBalances(address[] calldata addrs) external view returns (uint256[] memory balances) {
        balances = new uint256[](addrs.length);
        for (uint256 i = 0; i < addrs.length; i++) {
            balances[i] = addrs[i].balance;
        }
    }
    
    /**
     * @dev Get block hash for a specific block number
     */
    function getBlockHash(uint256 blockNumber) external view returns (bytes32) {
        return blockhash(blockNumber);
    }
    
    /**
     * @dev Get last block hash
     */
    function getLastBlockHash() external view returns (bytes32) {
        return blockhash(block.number - 1);
    }
    
    receive() external payable {}
}
