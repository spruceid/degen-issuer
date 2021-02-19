<script>
<<<<<<< HEAD
    import BaseLayout from "../components/BaseLayout.svelte";
    import Input from "../components/Input.svelte";
    import SecondaryButton from "../components/SecondaryButton.svelte";

=======
    import { createSybilVC } from "../util/Uniswap";
>>>>>>> generalize credential cache retrieval, prepared component state to support design docs
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
        let cachedAccounts = cache.keys();
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

        for (let i = cachedAccounts.length - 1; i >= 0; i--) {
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
    const sybilVerifyEvent = (wallet) => {
        if (!wallet || typeof wallet !== "string") {
            errorMessage = `App State Error, called without wallet`;
            return;
        }

        loading = true;

        // make signing function block and have predictable fail state.
        const signingFn = async (data) => {
            try {
                let result = await web3.eth.sign(data, wallet);
                return [true, result];
            } catch (err) {
                return [false, err];
            }
        };

        // retrieve the Sybil list from the network, find the entry
        // in the sybil list, hopefully.
        let [success, vc] = createSybilVC(wallet, signingFn);
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
</script>

<h2>Uniswap Credentials</h2>
<main>
    {#if errorMessage}
        <div class="error-container">
            <p>{errorMessage}</p>
        </div>
    {/if}
    <!-- TODO: GET THIS WORKING OFF A DROPDOWN -->
    {#if uniswapVCStatusMap.keys().length}
        <!-- TODO ITER OVER STATUS TO CHANGE BUTTON STATE.-->
        <div class="btn-group">
            <p>TODO: Make this a drop-down of active accounts</p>
            <button>Issue 30-Day History</button>
            <button>Issue LP History</button>
            <a href="/"><button>Back</button></a>
        </div>
    {:else}
        <div>No live or cached Ethereum wallets detected.</div>
    {/if}

    <BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
        <Input />
        <SecondaryButton label="Issue 30-Day History" />
        <SecondaryButton label="Issue LP History" />
    </BaseLayout>
</main>
