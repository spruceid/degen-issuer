<script>
    import BaseLayout from "../components/BaseLayout.svelte";
    import Input from "../components/Input.svelte";
    import SecondaryButton from "../components/SecondaryButton.svelte";

    import { createSybilVC } from "../util/Uniswap";
    // Assume top level passes a web3 object with
    // a provider which has a wallet.
    export let web3;

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
                status: {
                    "activity": boolean,
                    "liquidity": boolean,
                    "sybil": boolean,
                }
            }
        }
    */
    $: uniswapVCStatusMap = {};

    // Get auto complete help when using local storage.
    const vcLocalStorageKey = "degenissuer_verified_credentials";

    // Lifecycle
    const onLoad = () => {
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
        let liveAccounts = web3.eth.getAccounts();
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
    const createStatusMap = (
        cache,
        wallet,
        credentialCategory,
        credentialTypeList
    ) => {
        let statusMapEntry = { wallet: wallet };

        for (let i = 0, n = credentialTypeList; i < n; i++) {
            let credentialType = credentialTypeList[i];
            statusMapEntry[credentialType] = hasCredentialType(
                cache,
                wallet,
                credentialCategory,
                credentialType
            );
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
        return createStatusMap(cache, wallet, "uniswap", [
            "activity",
            "liquidity",
            "sybil",
        ]);
    };

    // VC interactions
    const issueSybilVC = async (wallet) => {
        if (!wallet || typeof wallet !== "string") {
            errorMessage = `App State Error, called without wallet`;
            return;
        }

        loading = true;

        // make signing function block and have predictable fail state.
        const signingFn = async (data) => {
            console.log("Here!")
            try {
                let result = await web3.eth.sign(data, wallet);
                return [true, result];
            } catch (err) {
                console.log("Here?")
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
        tempUniswapMap[wallet].uniswap.sybil = true;
        uniswapVCStatusMap = tempUniswapMap;
        cachedCredentialMap = JSON.parse(
            localStorage.getItem(vcLocalStorageKey)
        );
    };

    // TODO: REMOVE, UI Debub mocks:
    const debugUIData = () => {
        let rActive = Math.random() < 0.5;
        let rLiquid = Math.random() < 0.5;
        let rSybil = Math.random() < 0.5;

        let dummyCache = {
            live_all_verified: {
                live: true,
                status: {
                    activity: true,
                    liquidity: true,
                    sybil: true,
                },
            },
            live_none_verified: {
                live: true,
                status: {
                    activity: false,
                    liquidity: false,
                    sybil: false,
                },
            },
            live_random: {
                live: true,
                status: {
                    activity: rActive,
                    liquidity: rLiquid,
                    sybil: rSybil,
                },
            },
            cached_all_verified: {
                live: false,
                status: {
                    activity: true,
                    liquidity: true,
                    sybil: true,
                },
            },
            cached_none_verified: {
                live: false,
                status: {
                    activity: false,
                    liquidity: false,
                    sybil: false,
                },
            },

            cached_random: {
                live: false,
                status: {
                    activity: rActive,
                    liquidity: rLiquid,
                    sybil: rSybil,
                },
            },
        };

        console.log("BEFORE");
        console.log(uniswapVCStatusMap);
        uniswapVCStatusMap = dummyCache;

        console.log("AFTER");
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
    <div>
        <label for="currentAddress">Choose An Address</label>
        <select bind:value={currentAddress} name="currentAddress">
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
        {#if loading}
            <p>Updating...</p>
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

                {#if uniswapVCStatusMap[currentAddress].status.activity}
                    <button
                        on:click={() => {
                            // TODO: IMPLEMENT
                            alert("Issue activity credential");
                        }}>Issue Trade Activity Credential</button
                    >
                {:else if !uniswapVCStatusMap[currentAddress].live}
                    <button disabled={true}
                        >Create Trade Activity Credential</button
                    >
                    <p style="color:white">
                        Cannot create new credential with disconnected wallet
                    </p>
                {:else}
                    <button
                        on:click={() => {
                            // TODO: IMPLEMENT
                            alert(
                                "Query Uniswap API then Create activity credential"
                            );
                        }}>Create Trade Activity Credential</button
                    >
                {/if}

                {#if uniswapVCStatusMap[currentAddress].status.liquidity}
                    <button
                        on:click={() => {
                            // TODO: IMPLEMENT
                            alert("Issue liquidity credential");
                        }}>Issue LP Credential</button
                    >
                {:else if !uniswapVCStatusMap[currentAddress].live}
                    <button disabled>Create LP Credential</button>
                    <p style="color:white">
                        Cannot create new credential with disconnected wallet
                    </p>
                {:else}
                    <button
                        on:click={() => {
                            // TODO: IMPLEMENT
                            alert(
                                "Query Uniswap API then Create liquidity credential"
                            );
                        }}>Create LP Credential</button
                    >
                {/if}

                {#if uniswapVCStatusMap[currentAddress].status.sybil}
                    <button
                        on:click={() => {
                            // TODO: IMPLEMENT
                            alert("Issue sybil credential");
                        }}>Issue Sybil Credential</button
                    >
                {:else if !uniswapVCStatusMap[currentAddress].live}
                    <button disabled>Create Trade Sybil Credential</button>
                    <p style="color:white">
                        Cannot create new credential with disconnected wallet
                    </p>
                {:else}
                    <button
                        on:click={() => {
                            // TODO: IMPLEMENT
                            issueSybilVC(currentAddress);
                        }}>Create Trade Sybil Credential</button
                    >
                {/if}
            </div>
        {/if}
    {/if}
<<<<<<< HEAD

    <BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
        <Input />
        <SecondaryButton label="Issue 30-Day History" />
        <SecondaryButton label="Issue LP History" />
    </BaseLayout>
=======
    <a href="/"><button>Back</button></a>
>>>>>>> adds working per-ethereum-address ui, uniswap sybil checking, and debug data to allow simple testing
</main>
