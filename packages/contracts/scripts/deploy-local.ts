import { ethers, network } from "hardhat";

async function main() {
	const TREE_DEPTH = 20;
	const networkName = network.name;
	const isLegacy = networkName === "bittensor" || networkName === "bittensor-testnet";

	console.log(`Network: ${networkName}`);
	console.log(`Tx type: ${isLegacy ? "legacy (type 0)" : "EIP-1559"}\n`);

	// Gas config — legacy for Bittensor, EIP-1559 for everything else
	const feeData = await ethers.provider.getFeeData();
	const txOverrides: any = isLegacy
		? { gasPrice: feeData.gasPrice!, type: 0 }
		: {};

	const [signer] = await ethers.getSigners();
	const balance = await ethers.provider.getBalance(signer.address);
	console.log(`Deployer: ${signer.address}`);
	console.log(`Balance: ${ethers.formatEther(balance)}\n`);

	// Step 1: Deploy PoseidonT3 library
	console.log("Deploying PoseidonT3 library...");
	const PoseidonT3 = require("poseidon-solidity/deploy/PoseidonT3");
	const poseidonTx = await signer.sendTransaction({
		data: PoseidonT3.bytecode,
		...txOverrides,
	});
	const poseidonReceipt = await poseidonTx.wait();
	const poseidonAddr = poseidonReceipt!.contractAddress!;
	console.log(`  PoseidonT3 deployed at: ${poseidonAddr}`);

	// Step 2: Deploy Groth16 Verifier
	console.log("\nDeploying Groth16Verifier...");
	const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
	const verifier = await VerifierFactory.deploy(txOverrides);
	await verifier.waitForDeployment();
	const verifierAddr = await verifier.getAddress();
	console.log(`  Groth16Verifier deployed at: ${verifierAddr}`);

	// Step 3: Deploy ShieldedPool with library linking
	console.log("\nDeploying ShieldedPool...");
	const PoolFactory = await ethers.getContractFactory("ShieldedPool", {
		libraries: {
			"poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidonAddr,
		},
	});
	const FEE_BPS = 50; // 0.5% protocol fee
	const feeRecipient = signer.address; // deployer receives fees
	const pool = await PoolFactory.deploy(TREE_DEPTH, verifierAddr, feeRecipient, FEE_BPS, txOverrides);
	await pool.waitForDeployment();
	const poolAddr = await pool.getAddress();
	console.log(`  ShieldedPool deployed at: ${poolAddr}`);
	console.log(`  Tree depth: ${TREE_DEPTH} (max ${2 ** TREE_DEPTH} deposits)`);
	console.log(`  Verifier: ${verifierAddr}`);
	console.log(`  Fee: ${FEE_BPS / 100}% → ${feeRecipient}`);

	// Step 4: Deploy DenominatedPool instances (0.1, 1, 10 TAO)
	// All share the same Groth16Verifier and PoseidonT3 library
	const DenomPoolFactory = await ethers.getContractFactory("DenominatedPool", {
		libraries: {
			"poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidonAddr,
		},
	});

	const denominations = [
		{ label: "0.1 TAO", value: ethers.parseEther("0.1") },
		{ label: "1 TAO",   value: ethers.parseEther("1") },
		{ label: "10 TAO",  value: ethers.parseEther("10") },
	];

	const denomPoolAddrs: Record<string, string> = {};

	for (const denom of denominations) {
		console.log(`\nDeploying DenominatedPool (${denom.label})...`);
		const denomPool = await DenomPoolFactory.deploy(
			TREE_DEPTH,
			verifierAddr,
			denom.value,
			feeRecipient,
			FEE_BPS,
			txOverrides,
		);
		await denomPool.waitForDeployment();
		const denomPoolAddr = await denomPool.getAddress();
		denomPoolAddrs[denom.label] = denomPoolAddr;
		console.log(`  DenominatedPool (${denom.label}) deployed at: ${denomPoolAddr}`);
		console.log(`  Denomination: ${denom.label} (${denom.value} wei)`);
		console.log(`  Tree depth: ${TREE_DEPTH} | Verifier: ${verifierAddr}`);
	}

	// Step 5: Deploy StealthAnnouncer
	console.log("\nDeploying StealthAnnouncer...");
	const AnnouncerFactory = await ethers.getContractFactory("StealthAnnouncer");
	const announcer = await AnnouncerFactory.deploy(txOverrides);
	await announcer.waitForDeployment();
	const announcerAddr = await announcer.getAddress();
	console.log(`  StealthAnnouncer deployed at: ${announcerAddr}`);

	console.log("\n--- Deployment complete ---");
	console.log(
		JSON.stringify(
			{
				PoseidonT3: poseidonAddr,
				Groth16Verifier: verifierAddr,
				ShieldedPool: poolAddr,
				DenominatedPools: denomPoolAddrs,
				StealthAnnouncer: announcerAddr,
				network: networkName,
				treeDepth: TREE_DEPTH,
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
