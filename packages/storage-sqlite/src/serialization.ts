/**
 * BigInt-safe JSON serialization.
 *
 * Standard JSON.stringify throws on bigint values. These helpers use a
 * tagged-object convention: bigint values are encoded as `{ "$bigint": "123" }`
 * on write and reconstructed on read.
 */

export function serializeBigIntFields(obj: unknown): string {
	return JSON.stringify(obj, (_key, value) =>
		typeof value === "bigint" ? { $bigint: value.toString() } : value,
	);
}

export function deserializeBigIntFields(json: string): unknown {
	return JSON.parse(json, (_key, value) =>
		value && typeof value === "object" && "$bigint" in value
			? BigInt(value.$bigint as string)
			: value,
	);
}
