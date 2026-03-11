// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StealthAnnouncer
 * @notice ERC-5564 compliant stealth address announcement registry.
 *
 *         This contract serves as an on-chain event log for stealth address
 *         announcements. It stores no state — all data is emitted as events
 *         for off-chain indexing and scanning.
 *
 *         Scheme IDs:
 *           1 = secp256k1 ECDH (matches PAS AddressDerivation implementation)
 *           2 = ed25519 (reserved for future use)
 *
 * @dev See https://eips.ethereum.org/EIPS/eip-5564
 */
contract StealthAnnouncer {
    /**
     * @notice Emitted when a stealth address payment is announced.
     * @param schemeId          The stealth address scheme identifier
     * @param stealthAddress    The generated stealth address
     * @param caller            The address that made the announcement (typically the sender)
     * @param ephemeralPubKey   The ephemeral public key for ECDH derivation
     * @param metadata          Arbitrary metadata (e.g. view tag, encrypted memo)
     */
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    /**
     * @notice Announce a stealth address payment.
     * @param schemeId          The stealth address scheme (1 = secp256k1)
     * @param stealthAddress    The recipient's stealth address
     * @param ephemeralPubKey   The ephemeral public key used in derivation
     * @param viewTag           Single-byte view tag for fast scanning
     * @param metadata          Optional additional data
     */
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes calldata metadata
    ) external {
        // Combine viewTag with metadata for the event
        // Per ERC-5564, the metadata field includes the view tag as the first byte
        bytes memory fullMetadata = abi.encodePacked(viewTag, metadata);

        emit Announcement(
            schemeId,
            stealthAddress,
            msg.sender,
            ephemeralPubKey,
            fullMetadata
        );
    }
}
