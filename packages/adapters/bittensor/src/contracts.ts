import type { Hex } from "@peekaboopay/types";

// ---------------------------------------------------------------
// Deployed contract addresses (Bittensor EVM Mainnet, Chain 964)
// ---------------------------------------------------------------

export const MAINNET_CONTRACTS = {
	shieldedPool: "0xaf2443B3bFc7D4cbD0e58fA175876fF51f7097f59" as Hex,
	groth16Verifier: "0x0CD5A7D426ED71D8d1e216FEEADBC2F6574D053D" as Hex,
	stealthAnnouncer: "0xF6b3223aC0107e2bd64A982e0212C0b0751c269B" as Hex,
};

// ---------------------------------------------------------------
// Minimal ABI fragments — only the functions/events we call
// ---------------------------------------------------------------

export const SHIELDED_POOL_ABI = [
	// Deposit TAO
	"function deposit(bytes32 _commitment) external payable",
	// Deposit ERC-20
	"function depositERC20(bytes32 _commitment, address _token, uint256 _amount) external",
	// Withdraw with ZK proof
	"function withdraw(bytes32 _nullifierHash, address _recipient, uint256 _amount, address _token, bytes32 _root, bytes calldata _proof) external",
	// View functions
	"function getLatestRoot() external view returns (bytes32)",
	"function isKnownRoot(bytes32 _root) external view returns (bool)",
	"function isSpentNullifier(bytes32 _nullifierHash) external view returns (bool)",
	"function getNextIndex() external view returns (uint32)",
	// Events
	"event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)",
	"event Withdrawal(bytes32 indexed nullifierHash, address recipient, uint256 amount)",
] as const;

export const STEALTH_ANNOUNCER_ABI = [
	// Announce stealth address
	"function announce(uint256 schemeId, address stealthAddress, bytes calldata ephemeralPubKey, bytes1 viewTag, bytes calldata metadata) external",
	// Events
	"event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)",
] as const;

/** Zero address — used for native TAO (not ERC-20) */
export const NATIVE_TOKEN_ADDRESS =
	"0x0000000000000000000000000000000000000000" as Hex;
