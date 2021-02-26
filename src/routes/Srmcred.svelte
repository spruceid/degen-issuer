<script>
	import { onMount } from "svelte";
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import QualifiedCredentialButton from "../components/QualifiedCredentialButton.svelte";
	import {
		cachedVCs,
		solanaLiveAddress,
		solanaWallet,
		vcLocalStorageKey,
	} from "../store.js";
	import { createStatusMapEntry } from "../qualificationStatus.js";

	$: errorMessage = "";
	$: currentAddr = "";
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

	cachedVCs.subscribe((v) => {
		localStorage.setItem(vcLocalStorageKey, JSON.stringify(v));
	});

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
			qualified_err: "unimplemented",
		};

		let liquidity = {
			qualified: false,
			qualified_proof: false,
			qualified_err: "unimplemented",
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

			let activityArr = [];
			if (activityRes.ok && activityRes.status === 200) {
				let activityJSON = await activityRes.json();
				if (activityJSON.result && Array.isArray(activityJSON.result)) {
					let { result } = activityJSON;
					for (let i = 0, n = result.length; i < n; i++) {
						let transaction = result[i];
						if (!transaction.err) {
							activityArr.push(transaction);
							if (activityArr.length > minTrades) {
								activity.qualified = true;
								activity.qualified_proof = activityArr;
								activity.qualified_err = "";
								break;
							}
						}
					}
				} else {
					activity.qualified_err = `Failed in API request, bad format`;
				}
			} else {
				activity.qualified_err = `Failed in API request, bad status`;
			}
		} catch (err) {
			activity.qualified_err = `Failed in API request: ${err}`;
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
			// TODO: change limit?
			params: [addr, { limit: 25 }],
		};
		return JSON.stringify(reqBody);
	};

	onMount(async () => {
		// Catch uninitilized states here:
		if (!$cachedVCs) {
			let vcc = localStorage.getItem(vcLocalStorageKey);
			if (!vcc) {
				vcc = {};
			} else {
				vcc = json.Parse(vcLocalStorageKey);
			}

			$cachedVCs.set(vcc);
		}

		let cachedAddrs = Object.keys($cachedVCs);
		let statusMap = {};

		for (let i = 0, n = cachedAddrs.length; i < n; i++) {
			let addr = cachedAddrs[i];
			let status = serumStatusMapEntry($cachedVCs, wallet);
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
				let status = serumStatusMapEntry($cachedVCs, $solanaLiveAddress);
				entry = {
					live: true,
					loading: true,
					status: status,
				};
			}

			statusMap[$solanaLiveAddress] = entry;
		}

		if (!statusMap[testAddr]) {
			let entry = {
				live: false,
				loading: false,
				status: serumStatusMapEntry($cachedVCs, testAddr),
			};

			statusMap[testAddr] = entry;
		}

		serumVCStatusMap = statusMap;
		console.log(serumVCStatusMap);
	});
</script>

<BaseLayout title="Serum Credentials" icon="/serum.svg">
	{#if !$solanaLiveAddress}
		<SecondaryButton label="Sign in" href="/Solcontrol" icon="/solana.svg" />
	{/if}
	<label for="currentAddress">Choose An Address</label>
	<select
		class="text-white p-4 text-left rounded-2xl max-w-sm mx-auto flex items-center h-16 w-full bg-blue-998 border-2 border-blue-997 mb-6"
		bind:value={currentAddr}
		on:change={() => {
			let entry = serumVCStatusMap[currentAddr];
			if (!entry) {
				// TODO: err out here.
				return;
			}
			console.log("!!!");
			console.log(entry);
			if (
				!entry.status.activity.qualified_check ||
				!entry.status.liquidity.qualified_check
			) {
				checkQualificaions(currentAddr, entry.live);
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

	{#if currentAddr}
		{#if serumVCStatusMap[currentAddr].loading}
			<p style="color:white">Updating...</p>
		{:else}
			<QualifiedCredentialButton
				credentialKey="activity"
				credentialTitle="Trade Activity"
				statusEntry={serumVCStatusMap[currentAddr]}
				issueFunc={() => {
					alert("Implement Activity Issue Func");
				}}
				createFunc={() => {
					alert("Impl Activity Create Func");
					//  cacheVC(currentAddress, "activity");
				}}
			/>

			<QualifiedCredentialButton
				credentialKey="liquidity"
				credentialTitle="LP"
				statusEntry={serumVCStatusMap[currentAddr]}
				issueFunc={() => {
					alert("Implement LP Issue Func");
				}}
				createFunc={() => {
					alert("Implement LP Create Func");
					// cacheVC(currentAddress, "liquidity");
				}}
			/>
		{/if}
	{/if}
</BaseLayout>
