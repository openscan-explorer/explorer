// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TestToken.sol";

/**
 * @title Vault
 * @dev A simple vault contract for testing deposits, withdrawals, and failure scenarios
 */
contract Vault {
    address public owner;
    address public token;
    
    bool public paused;
    bool public emergencyMode;
    
    uint256 public totalDeposits;
    uint256 public minDeposit;
    uint256 public maxDeposit;
    uint256 public withdrawalFee; // In basis points (100 = 1%)
    
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public lastDepositTime;
    mapping(address => bool) public blacklisted;
    
    uint256 public lockDuration; // Time in seconds before withdrawal is allowed
    
    bool private locked;
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdraw(address indexed user, uint256 amount, uint256 fee, uint256 timestamp);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event EmergencyModeEnabled(address indexed by);
    event Blacklisted(address indexed user);
    event Unblacklisted(address indexed user);
    event FeesCollected(address indexed to, uint256 amount);
    event ConfigUpdated(uint256 minDeposit, uint256 maxDeposit, uint256 withdrawalFee, uint256 lockDuration);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Vault: caller is not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Vault: paused");
        _;
    }
    
    modifier notBlacklisted() {
        require(!blacklisted[msg.sender], "Vault: blacklisted");
        _;
    }
    
    modifier noReentrant() {
        require(!locked, "Vault: reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    constructor(
        address _token,
        uint256 _minDeposit,
        uint256 _maxDeposit,
        uint256 _withdrawalFee,
        uint256 _lockDuration
    ) {
        require(_token != address(0), "Vault: zero token address");
        require(_maxDeposit >= _minDeposit, "Vault: invalid deposit range");
        require(_withdrawalFee <= 1000, "Vault: fee too high"); // Max 10%
        
        owner = msg.sender;
        token = _token;
        minDeposit = _minDeposit;
        maxDeposit = _maxDeposit;
        withdrawalFee = _withdrawalFee;
        lockDuration = _lockDuration;
    }
    
    function deposit(uint256 amount) external whenNotPaused notBlacklisted noReentrant {
        require(amount >= minDeposit, "Vault: below minimum deposit");
        require(amount <= maxDeposit, "Vault: above maximum deposit");
        require(!emergencyMode, "Vault: emergency mode active");
        
        require(
            TestToken(token).transferFrom(msg.sender, address(this), amount),
            "Vault: transfer failed"
        );
        
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        lastDepositTime[msg.sender] = block.timestamp;
        
        emit Deposit(msg.sender, amount, block.timestamp);
    }
    
    function withdraw(uint256 amount) external whenNotPaused notBlacklisted noReentrant {
        require(amount > 0, "Vault: zero amount");
        require(deposits[msg.sender] >= amount, "Vault: insufficient balance");
        require(
            block.timestamp >= lastDepositTime[msg.sender] + lockDuration,
            "Vault: tokens still locked"
        );
        
        uint256 fee = (amount * withdrawalFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        require(
            TestToken(token).transfer(msg.sender, amountAfterFee),
            "Vault: transfer failed"
        );
        
        emit Withdraw(msg.sender, amountAfterFee, fee, block.timestamp);
    }
    
    function emergencyWithdraw() external notBlacklisted noReentrant {
        require(emergencyMode, "Vault: not in emergency mode");
        
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "Vault: no deposits");
        
        deposits[msg.sender] = 0;
        totalDeposits -= amount;
        
        require(
            TestToken(token).transfer(msg.sender, amount),
            "Vault: transfer failed"
        );
        
        emit EmergencyWithdraw(msg.sender, amount);
    }
    
    // Functions designed to fail for testing
    function depositWithExactAmount(uint256 amount, uint256 expectedAmount) external whenNotPaused {
        require(amount == expectedAmount, "Vault: amount mismatch");
        // This will fail if amounts don't match exactly
        
        require(
            TestToken(token).transferFrom(msg.sender, address(this), amount),
            "Vault: transfer failed"
        );
        
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        lastDepositTime[msg.sender] = block.timestamp;
        
        emit Deposit(msg.sender, amount, block.timestamp);
    }
    
    function withdrawAll() external whenNotPaused notBlacklisted noReentrant {
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "Vault: no deposits");
        require(
            block.timestamp >= lastDepositTime[msg.sender] + lockDuration,
            "Vault: tokens still locked"
        );
        
        uint256 fee = (amount * withdrawalFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        deposits[msg.sender] = 0;
        totalDeposits -= amount;
        
        require(
            TestToken(token).transfer(msg.sender, amountAfterFee),
            "Vault: transfer failed"
        );
        
        emit Withdraw(msg.sender, amountAfterFee, fee, block.timestamp);
    }
    
    // Admin functions
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    function enableEmergencyMode() external onlyOwner {
        emergencyMode = true;
        paused = true;
        emit EmergencyModeEnabled(msg.sender);
    }
    
    function blacklist(address user) external onlyOwner {
        blacklisted[user] = true;
        emit Blacklisted(user);
    }
    
    function unblacklist(address user) external onlyOwner {
        blacklisted[user] = false;
        emit Unblacklisted(user);
    }
    
    function updateConfig(
        uint256 _minDeposit,
        uint256 _maxDeposit,
        uint256 _withdrawalFee,
        uint256 _lockDuration
    ) external onlyOwner {
        require(_maxDeposit >= _minDeposit, "Vault: invalid deposit range");
        require(_withdrawalFee <= 1000, "Vault: fee too high");
        
        minDeposit = _minDeposit;
        maxDeposit = _maxDeposit;
        withdrawalFee = _withdrawalFee;
        lockDuration = _lockDuration;
        
        emit ConfigUpdated(_minDeposit, _maxDeposit, _withdrawalFee, _lockDuration);
    }
    
    function collectFees(address to) external onlyOwner {
        uint256 balance = TestToken(token).balanceOf(address(this));
        uint256 fees = balance - totalDeposits;
        
        if (fees > 0) {
            require(TestToken(token).transfer(to, fees), "Vault: transfer failed");
            emit FeesCollected(to, fees);
        }
    }
    
    // View functions
    function getDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }
    
    function canWithdraw(address user) external view returns (bool) {
        return block.timestamp >= lastDepositTime[user] + lockDuration;
    }
    
    function getUnlockTime(address user) external view returns (uint256) {
        return lastDepositTime[user] + lockDuration;
    }
}
