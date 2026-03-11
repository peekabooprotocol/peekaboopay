import { ethers } from "hardhat";

async function main() {
	const TREE_DEPTH = 20;

	// Step 1: Deploy PoseidonT3 library
	console.log("Deploying PoseidonT3 library...");
	const [signer] = await ethers.getSigners();
	const PoseidonT3 = require("poseidon-solidity/deploy/PoseidonT3");
	const poseidonTx = await signer.sendTransaction({
		data: PoseidonT3.bytecode,
	});
	const poseidonReceipt = await poseidonTx.wait();
	const poseidonAddr = poseidonReceipt!.contractAddress!;
	console.log(`  PoseidonT3 deployed at: ${poseidonAddr}`);

	// Step 2: Deploy Groth16 Verifier
	console.log("\nDeploying Groth16Verifier...");
	const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
	const verifier = await VerifierFactory.deploy();
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
	const pool = await PoolFactory.deploy(TREE_DEPTH, verifierAddr);
	await pool.waitForDeployment();
	const poolAddr = await pool.getAddress();
	console.log(`  ShieldedPool deployed at: ${poolAddr}`);
	console.log(`  Tree depth: ${TREE_DEPTH} (max ${2 ** TREE_DEPTH} deposits)`);
	console.log(`  Verifier: ${verifierAddr}`);

	// Step 4: Deploy StealthAnnouncer
	console.log("\nDeploying StealthAnnouncer...");
	const AnnouncerFactory = await ethers.getContractFactory("StealthAnnouncer");
	const announcer = await AnnouncerFactory.deploy();
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
				StealthAnnouncer: announcerAddr,
				network: "hardhat",
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
