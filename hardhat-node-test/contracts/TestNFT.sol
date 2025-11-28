// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TestNFT
 * @dev A simple ERC721 NFT contract for testing purposes
 */
contract TestNFT {
    string public name;
    string public symbol;
    
    address public owner;
    uint256 private _tokenIdCounter;
    
    // Token ownership
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    
    // Token metadata
    mapping(uint256 => string) private _tokenURIs;
    string public baseURI;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Mint(address indexed to, uint256 indexed tokenId, string tokenURI);
    event Burn(uint256 indexed tokenId);
    event BaseURIChanged(string newBaseURI);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "TestNFT: caller is not the owner");
        _;
    }
    
    constructor(string memory _name, string memory _symbol, string memory _baseURI) {
        name = _name;
        symbol = _symbol;
        baseURI = _baseURI;
        owner = msg.sender;
    }
    
    // ERC721 standard functions
    function balanceOf(address _owner) external view returns (uint256) {
        require(_owner != address(0), "TestNFT: balance query for zero address");
        return _balances[_owner];
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "TestNFT: query for nonexistent token");
        return tokenOwner;
    }
    
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "TestNFT: URI query for nonexistent token");
        
        string memory _tokenURI = _tokenURIs[tokenId];
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        return string(abi.encodePacked(baseURI, _toString(tokenId)));
    }
    
    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        require(to != tokenOwner, "TestNFT: approval to current owner");
        require(
            msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender),
            "TestNFT: not owner nor approved for all"
        );
        
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }
    
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "TestNFT: query for nonexistent token");
        return _tokenApprovals[tokenId];
    }
    
    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "TestNFT: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function isApprovedForAll(address _owner, address operator) public view returns (bool) {
        return _operatorApprovals[_owner][operator];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "TestNFT: not owner nor approved");
        _transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "TestNFT: not owner nor approved");
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "TestNFT: transfer to non ERC721Receiver");
    }
    
    // Mint functions
    function mint(address to) external onlyOwner returns (uint256) {
        return _mint(to, "");
    }
    
    function mintWithURI(address to, string memory _tokenURI) external onlyOwner returns (uint256) {
        return _mint(to, _tokenURI);
    }
    
    function batchMint(address to, uint256 amount) external onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            tokenIds[i] = _mint(to, "");
        }
        return tokenIds;
    }
    
    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "TestNFT: not owner nor approved");
        
        address tokenOwner = ownerOf(tokenId);
        
        // Clear approvals
        delete _tokenApprovals[tokenId];
        
        _balances[tokenOwner] -= 1;
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        
        emit Burn(tokenId);
        emit Transfer(tokenOwner, address(0), tokenId);
    }
    
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
        emit BaseURIChanged(_baseURI);
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // Internal functions
    function _mint(address to, string memory _tokenURI) internal returns (uint256) {
        require(to != address(0), "TestNFT: mint to zero address");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _balances[to] += 1;
        _owners[tokenId] = to;
        
        if (bytes(_tokenURI).length > 0) {
            _tokenURIs[tokenId] = _tokenURI;
        }
        
        emit Mint(to, tokenId, _tokenURI);
        emit Transfer(address(0), to, tokenId);
        
        return tokenId;
    }
    
    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "TestNFT: transfer from incorrect owner");
        require(to != address(0), "TestNFT: transfer to zero address");
        
        // Clear approvals
        delete _tokenApprovals[tokenId];
        
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || getApproved(tokenId) == spender || isApprovedForAll(tokenOwner, spender));
    }
    
    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch {
                return false;
            }
        }
        return true;
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // ERC165 support
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f || // ERC721Metadata
            interfaceId == 0x01ffc9a7;   // ERC165
    }
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
