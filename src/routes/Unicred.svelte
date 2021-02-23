<script>
    import BaseLayout from "../components/BaseLayout.svelte";
    import Input from "../components/Input.svelte";
    import SecondaryButton from "../components/SecondaryButton.svelte";

	import {
		createSybilVC,
		getQualifications,
		sybilVerifyRequest,
	} from "../uniswap";

	import QualifiedCredentialButton from "../components/QualifiedCredentialButton.svelte";

	// Assume top level passes a ethereum object with
	// a provider which has one or more wallets.
	export let ethereum;

	// TODO: Have lists of thresholds passed down for modular VC qualifications.
	// Adjust uniswap.js to match.

	/*
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
                "<credential_provider>": {
                    ...
                },
                ...
            }
        }
    */
	$: cachedCredentialMap = {};

	// currentAddress is the focus of the UI
	$: currentAddress = "";

	// UI error message.
	$: errorMessage = "";

	$: loading = false;

	/*
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
                    sybil: { ... },
                }
            }
        }
    */
	$: uniswapVCStatusMap = {};

	// An object with eth addresses as keys and array of GraphQL transactions
	// as values.
	// TODO: Cache in local storage?
	$: uniswapTradeHistoryMap = {};

	// Get auto complete help when using local storage.
	const vcLocalStorageKey = "degenissuer_verified_credentials";

	// Lifecycle
	const onLoad = async () => {
		// object of cached Uniswap Sybil credentials
		let cache;
		// JSON String of cache, or null
		let cachedStr = localStorage.getItem(vcLocalStorageKey);

		// On first load, or after clearing of storage.
		if (!cachedStr) {
			cache = {};
			localStorage.setItem(vcLocalStorageKey, JSON.stringify(cache));
		} else {
			cache = JSON.parse(cachedStr);
		}

		// Connected accounts vs...
		let liveAccounts = await getConnectedWallets();
		// ...cached accounts as an array
		let cachedAccounts = Object.keys(cache);
		// to be assigned to uniswapVCStatusMap after processing
		let statusMap = {};

		// TODO: Test if accounts are unlocked, then differentiate in the UI.
		for (let i = 0, x = liveAccounts.length; i < x; i++) {
			let wallet = liveAccounts[i];
			let status = uniswapStatusMapEntry(cache, wallet);

			statusMap[wallet] = {
				live: true,
				status: status,
			};
		}

		for (let i = 0, x = cachedAccounts.length; i < x; i++) {
			let wallet = cachedAccounts[i];
			if (!statusMap[wallet]) {
				let status = uniswapStatusMapEntry(cache, wallet);

				statusMap[wallet] = {
					live: false,
					status: status,
				};
			}
		}

		// force the UI update.
		cachedCredentialMap = cached;
		uniswapVCStatusMap = statusMap;

		if (!liveAccounts.length) {
			errorMessage = "No connected Ethereum accounts currently detected";
		}
	};

	// cache operations
	// Given a wallet, a category, and a list of types, returns a status map
	const createStatusMapEntry = (
		cache,
		wallet,
		credentialCategory,
		credentialTypeList
	) => {
		let statusMapEntry = {};

		for (let i = 0, n = credentialTypeList; i < n; i++) {
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

	const hasCredentialType = (
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

	const hasCredentials = (cache, wallet, credentialCategory) => {
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

	const uniswapStatusMapEntry = (cache, wallet) => {
		return createStatusMapEntry(cache, wallet, "uniswap", [
			"activity",
			"liquidity",
			"sybil",
		]);
	};

	// Ethereum Account Interactions
	const getConnectedWallets = async () => {
		try {
			let wallets = await ethereum.request({ method: "eth_requestAccounts" });
			return wallets;
		} catch (err) {
			// TODO: Handle this better?
			console.error(err);
			return [];
		}
	};

	// VC interactions
	const checkQualifications = async (wallet) => {
		let entry = uniswapVCStatusMap[wallet];
		if (!entry) {
			errorMessage = `Could not find wallet ${wallet} in StatusMap`;
			return;
		}

		entry.loading = true;

		// Force UI Change.
		uniswapVCStatusMap[wallet] = entry;
		uniswapVCStatusMap = uniswapVCStatusMap;

		if (!entry.status.sybil.cached && !entry.status.sybil.qualified_check) {
			// TODO: exchange for qualified proof here.
			let [success, sybilResult] = await sybilVerifyRequest(wallet);
			entry.status.sybil.qualified_check = true;
			if (success) {
				entry.status.sybil.qualified = true;
				entry.status.sybil.qualified_proof = sybilResult;
			} else {
				entry.status.sybil.qualified_err = sybilResult;
			}
		}

		let needsActiveTrades =
			!entry.status.activity.cached && !entry.status.activity.qualified_check;
		let needsLiquidity =
			!entry.status.liquidity.cached && !entry.status.liquidity.qualified_check;

		if (needsActiveTrades || needsLiquidity) {
			let daysBack = 30,
				minTrades = 5,
				minEth = 1;

			let [success, result] = await getQualifications(
				wallet,
				daysBack,
				minTrades,
				minEth
			);

			entry.status.activity.qualified_check = true;
			entry.status.liquidity.qualified_check = true;

			if (success) {
				let { activity, liquidity, transactions } = result;

				uniswapTradeHistoryMap[wallet] = result;

				entry.status.activity.qualified = activity.qualified;
				entry.status.activity.qualified_proof = activity.qualified_proof;
				entry.status.activity.qualified_err = activity.qualified_err;

				entry.status.liquidity.qualified = liquidity.qualified;
				entry.status.liquidity.qualified_proof = liquidity.qualified_proof;
				entry.status.liquidity.qualified_err = liquidity.qualified_err;
			} else {
				entry.status.activity.qualified_err = result;
				entry.status.liquidity.qualified_err = result;
			}
		}

		entry.loading = false;

		// Force UI Change.
		uniswapVCStatusMap[wallet] = entry;
		uniswapVCStatusMap = uniswapVCStatusMap;
	};

	const issueSybilVC = async (wallet) => {
		if (!wallet || typeof wallet !== "string") {
			errorMessage = `App State Error, called without wallet`;
			return;
		}

		loading = true;

		// make signing function block and have predictable fail state.
		const signingFn = async (data) => {
			console.log("Here!");
			try {
				let result = await web3.eth.sign(data, wallet);
				return [true, result];
			} catch (err) {
				console.log("Here?");
				return [false, err];
			}
		};

		// retrieve the Sybil list from the network, find the entry
		// in the sybil list, hopefully.
		let [success, vc] = await createSybilVC(wallet, signingFn);
		if (!success) {
			errorMessage = vc;
			loading = false;
			return;
		}

		if (!cachedCredentialMap[wallet]) {
			cachedCredentialMap[wallet] = {};
			cachedCredentialMap[wallet].uniswap = {};
		} else if (!hasCredentials(cachedCredentialMap, wallet, "uniswap")) {
			cachedCredentialMap[wallet].uniswap = {};
		}

		cachedCredentialMap[wallet].uniswap.sybil = vc;

		// Save the update to the cache
		localStorage.setItem(
			vcLocalStorageKey,
			JSON.stringify(cachedCredentialMap)
		);

		// force UI update
		let tempUniswapMap = uniswapVCStatusMap;
		tempUniswapMap[wallet].uniswap.sybil.cached = true;
		uniswapVCStatusMap = tempUniswapMap;
		cachedCredentialMap = JSON.parse(localStorage.getItem(vcLocalStorageKey));
	};

	// TODO: REMOVE, UI Debub mocks:
	const debugUIData = () => {
		let rActive = Math.random() < 0.5;
		let rLiquid = Math.random() < 0.5;
		let rSybil = Math.random() < 0.5;

		let dummyCache = {
			live_all_verified: {
				live: true,
				loading: false,
				status: {
					activity: {
						cached: true,
						qualified: true,
						qualified_check: false,
					},
					liquidity: {
						cached: true,
						qualified: true,
						qualified_check: false,
					},
					sybil: {
						cached: true,
						qualified: true,
						qualified_check: false,
					},
				},
			},
			live_none_verified: {
				live: true,
				loading: false,
				status: {
					activity: {
						cached: false,
						qualified: true,
						qualified_check: false,
					},
					liquidity: {
						cached: false,
						qualified: true,
						qualified_check: false,
					},
					sybil: {
						cached: false,
						qualified: true,
						qualified_check: false,
					},
				},
			},
			live_random: {
				live: true,
				loading: false,
				status: {
					activity: {
						cached: rActive,
						qualified: true,
						qualified_check: false,
					},
					liquidity: {
						cached: rLiquid,
						qualified: true,
						qualified_check: false,
					},
					sybil: {
						cached: rSybil,
						qualified: true,
						qualified_check: false,
					},
				},
			},
			cached_all_verified: {
				live: false,
				loading: false,
				status: {
					activity: {
						cached: true,
						qualified: true,
						qualified_check: false,
					},
					liquidity: {
						cached: true,
						qualified: true,
						qualified_check: false,
					},
					sybil: {
						cached: true,
						qualified: true,
						qualified_check: false,
					},
				},
			},
			cached_none_verified: {
				live: false,
				loading: false,
				status: {
					activity: {
						cached: false,
						qualified: true,
						qualified_check: false,
					},
					liquidity: {
						cached: false,
						qualified: true,
						qualified_check: false,
					},
					sybil: {
						cached: false,
						qualified: true,
						qualified_check: false,
					},
				},
			},

			cached_random: {
				live: false,
				loading: false,
				status: {
					activity: {
						cached: rActive,
						qualified: true,
						qualified_check: false,
					},
					liquidity: {
						cached: rLiquid,
						qualified: true,
						qualified_check: false,
					},
					sybil: {
						cached: rSybil,
						qualified: true,
						qualified_check: false,
					},
				},
			},

			"0x8d07D225a769b7Af3A923481E1FdF49180e6A265": {
				live: true,
				loading: false,
				status: {
					activity: {
						cached: false,
						qualified: false,
						qualified_check: false,
						qualified_proof: false,
						qualified_err: "",
					},
					liquidity: {
						cached: false,
						qualified: false,
						qualified_check: false,
						qualified_proof: false,
						qualified_err: "",
					},
					sybil: {
						cached: false,
						qualified: false,
						qualified_check: false,
						qualified_proof: false,
						qualified_err: "",
					},
				},
			},

			"0x0000000000000eb4ec62758aae93400b3e5f7f18": {
				live: true,
				loading: false,
				status: {
					activity: {
						cached: false,
						qualified: false,
						qualified_check: false,
						qualified_proof: false,
						qualified_err: "",
					},
					liquidity: {
						cached: false,
						qualified: false,
						qualified_check: false,
						qualified_proof: false,
						qualified_err: "",
					},
					sybil: {
						cached: false,
						qualified: false,
						qualified_check: false,
						qualified_proof: false,
						qualified_err: "",
					},
				},
			},
		};

		uniswapVCStatusMap = dummyCache;
		console.log(uniswapVCStatusMap);
	};
</script>

<h2>Uniswap Credentials</h2>
<main>
	{#if errorMessage}
		<div class="error-container">
			<p style="color:red">{errorMessage}</p>
		</div>
	{/if}
	<!-- TODO: REMOVE THIS AS DEBUG  -->
	<div>
		<p style="color:red">Debug Mock Data</p>
		<button
			on:click={() => {
				console.log("IN ON CLICK");
				debugUIData();
			}}>Start Debug</button
		>
	</div>
	<!-- TODO: On blur, test for qualifications. -->
	<div>
		<label for="currentAddress">Choose An Address</label>
		<select
			bind:value={currentAddress}
			on:change={() => {
				console.log("Look up qualifications here");
				checkQualifications(currentAddress);
			}}
			name="currentAddress"
		>
			<option value="">No Address Selected</option>
			{#each Object.keys(uniswapVCStatusMap) as wallet}
				{#if uniswapVCStatusMap[wallet].live}
					<option value={wallet}>{wallet}</option>
				{:else}
					<option value={wallet}>{wallet} (Not Connected)</option>
				{/if}
			{/each}
		</select>
	</div>
	{#if currentAddress}
		{#if loading || uniswapVCStatusMap[currentAddress].loading}
			<p style="color:white">Updating...</p>
		{:else}
			<!-- TODO ITER OVER STATUS TO CHANGE BUTTON STATE.-->
			<div class="btn-group">
				<button
					on:click={() => {
						// TODO: IMPLEMENT
						alert("Turn into Link");
					}}>Show 30-Day Trade History</button
				>
				<button
					on:click={() => {
						// TODO: IMPLEMENT
						alert("Turn into Link");
					}}>Show 30-Day LP History</button
				>

				<QualifiedCredentialButton
					credentialKey="activity"
					credentialTitle="Trade Activity"
					statusEntry={uniswapVCStatusMap[currentAddress]}
					issueFunc={() => {
						alert("Implement Activity Issue Func");
					}}
					createFunc={() => {
						alert("Implement Activity Create Func");
					}}
				/>

				<QualifiedCredentialButton
					credentialKey="liquidity"
					credentialTitle="LP"
					statusEntry={uniswapVCStatusMap[currentAddress]}
					issueFunc={() => {
						alert("Implement LP Issue Func");
					}}
					createFunc={() => {
						alert("Implement LP Create Func");
					}}
				/>

				<QualifiedCredentialButton
					credentialKey="sybil"
					credentialTitle="Sybil"
					statusEntry={uniswapVCStatusMap[currentAddress]}
					issueFunc={() => {
						alert("Implement Sybil Issue Func");
					}}
					createFunc={() => {
						alert("Implement Sybil Create Func");
					}}
				/>
			</div>
		{/if}
	{/if}

    <BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
        <Input />
        <SecondaryButton label="Issue 30-Day History" />
        <SecondaryButton label="Issue LP History" />
    </BaseLayout>
	<a href="/"><button>Back</button></a>

	<BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
        <Input />
        <SecondaryButton label="Issue 30-Day History" />
        <SecondaryButton label="Issue LP History" />
    </BaseLayout>
</main>
