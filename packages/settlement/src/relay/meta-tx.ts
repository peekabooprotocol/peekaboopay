import { ethers } from "ethers";
import type { RelayRequest, WithdrawMetaTxParams, AnnounceMetaTxParams } from "./types.js";

// ---------------------------------------------------------------
// ABI fragments for encoding contract calls
// ---------------------------------------------------------------

/**
 * Minimal ABI for ShieldedPool.withdraw():
 *
 *   function withdraw(
 *     bytes32 _nullifierHash,
 *     address payable _recipient,
 *     uint256 _amount,
 *     address _token,
 *     bytes32 _root,
 *     bytes calldata _proof
 *   ) external
 */
const SHIELDED_POOL_WITHDRAW_ABI = [
	"function withdraw(bytes32 _nullifierHash, address _recipient, uint256 _amount, address _token, bytes32 _root, bytes _proof)",
];

/**
 * Minimal ABI for StealthAnnouncer.announce():
 *
 *   function announce(
 *     uint256 schemeId,
 *     address stealthAddress,
 *     bytes calldata ephemeralPubKey,
 *     bytes1 viewTag,
 *     bytes calldata metadata
 *   ) external
 */
const STEALTH_ANNOUNCER_ABI = [
	"function announce(uint256 schemeId, address stealthAddress, bytes ephemeralPubKey, bytes1 viewTag, bytes metadata)",
];

// ---------------------------------------------------------------
// Meta-transaction builders
// ---------------------------------------------------------------

/**
 * Build a relay request for withdrawing from ShieldedPool.
 *
 * This is the primary use case: a stealth address has received shielded
 * funds but has no gas to call `withdraw()` itself. The relay request
 * encodes the withdraw calldata so a relayer can submit it.
 *
 * The returned request is unsigned — call `signRelayRequest()` to sign it
 * with the stealth address holder's key.
 */
export function buildWithdrawMetaTx(
	params: WithdrawMetaTxParams,
): Omit<RelayRequest, "signature"> {
	const iface = new ethers.Interface(SHIELDED_POOL_WITHDRAW_ABI);

	const data = iface.encodeFunctionData("withdraw", [
		params.nullifierHash,
		params.recipient,
		params.amount,
		params.token,
		params.root,
		params.proof,
	]);

	return {
		from: params.recipient, // the stealth address holder is the sender
		to: params.poolAddress,
		data,
		chainId: params.chainId,
		maxRelayFeeBps: params.maxRelayFeeBps,
		nonce: params.nonce,
		deadline: params.deadline,
	};
}

/**
 * Build a relay request for announcing a stealth address payment
 * via StealthAnnouncer.
 *
 * When a sender pays to a stealth address, they should announce it
 * on-chain so the recipient can discover the payment. If the sender
 * doesn't want to link their main address to the announcement, they
 * can relay it through the relayer.
 *
 * The returned request is unsigned — call `signRelayRequest()` to sign it.
 */
export function buildAnnounceMetaTx(
	params: AnnounceMetaTxParams,
): Omit<RelayRequest, "signature"> {
	const iface = new ethers.Interface(STEALTH_ANNOUNCER_ABI);

	const data = iface.encodeFunctionData("announce", [
		params.schemeId,
		params.stealthAddress,
		params.ephemeralPubKey,
		params.viewTag,
		params.metadata,
	]);

	return {
		from: params.stealthAddress,
		to: params.announcerAddress,
		data,
		chainId: params.chainId,
		maxRelayFeeBps: params.maxRelayFeeBps,
		nonce: params.nonce,
		deadline: params.deadline,
	};
}
