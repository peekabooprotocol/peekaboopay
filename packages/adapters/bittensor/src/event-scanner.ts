import type { MerkleTree } from "@peekaboopay/crypto";

// ---------------------------------------------------------------
// Event Scanner — syncs on-chain state to local data structures
// ---------------------------------------------------------------

/**
 * Contract interface subset needed for event scanning.
 * This avoids a hard dependency on ethers.Contract.
 */
export interface EventSourceContract {
	queryFilter(
		event: string,
		fromBlock?: number,
		toBlock?: number | string,
	): Promise<any[]>;
}

/**
 * Sync the off-chain Merkle tree with on-chain Deposit events.
 * Inserts commitments in order of leafIndex.
 *
 * @returns The number of new leaves inserted
 */
export async function syncMerkleTree(
	pool: EventSourceContract,
	tree: MerkleTree,
	fromBlock = 0,
): Promise<number> {
	const events = await pool.queryFilter("Deposit", fromBlock, "latest");

	// Sort by leafIndex to ensure correct insertion order
	const sorted = events
		.map((e: any) => ({
			commitment: BigInt(e.args.commitment),
			leafIndex: Number(e.args.leafIndex),
		}))
		.sort((a: any, b: any) => a.leafIndex - b.leafIndex);

	// Only insert leaves we haven't seen yet
	let inserted = 0;
	for (const { commitment, leafIndex } of sorted) {
		if (leafIndex >= tree.leafCount) {
			tree.insert(commitment);
			inserted++;
		}
	}

	return inserted;
}

/**
 * Get all spent nullifier hashes from on-chain Withdrawal events.
 */
export async function getSpentNullifiers(
	pool: EventSourceContract,
	fromBlock = 0,
): Promise<Set<string>> {
	const events = await pool.queryFilter("Withdrawal", fromBlock, "latest");
	const nullifiers = new Set<string>();

	for (const event of events) {
		nullifiers.add((event as any).args.nullifierHash.toLowerCase());
	}

	return nullifiers;
}

/**
 * Decoded stealth announcement from on-chain events.
 */
export interface StealthAnnouncementEvent {
	schemeId: number;
	stealthAddress: string;
	caller: string;
	ephemeralPubKey: string;
	metadata: string;
}

/**
 * Scan StealthAnnouncer for announcements.
 */
export async function scanAnnouncements(
	announcer: EventSourceContract,
	fromBlock = 0,
): Promise<StealthAnnouncementEvent[]> {
	const events = await announcer.queryFilter(
		"Announcement",
		fromBlock,
		"latest",
	);

	return events.map((e: any) => ({
		schemeId: Number(e.args.schemeId),
		stealthAddress: e.args.stealthAddress,
		caller: e.args.caller,
		ephemeralPubKey: e.args.ephemeralPubKey,
		metadata: e.args.metadata,
	}));
}
