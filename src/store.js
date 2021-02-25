import { writable } from "svelte/store";

// App-Wide access to the solanaWallet set in the SolanaController
export const solanaWallet = writable(false);

/*
	TODO: Make ts type decl rather than lengthy comment.
	The local storage representation of credentials.
	For now, looks like:
{
	"<wallet_address>": {
		"uniswap": {
			// TODO: Define.
			"activity": {...},
			"liquidity": {...},
			"sybil": {
				// A VC composed of a DID representation of Uniswap's sybil list.
				// TODO: Nail down.
			},
		},
		"serum": {
			"activity": {...},
			"liquidity": {...}
		},
		"<credential_provider>": {
			...
		},
		...
	}
}
*/
export const cachedVCs = writable({});
export const solanaLiveAddress = writable("");

export const vcLocalStorageKey = "degenissuer_verified_credentials";
