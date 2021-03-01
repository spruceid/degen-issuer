import { request, gql } from "graphql-request";
import { v4 as uuid } from "uuid";

/* Uniswap Graph API */

// TODO: Change from hard-coded values to a system that takes a list of
// Qualifications, makes the largest query needed, then checks all qualifications
export const getQualifications = async (wallet, daysBack, minTrades, minEth) => {
	let [success, result] = await sendActivityQuery(wallet, daysBack);
	if (!success) {
		return [success, result];
	}

	let hasTransactions = result.transactions && Array.isArray(result.transactions);
	if (!hasTransactions) {
		return [false, "Failed to reach uniswap API"];
	}

	let { transactions } = result;
	let qualifiedTrades = [];
	let qualifiedLP = false;

	let lpResult = {
		qualified: false,
		qualified_proof: false,
		qualified_err: "No qualifying Liquidity Event"
	};

	let tradeEventsResult = {
		qualified: false,
		qualified_proof: false,
		qualified_err: "Not enough qualifying Transaction Events"
	};

	// !NOTE:
	// If revoking, consider grabbing most recent transactions for credentialing
	for (let i = 0, n = transactions.length; i < n; i++) {
		let transaction = transactions[i];
		if (!qualifiedLP && isQualifyingLPEvent(transaction, minEth)) {
			qualifiedLP = transaction;

			lpResult.qualified = true;
			lpResult.qualified_proof = qualifiedLP;
			lpResult.qualified_err = "";
		}

		if (qualifiedTrades.length < minTrades && isQualifyingTradeEvent(transaction)) {
			qualifiedTrades.push(transaction);
			if (qualifiedTrades.length >= minTrades) {
				tradeEventsResult.qualified = true;
				tradeEventsResult.qualified_proof = qualifiedTrades;
				tradeEventsResult.qualified_err = "";
			}
		}

		if (qualifiedLP && qualifiedTrades.length >= minTrades) {
			break;
		}
	}

	let outcome = {
		liquidity: lpResult,
		activity: tradeEventsResult,
		transactions: transactions,
	};

	return [true, outcome];
};

const isQualifyingTradeEvent = (transaction) => {
	let hasEthPurchase = transaction.ethPurchaseEvents && Array.isArray(transaction.ethPurchaseEvents) && transaction.ethPurchaseEvents.length > 0;
	let hasTokenPurchase = transaction.tokenPurchaseEvents && Array.isArray(transaction.tokenPurchaseEvents) && transaction.tokenPurchaseEvents.length > 0;

	return hasEthPurchase || hasTokenPurchase;
};

const isQualifyingLPEvent = (transaction, minEth) => {
	let hasLiquidityEvents = transaction.addLiquidityEvents && Array.isArray(transaction.addLiquidityEvents) && transaction.addLiquidityEvents.length;
	if (!hasLiquidityEvents) {
		return false;
	}

	for (let i = 0, n = transaction.addLiquidityEvents.length; i < n; i++) {
		let lq = transaction.addLiquidityEvents[i];
		if (lq.ethAmount && typeof lq.ethAmount === "number" && lq.ethAmount >= minEth) {
			return true;
		}
	}

	return false;
};

const uniswapAPIEndpoint =
	"https://api.thegraph.com/subgraphs/name/graphprotocol/uniswap";


const uniswapQuery = gql`
		query getTransactions($wallet: String!, $daysBack: Int!) {
			transactions(where: {user: $wallet, timestamp_gt: $daysBack}) {
				id
				user
				timestamp
				addLiquidityEvents {
					id
					ethAmount
				}
				tokenPurchaseEvents {
					id
				}
				ethPurchaseEvents {
					id
				}
		}
	}`;

const secondsPerDay = 86400;
const makeDaysBack = (daysBack) => {
	return Math.floor(Date.now() / 1000) - daysBack * secondsPerDay;
};

const sendActivityQuery = async (wallet, daysBack) => {
	let queryArgs = {
		wallet: wallet,
	};

	try {
		if (daysBack && typeof daysBack === "number" && daysBack > 0) {
			queryArgs.daysBack = makeDaysBack(daysBack);
		} else {
			throw "No days back unimplemented";
		}

		let result = await request(uniswapAPIEndpoint, uniswapQuery, queryArgs);
		return [true, result];
	} catch (_err) {
		let errMsg = "Failed to reach uniswap API";
		return [false, errMsg];
	}
};

/* Sybil */
const uniswapSybilListURL = "https://raw.githubusercontent.com/Uniswap/sybil-list/master/verified.json";

// Currently uses Uniswap's list.
// Could change to a method that directory queries twitter from tweetID.
export const sybilVerifyRequest = async (wallet) => {
	try {
		let res = await fetch(
			uniswapSybilListURL
		);

		if (!res.ok || res.status !== 200) {
			throw "Bad response from Sybil List";
		}

		let json = await res.json();
		if (!json || typeof json !== "object") {
			throw "Bad response from Sybil List";
		}

		let entry = json[wallet];
		if (!isValidSybilEntry(entry)) {
			throw "Valid entry not found in Sybil List";
		}

		return [true, entry];
	} catch (err) {
		// TODO: Be more vague?
		return [false, err];
	}
};

const isValidSybilEntry = (entry) => {
	let isObject = entry && typeof entry === "object";
	if (!isObject) {
		return false;
	}

	let hasTwitterEntry =
		entry.twitter && typeof entry.twitter === "object";
	if (!hasTwitterEntry) {
		return false;
	}

	let { twitter } = entry;

	let hasTimestamp =
		twitter.timestamp && typeof twitter.timestamp === "number";
	let hasTweetID = twitter.tweetID && typeof twitter.tweetID === "string";
	let hasHandle = twitter.handle && typeof twitter.handle === "string";

	return hasTimestamp && hasTweetID && hasHandle;
};

export const makeActivityVC = (wallet, subject) => {
	let context = [
		"https://www.w3.org/2018/credentials/v1",
		{
			"UniswapActivityVerification": {
				"@id": "https://uniswap.org/docs/v2/API/queries",
				"@context": {
					"activity": {
						"@id": "https://uniswap.org/docs/v2/API/queries",
						"@type": "@json"
					}
				}
			}
		}
	];
	let vc = makeEthVC(wallet, context);
	vc.evidence = [
		{
			"type": ["UniswapActivityVerification"],
			"sybil": subject
		}
	];

	return vc;
};

export const makeLiquidityVC = (wallet, subject) => {
	let context = [
		"https://www.w3.org/2018/credentials/v1",
		{
			"UniswapLiquidityVerification": {
				"@id": "https://uniswap.org/docs/v2/API/queries",
				"@context": {
					"activity": {
						"@id": "https://uniswap.org/docs/v2/API/queries",
						"@type": "@json"
					}
				}
			}
		}
	];

	let vc = makeEthVC(wallet, context);
	vc.evidence = [
		{
			"type": ["UniswapLiquidityVerification"],
			"sybil": subject
		}
	];

	return vc;
};

export const makeSybilVC = (wallet, subject) => {
	let context = [
		"https://www.w3.org/2018/credentials/v1",
		{
			"sameAs": "https://www.w3.org/TR/owl-ref/#sameAs-def",
			"UniswapSybilVerification": {
				"@id": "https://github.com/Uniswap/sybil-list#verifying-an-identity",
				"@context": {
					"sybil": {
						"@id": "https://github.com/Uniswap/sybil-list#schema",
						"@type": "@json"
					}
				}
			}
		}
	];
	let sameAs = `https://twitter.com/i/web/status/${subject.twitter.tweetID}`;
	let vc = makeEthVC(wallet, context);
	vc.evidence = [
		{
			"type": ["UniswapSybilVerification"],
			"sybil": subject
		}
	];
	vc.credentialSubject.sameAs = sameAs;
	return vc;
};

export const makeEthVC = (wallet, context) => {
	return {
		"@context": context,
		id: "urn:uuid:" + uuid(),
		issuer: "did:ethr:" + wallet,
		issuanceDate: new Date().toISOString(),
		type: ["VerifiableCredential"],
		credentialSubject: {
			id: "did:ethr:" + wallet,
		},
	};

};
