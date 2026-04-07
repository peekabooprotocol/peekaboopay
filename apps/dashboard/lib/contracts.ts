export const SHIELDED_POOL_ADDRESS =
	"0xaf2443B3bFc7D4cbD0e58fA175876fF51f7097f59" as const;
export const STEALTH_ANNOUNCER_ADDRESS =
	"0xF6b3223aC0107e2bd64A982e0212C0b0751c269B" as const;
export const FEE_RECIPIENT =
	"0x14d119BEFf4A5dE286C3e4DC5F8C8fc8783f300f" as const;

export const SHIELDED_POOL_ABI = [
	"function deposit(bytes32 _commitment) external payable",
	"function depositERC20(bytes32 _commitment, address _token, uint256 _amount) external",
	"function withdraw(bytes32 _nullifierHash, address _recipient, uint256 _amount, address _token, bytes32 _root, bytes _proof) external",
	"function getLatestRoot() external view returns (bytes32)",
	"function isKnownRoot(bytes32 _root) external view returns (bool)",
	"function isSpentNullifier(bytes32 _nullifierHash) external view returns (bool)",
	"function getNextIndex() external view returns (uint32)",
	"function feeBasisPoints() external view returns (uint256)",
	"function feeRecipient() external view returns (address)",
	"event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)",
	"event Withdrawal(bytes32 indexed nullifierHash, address recipient, uint256 amount)",
] as const;

export const STEALTH_ANNOUNCER_ABI = [
	"function announce(uint256 schemeId, address stealthAddress, bytes ephemeralPubKey, bytes1 viewTag, bytes metadata) external",
	"event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)",
] as const;
