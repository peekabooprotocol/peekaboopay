import { expect } from "chai";
import { ethers } from "hardhat";
import type { StealthAnnouncer } from "../typechain-types";

describe("StealthAnnouncer", function () {
	let announcer: StealthAnnouncer;
	let caller1: Awaited<ReturnType<typeof ethers.provider.getSigner>>;
	let caller2: Awaited<ReturnType<typeof ethers.provider.getSigner>>;

	// ERC-5564 schemeId for secp256k1 ECDH
	const SCHEME_SECP256K1 = 1;

	// Sample stealth address and ephemeral key (hex)
	const STEALTH_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
	const EPHEMERAL_PUB_KEY =
		"0x04a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1";
	const VIEW_TAG = "0xab";
	const METADATA = "0xdeadbeef";

	beforeEach(async function () {
		[caller1, caller2] = await ethers.getSigners();

		const Factory = await ethers.getContractFactory("StealthAnnouncer");
		announcer = await Factory.deploy();
		await announcer.waitForDeployment();
	});

	it("emits Announcement event with all fields", async function () {
		const tx = await announcer.announce(
			SCHEME_SECP256K1,
			STEALTH_ADDRESS,
			EPHEMERAL_PUB_KEY,
			VIEW_TAG,
			METADATA,
		);

		// The contract encodes viewTag + metadata together
		const expectedMetadata = ethers.concat([VIEW_TAG, METADATA]);

		await expect(tx)
			.to.emit(announcer, "Announcement")
			.withArgs(
				SCHEME_SECP256K1,
				STEALTH_ADDRESS,
				await caller1.getAddress(),
				EPHEMERAL_PUB_KEY,
				expectedMetadata,
			);
	});

	it("multiple announcements from different callers", async function () {
		const addr1 = await caller1.getAddress();
		const addr2 = await caller2.getAddress();

		const tx1 = await announcer
			.connect(caller1)
			.announce(SCHEME_SECP256K1, STEALTH_ADDRESS, EPHEMERAL_PUB_KEY, VIEW_TAG, METADATA);

		const stealthAddr2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
		const tx2 = await announcer
			.connect(caller2)
			.announce(SCHEME_SECP256K1, stealthAddr2, EPHEMERAL_PUB_KEY, VIEW_TAG, METADATA);

		const expectedMetadata = ethers.concat([VIEW_TAG, METADATA]);

		await expect(tx1)
			.to.emit(announcer, "Announcement")
			.withArgs(SCHEME_SECP256K1, STEALTH_ADDRESS, addr1, EPHEMERAL_PUB_KEY, expectedMetadata);

		await expect(tx2)
			.to.emit(announcer, "Announcement")
			.withArgs(SCHEME_SECP256K1, stealthAddr2, addr2, EPHEMERAL_PUB_KEY, expectedMetadata);
	});

	it("handles arbitrary metadata bytes", async function () {
		const longMetadata =
			"0x" + "ff".repeat(256); // 256 bytes of metadata

		const tx = await announcer.announce(
			SCHEME_SECP256K1,
			STEALTH_ADDRESS,
			EPHEMERAL_PUB_KEY,
			VIEW_TAG,
			longMetadata,
		);

		const expectedMetadata = ethers.concat([VIEW_TAG, longMetadata]);

		await expect(tx)
			.to.emit(announcer, "Announcement")
			.withArgs(
				SCHEME_SECP256K1,
				STEALTH_ADDRESS,
				await caller1.getAddress(),
				EPHEMERAL_PUB_KEY,
				expectedMetadata,
			);
	});

	it("schemeId is indexed correctly", async function () {
		// Use a different scheme ID
		const SCHEME_ED25519 = 2;

		const tx = await announcer.announce(
			SCHEME_ED25519,
			STEALTH_ADDRESS,
			EPHEMERAL_PUB_KEY,
			VIEW_TAG,
			METADATA,
		);

		const expectedMetadata = ethers.concat([VIEW_TAG, METADATA]);

		await expect(tx)
			.to.emit(announcer, "Announcement")
			.withArgs(
				SCHEME_ED25519,
				STEALTH_ADDRESS,
				await caller1.getAddress(),
				EPHEMERAL_PUB_KEY,
				expectedMetadata,
			);
	});

	it("stealthAddress is indexed correctly", async function () {
		// Verify we can filter events by stealthAddress
		const addr = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";

		await announcer.announce(
			SCHEME_SECP256K1,
			addr,
			EPHEMERAL_PUB_KEY,
			VIEW_TAG,
			METADATA,
		);

		// Query events filtered by stealthAddress
		const filter = announcer.filters.Announcement(
			undefined,
			addr,
		);
		const events = await announcer.queryFilter(filter);

		expect(events).to.have.lengthOf(1);
		expect(events[0].args.stealthAddress).to.equal(addr);
	});

	it("works with zero-length metadata", async function () {
		const tx = await announcer.announce(
			SCHEME_SECP256K1,
			STEALTH_ADDRESS,
			EPHEMERAL_PUB_KEY,
			VIEW_TAG,
			"0x", // empty metadata
		);

		// Just the viewTag byte, no extra metadata
		const expectedMetadata = VIEW_TAG;

		await expect(tx)
			.to.emit(announcer, "Announcement")
			.withArgs(
				SCHEME_SECP256K1,
				STEALTH_ADDRESS,
				await caller1.getAddress(),
				EPHEMERAL_PUB_KEY,
				expectedMetadata,
			);
	});
});
