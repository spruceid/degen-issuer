// Given a wallet, a category, and a list of types, returns a status map
export const createStatusMapEntry = (
	cache,
	wallet,
	credentialCategory,
	credentialTypeList
) => {
	let statusMapEntry = {};

	for (let i = 0, n = credentialTypeList.length; i < n; i++) {
		let credentialType = credentialTypeList[i];
		let cached = hasCredentialType(
			cache,
			wallet,
			credentialCategory,
			credentialType
		);

		statusMapEntry[credentialType] = {
			cached: cached,
			qualified: cached,
			qualified_check: false,
			qualified_proof: false,
			qualified_err: "",
		};
	}

	return statusMapEntry;
};

export const hasCredentialType = (
	cache,
	wallet,
	credentialCategory,
	credentialType
) => {
	if (!hasCredentials(cache, wallet, credentialCategory)) {
		return false;
	}

	return !!cache[wallet][credentialCategory][credentialType];
};

export const hasCredentials = (cache, wallet, credentialCategory) => {
	let isObject = cache && typeof cache === "object";
	if (!isObject) {
		return false;
	}

	let hasWallet = cache[wallet];
	if (!hasWallet) {
		return false;
	}

	let hasCredentialType = hasWallet[credentialCategory];

	return !!hasCredentialType;
};
