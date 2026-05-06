/**
 * build-circuits.ts — Compile Circom circuits and generate Groth16 verifier.
 *
 * Usage: npx ts-node scripts/build-circuits.ts [--test-only]
 *
 * Steps:
 * 1. Compile .circom → R1CS + WASM (via circom binary)
 * 2. Run Groth16 Phase 2 setup (snarkjs: R1CS + ptau → zkey)
 * 3. Contribute to Phase 2 ceremony (dev-only entropy)
 * 4. Export verification key
 * 5. Export Solidity verifier contract → contracts/Groth16Verifier.sol
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(__dirname, "..");
const CIRCUITS_DIR = path.join(ROOT, "circuits");
const BUILD_DIR = path.join(CIRCUITS_DIR, "build");
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const PTAU_DIR = path.join(ROOT, "ptau");
const BIN_DIR = path.join(ROOT, "bin");

// Circom binary path (Windows)
const CIRCOM = path.join(BIN_DIR, "circom.exe");

// Powers of Tau file
const PTAU_FILE = path.join(PTAU_DIR, "powersOfTau28_hez_final_14.ptau");

// Include path for circomlib (npm hoists to root node_modules)
const NODE_MODULES = path.resolve(ROOT, "..", "..", "node_modules");

interface BuildConfig {
	name: string;
	source: string;
	generateVerifier: boolean;
}

const CIRCUITS: BuildConfig[] = [
	{
		name: "withdraw_test",
		source: path.join(CIRCUITS_DIR, "withdraw_test.circom"),
		generateVerifier: true, // The test verifier is used for both test and prod
	},
];

// Add the full depth-20 circuit if --full flag is passed
const buildFull = process.argv.includes("--full");
if (buildFull) {
	CIRCUITS.push({
		name: "withdraw",
		source: path.join(CIRCUITS_DIR, "withdraw.circom"),
		generateVerifier: false, // Only generate verifier from the test circuit for now
	});
}

function run(cmd: string, cwd?: string) {
	console.log(`  > ${cmd}`);
	execSync(cmd, {
		cwd: cwd || ROOT,
		stdio: "inherit",
		env: { ...process.env },
	});
}

function ensureDir(dir: string) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function main() {
	console.log("=== Circuit Build Pipeline ===\n");

	// Verify prerequisites
	if (!fs.existsSync(CIRCOM)) {
		console.error(
			`ERROR: circom binary not found at ${CIRCOM}\n` +
				`Run: scripts/setup-circom.sh (or download manually from https://github.com/iden3/circom/releases)`,
		);
		process.exit(1);
	}

	if (!fs.existsSync(PTAU_FILE)) {
		console.error(
			`ERROR: Powers of Tau file not found at ${PTAU_FILE}\n` +
				`Run: scripts/setup-circom.sh (or download from https://storage.googleapis.com/zkevm/ptau/)`,
		);
		process.exit(1);
	}

	ensureDir(BUILD_DIR);

	for (const circuit of CIRCUITS) {
		console.log(`\n--- Building: ${circuit.name} ---\n`);

		// Step 1: Compile circuit
		console.log("Step 1: Compiling circuit...");
		run(
			`"${CIRCOM}" "${circuit.source}" --r1cs --wasm --sym -o "${BUILD_DIR}" -l "${NODE_MODULES}"`,
		);

		const r1csFile = path.join(BUILD_DIR, `${circuit.name}.r1cs`);
		const zkeyInit = path.join(BUILD_DIR, `${circuit.name}_0000.zkey`);
		const zkeyFinal = path.join(BUILD_DIR, `${circuit.name}.zkey`);
		const vkeyFile = path.join(BUILD_DIR, "verification_key.json");

		// Step 2: Groth16 Phase 2 setup
		console.log("\nStep 2: Groth16 Phase 2 setup...");
		run(
			`npx snarkjs groth16 setup "${r1csFile}" "${PTAU_FILE}" "${zkeyInit}"`,
		);

		// Step 3: Contribute to Phase 2
		console.log("\nStep 3: Contributing to Phase 2 ceremony...");
		run(
			`npx snarkjs zkey contribute "${zkeyInit}" "${zkeyFinal}" --name="PAS dev build" -e="PAS circuit build entropy ${Date.now()}"`,
		);

		// Step 4: Export verification key
		console.log("\nStep 4: Exporting verification key...");
		run(
			`npx snarkjs zkey export verificationkey "${zkeyFinal}" "${vkeyFile}"`,
		);

		// Step 5: Generate Solidity verifier
		if (circuit.generateVerifier) {
			const verifierFile = path.join(
				CONTRACTS_DIR,
				"Groth16Verifier.sol",
			);
			console.log("\nStep 5: Generating Solidity verifier...");
			run(
				`npx snarkjs zkey export solidityverifier "${zkeyFinal}" "${verifierFile}"`,
			);
			console.log(`  Verifier written to: ${verifierFile}`);
		}

		console.log(`\n--- ${circuit.name}: Build complete ---`);
	}

	console.log("\n=== All circuits built successfully ===");
}

main().catch((error) => {
	console.error("Build failed:", error);
	process.exit(1);
});
