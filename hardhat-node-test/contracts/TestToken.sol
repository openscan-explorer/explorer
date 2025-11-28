// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TestToken
 * @dev A simple ERC20 token for testing purposes with mint/burn capabilities
 */
contract TestToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    address public owner;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "TestToken: caller is not the owner");
        _;
    }
    
    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "TestToken: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "TestToken: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "TestToken: approve to zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(from != address(0), "TestToken: transfer from zero address");
        require(to != address(0), "TestToken: transfer to zero address");
        require(balanceOf[from] >= amount, "TestToken: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "TestToken: insufficient allowance");
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "TestToken: insufficient balance to burn");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function burnFrom(address from, uint256 amount) external {
        require(balanceOf[from] >= amount, "TestToken: insufficient balance to burn");
        require(allowance[from][msg.sender] >= amount, "TestToken: insufficient allowance");
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        totalSupply -= amount;
        
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TestToken: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "TestToken: mint to zero address");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
}
