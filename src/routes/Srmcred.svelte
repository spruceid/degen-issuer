<script>
	import { onMount } from "svelte";
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import QualifiedCredentialButton from "../components/QualifiedCredentialButton.svelte";
	import {
		solanaLiveAddress,
		solanaWallet,
		vcLocalStorageKey,
	} from "../store.js";
	import {
		PublicKey,
		Transaction,
		TransactionInstruction,
	} from "@solana/web3.js";

	import { createStatusMapEntry } from "../qualificationStatus.js";
	import loadDIDKit from "../DIDKit.js";
	import * as polyfill from "credential-handler-polyfill";
	import { v4 as uuid } from "uuid";
	import base64url from "base64url";
	import { Buffer } from "buffer";

	// TODO: Move all this to qualificationsStatus.js
	const secondsPerDay = 86400;
	const makeDaysBack = (daysBack) => {
		return Math.floor(Date.now() / 1000) - daysBack * secondsPerDay;
	};

	// Nonsense block for signing
	const ZERO32_B58 = "11111111111111111111111111111111";

	$: errorMessage = "";
	$: currentAddress = "";
	/*
		 TODO: make into ts type decl as rather than long comment.
        An object with eth addresses as keys and this object as values:
        {
            "<address>": {
                live: boolean,
				loading: boolean,
                status: {
                    activity: {
						cached: boolean,
						qualified: boolean,
						qualified_check: boolean,
						qualified_proof: boolean | JSON for credential,
						qualified_err: string
					},
                    liquidity: { ... },
                }
            }
        }
    */
	$: serumVCStatusMap = {};

	const solanaApiUrl = "https://api.mainnet-beta.solana.com";
	const testAddr = "7ofyLrGAkKWef7vSgXVBvxvYhhQad32NNhuz7ubRW4hi";

	// TODO: use this to sign.
	let wallet = false;
	solanaWallet.subscribe((w) => {
		wallet = w;
	});

	$: cachedCredentialMap = {};

	const serumStatusMapEntry = (cache, address) => {
		let s = createStatusMapEntry(cache, address, "serum", [
			"activity",
			"liquidity",
		]);
		return s;
	};

	const checkQualificaions = async (addr) => {
		let entry = serumVCStatusMap[addr];

		serumVCStatusMap[addr] = entry;
		serumVCStatusMap = serumVCStatusMap;

		let daysBack = 30,
			minTrades = 5,
			minSol = 1;

		let [success, outcome] = await getQualifications(
			addr,
			daysBack,
			minTrades,
			minSol
		);

		if (!success) {
			errorMessage = outcome;
			serumVCStatusMap = statusMap;
			return;
		}

		let { liquidity, activity } = outcome;

		Object.assign(entry.status.activity, activity);
		Object.assign(entry.status.liquidity, liquidity);

		entry.status.activity.qualified_check = true;
		entry.status.liquidity.qualified_check = true;

		entry.loading = false;

		serumVCStatusMap[addr] = entry;
		serumVCStatusMap = serumVCStatusMap;
	};

	const getQualifications = async (addr, daysBack, minTrades, minSol) => {
		let activity = {
			qualified: false,
			qualified_proof: false,
			qualified_err: "Not enough trade activity found",
		};

		let activityBody = makeActivityReqBody(addr);
		try {
			let activityRes = await fetch(solanaApiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: activityBody,
			});

			if (!activityRes.ok || !activityRes.status === 200) {
				throw `bad status`;
			}

			let activityJSON = await activityRes.json();
			if (!activityJSON.result || !Array.isArray(activityJSON.result)) {
				throw `bad format`;
			}

			let { result } = activityJSON;
			let thirtyDaysBack = makeDaysBack(daysBack);
			let activityArr = [];

			for (let i = 0, n = result.length; i < n; i++) {
				let transaction = result[i];
				if (!transaction.err && transaction.blockTime > thirtyDaysBack) {
					activityArr.push(transaction);
					if (activityArr.length > minTrades) {
						activity.qualified = true;
						activity.qualified_proof = activityArr;
						activity.qualified_err = "";
						break;
					}
				}
			}
		} catch (err) {
			activity.qualified_err = `Failed in API request: ${err}`;
		}

		let liquidity = {
			qualified: false,
			qualified_proof: false,
			qualified_err: "No active staking event found",
		};

		let liquidityBody = makeLiquidityReqBody(addr);
		try {
			let liquidityRes = await fetch(solanaApiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: liquidityBody,
			});
			if (!liquidityRes.ok || !liquidityRes.status === 200) {
				throw `bad status`;
			}

			let liquidityJSON = await liquidityRes.json();
			if (!liquidityJSON?.result?.state) {
				throw `bad format`;
			}

			if (liquidityJSON.result.state === "active") {
				liquidity.qualified = true;
				liquidity.qualified_proof = liquidityJSON.result;
				liquidity.qualified_err = "";
			}
		} catch (err) {
			liquidity.qualified_err = `Failed in API request: ${err}`;
		}

		return [
			true,
			{
				activity: activity,
				liquidity: liquidity,
			},
		];
	};

	const makeActivityReqBody = (addr) => {
		let reqBody = {
			// TODO: gen id randomly...?
			id: 111,
			jsonrpc: "2.0",
			method: "getConfirmedSignaturesForAddress2",
			params: [addr],
		};
		return JSON.stringify(reqBody);
	};

	const makeLiquidityReqBody = (addr) => {
		let reqBody = {
			// TODO: gen id randomly...?
			id: 111,
			jsonrpc: "2.0",
			method: "getStakeActivation",
			params: [addr, { commitment: "finalized" }],
		};
		return JSON.stringify(reqBody);
	};

	const cacheVC = async (solanaAddr, vcKey) => {
		try {
			const DIDKit = await loadDIDKit();
		} catch (err) {
			errorMessage = `Error creating ${err} credential`;
			return;
		}

		let targetWalletStatus = serumVCStatusMap[solanaAddr]?.status;
		if (!targetWalletStatus) {
			errorMessage = `Error creating ${vcKey} credential`;
			return;
		}

		let vcEntry = targetWalletStatus[vcKey];
		if (!targetWalletStatus) {
			errorMessage = `Error creating ${vcKey} credential`;
			return;
		}

		let subj = vcEntry.qualified_proof;

		let cred;
		switch (vcKey) {
			case "activity":
				cred = makeActivityVC(solanaAddr, subj);
				break;
			case "liquidity":
				cred = makeLiquidityVC(solanaAddr, subj);
				break;
			default:
				errorMessage = `Unknown verified credential type: ${vcKey}`;
				return;
		}

		const proofOptions = {
			verificationMethod: "did:sol:" + solanaAddr + "#SolanaMethod2021",
			proofPurpose: "assertionMethod",
		};
		const keyType = { kty: "OKP", alg: "EdDSA", crv: "ed25519", x: "" };

		let credString = JSON.stringify(cred);
		let prepString = await DIDKit.prepareIssueCredential(
			credString,
			JSON.stringify(proofOptions),
			JSON.stringify(keyType)
		);

		let preparation = JSON.parse(prepString);

		const signingInput = preparation.signingInput;

		let transaction = new Transaction({
			recentBlockhash: ZERO32_B58,
			feePayer: new PublicKey(currentAddress),
		});

		let transactionInstruction = new TransactionInstruction({
			programId: currentAddress,
			data: signingInput,
		});
		transaction.add(transactionInstruction);

		let res = await wallet.signTransaction(transaction);
		if (
			!res.signatures ||
			!res.signatures.length > 0 ||
			!res.signatures[0].signature
		) {
			throw Error("No signatures on transaction found");
		}
		let sigBytes = res.signatures[0].signature;
		let signature = base64url.encode(Buffer.from(sigBytes));

		let vcString = await DIDKit.completeIssueCredential(
			credString,
			prepString,
			signature
		);

		if (!cachedCredentialMap[solanaAddr]) {
			cachedCredentialMap[solanaAddr] = { serum: {} };
		}

		cachedCredentialMap[solanaAddr].serum[vcKey] = JSON.parse(vcString);
		localStorage.setItem(
			vcLocalStorageKey,
			JSON.stringify(cachedCredentialMap)
		);

		// Force UI Update
		let tempSerumMap = serumVCStatusMap;
		tempSerumMap[solanaAddr].status[vcKey].cached = true;
		serumVCStatusMap = tempSerumMap;
		cachedCredentialMap = JSON.parse(localStorage.getItem(vcLocalStorageKey));
	};

	const makeActivityVC = (solanaAddr, subject) => {
		let context = [
			"https://www.w3.org/2018/credentials/v1",
			{
				SerumActivityVerification: {
					"@id":
						"https://docs.solana.com/developing/clients/jsonrpc-api#gettransactioncount",
					"@context": {
						activity: {
							"@id":
								"https://docs.solana.com/developing/clients/jsonrpc-api#gettransactioncount",
							"@type": "@json",
						},
					},
				},
			},
		];
		let vc = makeSolVC(solanaAddr, context);
		vc.evidence = [
			{
				type: ["SerumActivityVerification"],
				activity: subject,
			},
		];

		return vc;
	};

	const makeLiquidityVC = (solanaAddr, subject) => {
		let context = [
			"https://www.w3.org/2018/credentials/v1",
			{
				SerumLiquidityVerification: {
					"@id":
						"https://docs.solana.com/developing/clients/jsonrpc-api#getstakeactivation",
					"@context": {
						activity: {
							"@id":
								"https://docs.solana.com/developing/clients/jsonrpc-api#getstakeactivation",
							"@type": "@json",
						},
					},
				},
			},
		];
		let vc = makeSolVC(solanaAddr, context);
		vc.evidence = [
			{
				type: ["SerumLiquidityVerification"],
				activity: subject,
			},
		];

		return vc;
	};

	const makeSolVC = (solanaAddr, context) => {
		return {
			"@context": context,
			id: "urn:uuid:" + uuid(),
			issuer: "did:sol:" + solanaAddr,
			issuanceDate: new Date().toISOString(),
			type: ["VerifiableCredential"],
			credentialSubject: {
				id: "did:sol:" + solanaAddr,
			},
		};
	};

	onMount(async () => {
		// Catch uninitilized states here:
		if (!Object.keys(cachedCredentialMap).length) {
			let vcc = localStorage.getItem(vcLocalStorageKey);
			if (!vcc) {
				vcc = {};
				localStorage.setItem(vcLocalStorageKey, JSON.stringify(vcc));
			} else {
				vcc = JSON.parse(vcc);
			}

			cachedCredentialMap = vcc;
		}

		let cachedAddrs = Object.keys(cachedCredentialMap);
		let statusMap = {};

		for (let i = 0, n = cachedAddrs.length; i < n; i++) {
			let addr = cachedAddrs[i];
			let status = serumStatusMapEntry(cachedCredentialMap, addr);
			statusMap[addr] = {
				live: false,
				loading: false,
				status: status,
			};
		}

		if ($solanaLiveAddress) {
			let entry = statusMap[$solanaLiveAddress];
			if (entry) {
				entry.live = true;
			} else {
				let status = serumStatusMapEntry(
					cachedCredentialMap,
					$solanaLiveAddress
				);
				entry = {
					live: true,
					// loading: true,
					loading: false,
					status: status,
				};
			}

			statusMap[$solanaLiveAddress] = entry;
		}


		serumVCStatusMap = statusMap;
	});
</script>

<BaseLayout title="Serum Credentials" icon="/serum.svg">
	{#if !$solanaLiveAddress}
		<SecondaryButton label="Sign in" href="/Solcontrol" icon="/solana.svg" />
	{/if}
	<p><label for="currentAddress">Choose An Address</label></p>
	<!-- svelte-ignore a11y-no-onchange -->
	<select
		class="text-white p-4 text-left rounded-2xl max-w-sm mx-auto flex items-center h-16 w-full bg-blue-998 border-2 border-blue-997 mb-6"
		bind:value={currentAddress}
		on:change={() => {
			let entry = serumVCStatusMap[currentAddress];
			if (!entry) {
				// TODO: err out here.
				return;
			}

			if (
				!entry.status.activity.qualified_check ||
				!entry.status.liquidity.qualified_check
			) {
				checkQualificaions(currentAddress, entry.live);
			}

		}}
		name="currentAddress"
	>
		<option value="">No Address Selected</option>
		{#each Object.keys(serumVCStatusMap) as addr}
			{#if serumVCStatusMap[addr]?.live}
				<option value={addr}>{addr}</option>
			{:else}
				<option value={addr}
					>{addr} (Not Connected {addr === testAddr
						? "test address"
						: ""})</option
				>
			{/if}
		{/each}
	</select>

	{#if currentAddress}
		{#if serumVCStatusMap[currentAddress].loading}
			<p style="color:white">Updating...</p>
		{:else}
			<QualifiedCredentialButton
				credentialKey="activity"
				credentialTitle="Trade Activity"
				statusEntry={serumVCStatusMap[currentAddress]}
				cachedWalletCategory={cachedCredentialMap[currentAddress]
					? cachedCredentialMap[currentAddress]?.serum
					: false}
				createFunc={() => {
					cacheVC(currentAddress, "activity");
				}}
			/>

			<QualifiedCredentialButton
				credentialKey="liquidity"
				credentialTitle="Stake"
				statusEntry={serumVCStatusMap[currentAddress]}
				cachedWalletCategory={cachedCredentialMap[currentAddress]
					? cachedCredentialMap[currentAddress]?.serum
					: false}
				createFunc={() => {
					cacheVC(currentAddress, "liquidity");
				}}
			/>
		{/if}
	{/if}
</BaseLayout>
