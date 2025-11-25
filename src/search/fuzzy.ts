export interface Match {
	score: number;
	indices: number[];
}

export interface ScoredItem<T> {
	item: T;
	score: number;
	indices: number[];
}

/**
 * Fuzzy match a query against a target string
 * Returns null if no match, or a Match object with score and matched indices
 */
export function fuzzyMatch(query: string, target: string): Match | null {
	if (!query) return { score: 0, indices: [] };

	const q = query.toLowerCase();
	const t = target.toLowerCase();

	let score = 0;
	let targetIndex = 0;
	const indices: number[] = [];

	// Try to match all characters in sequence
	for (let i = 0; i < q.length; i++) {
		const char = q[i];
		if (!char) continue;

		const found = t.indexOf(char, targetIndex);

		if (found === -1) {
			return null; // No match if any character missing
		}

		indices.push(found);
		targetIndex = found + 1;

		// Base score: 1 point per match
		score += 1;

		// Bonus: consecutive match
		if (i > 0 && found === indices[i - 1]! + 1) {
			score += 3;
		}

		// Bonus: word boundary (after space, dash, underscore, or start)
		const prevChar = t[found - 1];
		if (found === 0 || (prevChar && [" ", "-", "_", "/"].includes(prevChar))) {
			score += 5;
		}

		// Bonus: start of string
		if (found === 0) {
			score += 10;
		}
	}

	// Penalty: length difference (prefer shorter matches)
	score -= (t.length - q.length) * 0.1;

	return { score, indices };
}

/**
 * Rank a list of items by fuzzy matching against a query
 * Returns sorted array of ScoredItem objects
 */
export function rankMatches<T>(
	query: string,
	items: T[],
	getSearchString: (item: T) => string,
	weight = 1.0,
): ScoredItem<T>[] {
	const scored: ScoredItem<T>[] = [];

	for (const item of items) {
		const target = getSearchString(item);
		const match = fuzzyMatch(query, target);

		if (match) {
			scored.push({
				item,
				score: match.score * weight,
				indices: match.indices,
			});
		}
	}

	// Sort by score descending
	scored.sort((a, b) => b.score - a.score);

	return scored;
}
