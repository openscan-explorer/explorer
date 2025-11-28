// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TestToken.sol";

/**
 * @title SimpleSwap
 * @dev A simple AMM-style swap contract for testing token swaps
 */
contract SimpleSwap {
    address public owner;
    address public tokenA;
    address public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    uint256 public constant FEE_NUMERATOR = 3; // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;
    
    bool private locked;
    
    // Events
    event Swap(
        address indexed sender,
        uint256 amountIn,
        uint256 amountOut,
        address indexed tokenIn,
        address indexed tokenOut
    );
    event AddLiquidity(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );
    event RemoveLiquidity(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );
    event Sync(uint256 reserveA, uint256 reserveB);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleSwap: caller is not owner");
        _;
    }
    
    modifier noReentrant() {
        require(!locked, "SimpleSwap: reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "SimpleSwap: zero address");
        require(_tokenA != _tokenB, "SimpleSwap: identical addresses");
        
        owner = msg.sender;
        tokenA = _tokenA;
        tokenB = _tokenB;
    }
    
    function addLiquidity(uint256 amountA, uint256 amountB) external noReentrant returns (uint256 liquidityMinted) {
        require(amountA > 0 && amountB > 0, "SimpleSwap: insufficient amounts");
        
        // Transfer tokens from sender
        require(
            TestToken(tokenA).transferFrom(msg.sender, address(this), amountA),
            "SimpleSwap: transferFrom A failed"
        );
        require(
            TestToken(tokenB).transferFrom(msg.sender, address(this), amountB),
            "SimpleSwap: transferFrom B failed"
        );
        
        if (totalLiquidity == 0) {
            liquidityMinted = _sqrt(amountA * amountB);
        } else {
            uint256 liquidityA = (amountA * totalLiquidity) / reserveA;
            uint256 liquidityB = (amountB * totalLiquidity) / reserveB;
            liquidityMinted = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidityMinted > 0, "SimpleSwap: insufficient liquidity minted");
        
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        
        reserveA += amountA;
        reserveB += amountB;
        
        emit AddLiquidity(msg.sender, amountA, amountB, liquidityMinted);
        emit Sync(reserveA, reserveB);
    }
    
    function removeLiquidity(uint256 liquidityAmount) external noReentrant returns (uint256 amountA, uint256 amountB) {
        require(liquidityAmount > 0, "SimpleSwap: insufficient liquidity");
        require(liquidity[msg.sender] >= liquidityAmount, "SimpleSwap: insufficient LP balance");
        
        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;
        
        require(amountA > 0 && amountB > 0, "SimpleSwap: insufficient amounts");
        
        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        
        reserveA -= amountA;
        reserveB -= amountB;
        
        require(TestToken(tokenA).transfer(msg.sender, amountA), "SimpleSwap: transfer A failed");
        require(TestToken(tokenB).transfer(msg.sender, amountB), "SimpleSwap: transfer B failed");
        
        emit RemoveLiquidity(msg.sender, amountA, amountB, liquidityAmount);
        emit Sync(reserveA, reserveB);
    }
    
    function swapAForB(uint256 amountIn, uint256 minAmountOut) external noReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "SimpleSwap: insufficient input");
        require(reserveA > 0 && reserveB > 0, "SimpleSwap: no liquidity");
        
        amountOut = getAmountOut(amountIn, reserveA, reserveB);
        require(amountOut >= minAmountOut, "SimpleSwap: insufficient output amount");
        require(amountOut < reserveB, "SimpleSwap: insufficient reserve");
        
        require(
            TestToken(tokenA).transferFrom(msg.sender, address(this), amountIn),
            "SimpleSwap: transferFrom failed"
        );
        require(
            TestToken(tokenB).transfer(msg.sender, amountOut),
            "SimpleSwap: transfer failed"
        );
        
        reserveA += amountIn;
        reserveB -= amountOut;
        
        emit Swap(msg.sender, amountIn, amountOut, tokenA, tokenB);
        emit Sync(reserveA, reserveB);
    }
    
    function swapBForA(uint256 amountIn, uint256 minAmountOut) external noReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "SimpleSwap: insufficient input");
        require(reserveA > 0 && reserveB > 0, "SimpleSwap: no liquidity");
        
        amountOut = getAmountOut(amountIn, reserveB, reserveA);
        require(amountOut >= minAmountOut, "SimpleSwap: insufficient output amount");
        require(amountOut < reserveA, "SimpleSwap: insufficient reserve");
        
        require(
            TestToken(tokenB).transferFrom(msg.sender, address(this), amountIn),
            "SimpleSwap: transferFrom failed"
        );
        require(
            TestToken(tokenA).transfer(msg.sender, amountOut),
            "SimpleSwap: transfer failed"
        );
        
        reserveB += amountIn;
        reserveA -= amountOut;
        
        emit Swap(msg.sender, amountIn, amountOut, tokenB, tokenA);
        emit Sync(reserveA, reserveB);
    }
    
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0, "SimpleSwap: insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "SimpleSwap: insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }
    
    function getPrice(address token) external view returns (uint256) {
        require(token == tokenA || token == tokenB, "SimpleSwap: invalid token");
        require(reserveA > 0 && reserveB > 0, "SimpleSwap: no liquidity");
        
        if (token == tokenA) {
            return (reserveB * 1e18) / reserveA;
        } else {
            return (reserveA * 1e18) / reserveB;
        }
    }
    
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
