import { network } from "hardhat";
import {
	parseEther,
	formatEther,
	encodeFunctionData,
	Hash,
} from "viem";

/**
 * This script deploys all contracts and generates mainnet-like transactions:
 * - ERC20 transfers, approvals, mints, burns
 * - NFT mints and transfers
 * - DEX swaps with liquidity
 * - Vault deposits/withdrawals
 * - Failed transactions (insufficient balance, reverts, etc.)
 */

// Helper to log transaction hash
function logTx(label: string, hash: Hash) {
	console.log(`    📝 ${label}: ${hash}`);
}

// Helper to send a transaction that may revert, bypassing simulation
async function sendRawTx(
	wallet: any,
	to: `0x${string}`,
	data: `0x${string}`,
	label: string,
): Promise<Hash> {
	const tx = await wallet.sendTransaction({
		to,
		data,
		gas: 500000n, // Fixed gas to bypass estimation
	});
	logTx(label, tx);
	return tx;
}

async function main() {
	console.log("🚀 Starting mainnet-like transaction generator...\n");

	const { viem } = await network.connect();
	const [deployer, user1, user2, user3, user4] = await viem.getWalletClients();
	const publicClient = await viem.getPublicClient();

	console.log("📍 Accounts:");
	console.log(`  Deployer: ${deployer.account.address}`);
	console.log(`  User1: ${user1.account.address}`);
	console.log(`  User2: ${user2.account.address}`);
	console.log(`  User3: ${user3.account.address}`);
	console.log(`  User4: ${user4.account.address}\n`);

	// ========== DEPLOY CONTRACTS ==========
	console.log("📦 Deploying contracts...\n");

	// Deploy Token A
	const tokenA = await viem.deployContract("TestToken", [
		"Token Alpha",
		"ALPHA",
		parseEther("1000000"),
	]);
	console.log(`  ✅ Token A (ALPHA): ${tokenA.address}`);

	// Deploy Token B
	const tokenB = await viem.deployContract("TestToken", [
		"Token Beta",
		"BETA",
		parseEther("1000000"),
	]);
	console.log(`  ✅ Token B (BETA): ${tokenB.address}`);

	// Deploy Stable Token
	const stableToken = await viem.deployContract("TestToken", [
		"USD Tether",
		"USDT",
		parseEther("10000000"),
	]);
	console.log(`  ✅ Stable Token (USDT): ${stableToken.address}`);

	// Deploy NFT
	const testNFT = await viem.deployContract("TestNFT", [
		"CryptoPunks Clone",
		"PUNK",
		"https://api.punks.example/metadata/",
	]);
	console.log(`  ✅ NFT (PUNK): ${testNFT.address}`);

	// Deploy SimpleSwap
	const simpleSwap = await viem.deployContract("SimpleSwap", [
		tokenA.address,
		tokenB.address,
	]);
	console.log(`  ✅ SimpleSwap: ${simpleSwap.address}`);

	// Deploy Vault
	const vault = await viem.deployContract("Vault", [
		stableToken.address,
		parseEther("100"), // minDeposit
		parseEther("10000"), // maxDeposit
		50n, // 0.5% fee
		0n, // no lock for testing
	]);
	console.log(`  ✅ Vault: ${vault.address}`);

	// Deploy Multicall
	const multicall = await viem.deployContract("Multicall", []);
	console.log(`  ✅ Multicall: ${multicall.address}`);

	// Deploy Counter
	const counter = await viem.deployContract("Counter", []);
	console.log(`  ✅ Counter: ${counter.address}`);

	console.log("\n========================================\n");

	// ========== ERC20 TRANSACTIONS ==========
	console.log("💰 Generating ERC20 transactions...\n");

	// Distribute tokens to users
	console.log("  Distributing tokens to users...");
	let tx: Hash;
	tx = await tokenA.write.transfer([user1.account.address, parseEther("50000")]);
	logTx("ALPHA -> user1", tx);
	tx = await tokenA.write.transfer([user2.account.address, parseEther("30000")]);
	logTx("ALPHA -> user2", tx);
	tx = await tokenA.write.transfer([user3.account.address, parseEther("20000")]);
	logTx("ALPHA -> user3", tx);

	tx = await tokenB.write.transfer([user1.account.address, parseEther("40000")]);
	logTx("BETA -> user1", tx);
	tx = await tokenB.write.transfer([user2.account.address, parseEther("35000")]);
	logTx("BETA -> user2", tx);
	tx = await tokenB.write.transfer([user4.account.address, parseEther("25000")]);
	logTx("BETA -> user4", tx);

	tx = await stableToken.write.transfer([
		user1.account.address,
		parseEther("100000"),
	]);
	logTx("USDT -> user1", tx);
	tx = await stableToken.write.transfer([
		user2.account.address,
		parseEther("80000"),
	]);
	logTx("USDT -> user2", tx);
	tx = await stableToken.write.transfer([
		user3.account.address,
		parseEther("60000"),
	]);
	logTx("USDT -> user3", tx);
	tx = await stableToken.write.transfer([
		user4.account.address,
		parseEther("40000"),
	]);
	logTx("USDT -> user4", tx);

	// User transfers
	console.log("  User-to-user transfers...");
	const tokenAUser1 = await viem.getContractAt("TestToken", tokenA.address, {
		client: { wallet: user1 },
	});
	const tokenAUser2 = await viem.getContractAt("TestToken", tokenA.address, {
		client: { wallet: user2 },
	});
	const tokenBUser1 = await viem.getContractAt("TestToken", tokenB.address, {
		client: { wallet: user1 },
	});

	tx = await tokenAUser1.write.transfer([user2.account.address, parseEther("5000")]);
	logTx("user1 ALPHA -> user2", tx);
	tx = await tokenAUser2.write.transfer([user3.account.address, parseEther("2500")]);
	logTx("user2 ALPHA -> user3", tx);
	tx = await tokenBUser1.write.transfer([user3.account.address, parseEther("1000")]);
	logTx("user1 BETA -> user3", tx);

	// Approvals
	console.log("  Setting approvals...");
	tx = await tokenAUser1.write.approve([simpleSwap.address, parseEther("100000")]);
	logTx("user1 approve ALPHA", tx);
	tx = await tokenAUser2.write.approve([simpleSwap.address, parseEther("100000")]);
	logTx("user2 approve ALPHA", tx);
	tx = await tokenBUser1.write.approve([simpleSwap.address, parseEther("100000")]);
	logTx("user1 approve BETA", tx);

	const stableUser1 = await viem.getContractAt(
		"TestToken",
		stableToken.address,
		{ client: { wallet: user1 } },
	);
	const stableUser2 = await viem.getContractAt(
		"TestToken",
		stableToken.address,
		{ client: { wallet: user2 } },
	);
	tx = await stableUser1.write.approve([vault.address, parseEther("1000000")]);
	logTx("user1 approve USDT", tx);
	tx = await stableUser2.write.approve([vault.address, parseEther("1000000")]);
	logTx("user2 approve USDT", tx);

	// Mint more tokens
	console.log("  Minting additional tokens...");
	tx = await tokenA.write.mint([user4.account.address, parseEther("15000")]);
	logTx("mint ALPHA -> user4", tx);
	tx = await tokenB.write.mint([user4.account.address, parseEther("12000")]);
	logTx("mint BETA -> user4", tx);

	// Burn tokens
	console.log("  Burning tokens...");
	const tokenAUser3 = await viem.getContractAt("TestToken", tokenA.address, {
		client: { wallet: user3 },
	});
	tx = await tokenAUser3.write.burn([parseEther("500")]);
	logTx("user3 burn ALPHA", tx);

	console.log("  ✅ ERC20 transactions complete\n");

	// ========== NFT TRANSACTIONS ==========
	console.log("🖼️  Generating NFT transactions...\n");

	// Mint NFTs to different users
	console.log("  Minting NFTs...");
	tx = await testNFT.write.mint([deployer.account.address]); // Token 0
	logTx("mint NFT #0 -> deployer", tx);
	tx = await testNFT.write.mint([user1.account.address]); // Token 1
	logTx("mint NFT #1 -> user1", tx);
	tx = await testNFT.write.mint([user1.account.address]); // Token 2
	logTx("mint NFT #2 -> user1", tx);
	tx = await testNFT.write.mint([user2.account.address]); // Token 3
	logTx("mint NFT #3 -> user2", tx);
	tx = await testNFT.write.mintWithURI([
		user3.account.address,
		"ipfs://QmSpecialNFT",
	]); // Token 4
	logTx("mint NFT #4 -> user3", tx);

	// Batch mint
	console.log("  Batch minting NFTs...");
	tx = await testNFT.write.batchMint([user4.account.address, 5n]); // Tokens 5-9
	logTx("batch mint NFT #5-9 -> user4", tx);

	// NFT transfers
	console.log("  Transferring NFTs...");
	const nftUser1 = await viem.getContractAt("TestNFT", testNFT.address, {
		client: { wallet: user1 },
	});
	tx = await nftUser1.write.transferFrom([
		user1.account.address,
		user2.account.address,
		1n,
	]);
	logTx("transfer NFT #1 user1 -> user2", tx);

	// NFT approvals
	console.log("  Setting NFT approvals...");
	tx = await nftUser1.write.approve([user3.account.address, 2n]);
	logTx("approve NFT #2 -> user3", tx);
	tx = await nftUser1.write.setApprovalForAll([user4.account.address, true]);
	logTx("setApprovalForAll -> user4", tx);

	// Burn NFT
	console.log("  Burning NFT...");
	const nftUser4 = await viem.getContractAt("TestNFT", testNFT.address, {
		client: { wallet: user4 },
	});
	tx = await nftUser4.write.burn([9n]);
	logTx("burn NFT #9", tx);

	console.log("  ✅ NFT transactions complete\n");

	// ========== DEX TRANSACTIONS ==========
	console.log("🔄 Generating DEX transactions...\n");
	// Add liquidity (deployer)
	console.log("  Adding initial liquidity...");
	tx = await tokenA.write.approve([simpleSwap.address, parseEther("100000")]);
	logTx("deployer approve ALPHA for swap", tx);
	tx = await tokenB.write.approve([simpleSwap.address, parseEther("100000")]);
	logTx("deployer approve BETA for swap", tx);
	tx = await simpleSwap.write.addLiquidity([
		parseEther("50000"),
		parseEther("50000"),
	]);
	logTx("deployer addLiquidity", tx);

	// Swaps
	console.log("  Executing swaps...");
	const swapUser1 = await viem.getContractAt("SimpleSwap", simpleSwap.address, {
		client: { wallet: user1 },
	});
	const swapUser2 = await viem.getContractAt("SimpleSwap", simpleSwap.address, {
		client: { wallet: user2 },
	});

	// User1 swaps A for B
	tx = await swapUser1.write.swapAForB([parseEther("1000"), parseEther("900")]);
	logTx("user1 swapAForB", tx);

	// User2 swaps A for B
	tx = await swapUser2.write.swapAForB([parseEther("500"), parseEther("400")]);
	logTx("user2 swapAForB", tx);

	// User1 swaps B for A
	const tokenBUser1Again = await viem.getContractAt(
		"TestToken",
		tokenB.address,
		{ client: { wallet: user1 } },
	);
	tx = await tokenBUser1Again.write.approve([
		simpleSwap.address,
		parseEther("100000"),
	]);
	logTx("user1 approve BETA for swap", tx);
	tx = await swapUser1.write.swapBForA([parseEther("2000"), parseEther("1800")]);
	logTx("user1 swapBForA", tx);

	// More liquidity
	console.log("  Adding more liquidity...");
	const tokenAUser1Again = await viem.getContractAt(
		"TestToken",
		tokenA.address,
		{ client: { wallet: user1 } },
	);
	tx = await tokenAUser1Again.write.approve([
		simpleSwap.address,
		parseEther("100000"),
	]);
	logTx("user1 approve ALPHA for swap", tx);
	tx = await tokenBUser1Again.write.approve([
		simpleSwap.address,
		parseEther("100000"),
	]);
	logTx("user1 approve BETA for swap", tx);
	tx = await swapUser1.write.addLiquidity([
		parseEther("10000"),
		parseEther("10000"),
	]);
	logTx("user1 addLiquidity", tx);

	console.log("  ✅ DEX transactions complete\n");

	// ========== VAULT TRANSACTIONS ==========
	console.log("🏦 Generating Vault transactions...\n");

	// Deposits
	console.log("  Making deposits...");
	const vaultUser1 = await viem.getContractAt("Vault", vault.address, {
		client: { wallet: user1 },
	});
	const vaultUser2 = await viem.getContractAt("Vault", vault.address, {
		client: { wallet: user2 },
	});

	tx = await vaultUser1.write.deposit([parseEther("5000")]);
	logTx("user1 deposit 5000", tx);
	tx = await vaultUser2.write.deposit([parseEther("3000")]);
	logTx("user2 deposit 3000", tx);
	tx = await vaultUser1.write.deposit([parseEther("2000")]); // Additional deposit
	logTx("user1 deposit 2000", tx);

	// Withdrawals
	console.log("  Making withdrawals...");
	tx = await vaultUser1.write.withdraw([parseEther("1000")]);
	logTx("user1 withdraw 1000", tx);
	tx = await vaultUser2.write.withdrawAll();
	logTx("user2 withdrawAll", tx);

	// Admin actions
	console.log("  Admin actions...");
	tx = await vault.write.collectFees([deployer.account.address]);
	logTx("collectFees", tx);

	console.log("  ✅ Vault transactions complete\n");

	// ========== COUNTER TRANSACTIONS ==========
	console.log("🔢 Generating Counter transactions...\n");

	tx = await counter.write.inc();
	logTx("counter inc", tx);
	tx = await counter.write.inc();
	logTx("counter inc", tx);
	tx = await counter.write.incBy([5n]);
	logTx("counter incBy 5", tx);
	tx = await counter.write.incBy([10n]);
	logTx("counter incBy 10", tx);

	console.log("  ✅ Counter transactions complete\n");

	// ========== MULTICALL TRANSACTIONS ==========
	console.log("📦 Generating Multicall transactions...\n");

	// Batch read calls
	const calls = [
		{
			target: tokenA.address,
			callData: encodeFunctionData({
				abi: tokenA.abi,
				functionName: "balanceOf",
				args: [user1.account.address],
			}),
		},
		{
			target: tokenB.address,
			callData: encodeFunctionData({
				abi: tokenB.abi,
				functionName: "balanceOf",
				args: [user1.account.address],
			}),
		},
		{
			target: counter.address,
			callData: encodeFunctionData({
				abi: counter.abi,
				functionName: "x",
				args: [],
			}),
		},
	];

	tx = await multicall.write.aggregate([calls]);
	logTx("multicall aggregate", tx);

	console.log("  ✅ Multicall transactions complete\n");

	// ========== FAILED TRANSACTIONS ==========
	console.log("❌ Generating failed transactions...\n");

	// Use raw sendTransaction with fixed gas to bypass simulation
	// These transactions will be mined but revert on-chain

	// Insufficient balance transfer
	console.log("  Attempting insufficient balance transfer...");
	await sendRawTx(
		user4,
		tokenA.address,
		encodeFunctionData({
			abi: tokenA.abi,
			functionName: "transfer",
			args: [user1.account.address, parseEther("999999999")],
		}),
		"insufficient balance transfer (reverted)",
	);

	// Transfer to zero address
	console.log("  Attempting transfer to zero address...");
	await sendRawTx(
		user1,
		tokenA.address,
		encodeFunctionData({
			abi: tokenA.abi,
			functionName: "transfer",
			args: ["0x0000000000000000000000000000000000000000", parseEther("100")],
		}),
		"zero address transfer (reverted)",
	);

	// Vault deposit below minimum
	console.log("  Attempting vault deposit below minimum...");
	const stableUser3 = await viem.getContractAt(
		"TestToken",
		stableToken.address,
		{ client: { wallet: user3 } },
	);
	await stableUser3.write.approve([vault.address, parseEther("1000000")]);
	await sendRawTx(
		user3,
		vault.address,
		encodeFunctionData({
			abi: vault.abi,
			functionName: "deposit",
			args: [parseEther("10")], // Below 100 minimum
		}),
		"below minimum deposit (reverted)",
	);

	// Vault deposit above maximum
	console.log("  Attempting vault deposit above maximum...");
	await sendRawTx(
		user1,
		vault.address,
		encodeFunctionData({
			abi: vault.abi,
			functionName: "deposit",
			args: [parseEther("50000")], // Above 10000 maximum
		}),
		"above maximum deposit (reverted)",
	);

	// Swap with high slippage (minAmountOut too high)
	console.log("  Attempting swap with high slippage requirement...");
	await sendRawTx(
		user1,
		simpleSwap.address,
		encodeFunctionData({
			abi: simpleSwap.abi,
			functionName: "swapAForB",
			args: [parseEther("100"), parseEther("9999")], // Impossible output
		}),
		"high slippage swap (reverted)",
	);

	// Counter incBy with zero
	console.log("  Attempting counter incBy with zero...");
	await sendRawTx(
		deployer,
		counter.address,
		encodeFunctionData({
			abi: counter.abi,
			functionName: "incBy",
			args: [0n],
		}),
		"counter incBy zero (reverted)",
	);

	// Withdraw more than deposited
	console.log("  Attempting to withdraw more than deposited...");
	await sendRawTx(
		user1,
		vault.address,
		encodeFunctionData({
			abi: vault.abi,
			functionName: "withdraw",
			args: [parseEther("999999")],
		}),
		"excessive withdraw (reverted)",
	);

	// NFT transfer of non-owned token
	console.log("  Attempting NFT transfer of non-owned token...");
	await sendRawTx(
		user1,
		testNFT.address,
		encodeFunctionData({
			abi: testNFT.abi,
			functionName: "transferFrom",
			args: [user1.account.address, user2.account.address, 0n], // Token 0 is owned by deployer
		}),
		"non-owned NFT transfer (reverted)",
	);

	console.log("\n  ✅ Failed transaction tests complete\n");

	// ========== ETH TRANSFERS ==========
	console.log("💸 Generating ETH transfers...\n");

	// Send ETH between accounts
	tx = await deployer.sendTransaction({
		to: user1.account.address,
		value: parseEther("10"),
	});
	logTx("ETH transfer deployer → user1 (10 ETH)", tx);

	tx = await user1.sendTransaction({
		to: user2.account.address,
		value: parseEther("2"),
	});
	logTx("ETH transfer user1 → user2 (2 ETH)", tx);

	tx = await user2.sendTransaction({
		to: user3.account.address,
		value: parseEther("0.5"),
	});
	logTx("ETH transfer user2 → user3 (0.5 ETH)", tx);

	// Send ETH to contracts
	tx = await deployer.sendTransaction({
		to: multicall.address,
		value: parseEther("1"),
	});
	logTx("ETH transfer to multicall contract (1 ETH)", tx);

	console.log("  ✅ ETH transfers complete\n");

	// ========== SUMMARY ==========
	console.log("========================================");
	console.log("📊 DEPLOYMENT SUMMARY");
	console.log("========================================\n");

	console.log("Contracts deployed:");
	console.log(`  Token A (ALPHA):  ${tokenA.address}`);
	console.log(`  Token B (BETA):   ${tokenB.address}`);
	console.log(`  Stable (USDT):    ${stableToken.address}`);
	console.log(`  NFT (PUNK):       ${testNFT.address}`);
	console.log(`  SimpleSwap:       ${simpleSwap.address}`);
	console.log(`  Vault:            ${vault.address}`);
	console.log(`  Multicall:        ${multicall.address}`);
	console.log(`  Counter:          ${counter.address}`);

	const blockNumber = await publicClient.getBlockNumber();
	console.log(`\n📦 Current block number: ${blockNumber}`);

	// Get some stats
	const counterValue = await counter.read.x();
	const nftSupply = await testNFT.read.totalSupply();
	const [reserveA, reserveB] = await simpleSwap.read.getReserves();
	const vaultDeposits = await vault.read.totalDeposits();

	console.log(`\n📈 Contract states:`);
	console.log(`  Counter value: ${counterValue}`);
	console.log(`  NFT total supply: ${nftSupply}`);
	console.log(
		`  SimpleSwap reserves: ${formatEther(reserveA)} ALPHA / ${formatEther(reserveB)} BETA`,
	);
	console.log(`  Vault total deposits: ${formatEther(vaultDeposits)} USDT`);

	console.log("\n✨ All transactions generated successfully!");
	console.log("You can now explore these transactions in OpenScan.\n");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
