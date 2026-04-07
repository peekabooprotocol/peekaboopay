import type { Hex } from "@peekaboopay/types";

// ---------------------------------------------------------------
// Deployed contract addresses (Bittensor EVM Mainnet, Chain 964)
// ---------------------------------------------------------------

export const MAINNET_CONTRACTS = {
	shieldedPool: "0xf42E35258a682D4726880c3c453c4b96821f2b04" as Hex,
	groth16Verifier: "0xA3FFE2Eabc46404A46337c4EC47a62da5F2794ee" as Hex,
	stealthAnnouncer: "0xE5e3d47BF0aE09E7D4F6b36A5da285254CCfE0F7" as Hex,
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
