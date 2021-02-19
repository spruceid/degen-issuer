<script>
    import BaseLayout from "../components/BaseLayout.svelte";
    import Input from "../components/Input.svelte";
    import SecondaryButton from "../components/SecondaryButton.svelte";

    // Assume top level passes a web3 object with
    // a provider which has a wallet.
    export let web3;

    // Accounts in local storage the for the user, but not being shown
    // in the web3 object
    $: cachedAccounts = [];
    // Held in local storage, keys are addresses,
    // values are verfied credentials
    $: cachedSybilCredentialMap = {};
    // UI error message.
    $: errorMessage = "";
    // Connected accounts. Maybe split into unlocked accounts.
    $: liveAccounts = [];
    // UI control.
    $: showSybilVerify = false;
    // Connect wallets not shown in the cachedSybilCredentialMap
    // used to generate the verification UI.
    $: unverifiedSybilWalletMap = {};

    // Get auto complete help when using local storage.
    const sybilKey = "uniswap_sybil_verified_credentials";

    // Lifecycle
    const onLoad = () => {
        // to be assigned to unverifiedSybilWalletMap
        let unverifiedMap = {};

        // object of cached Uniswap Sybil credentials
        let cached;
        // JSON String of cached, or null
        let cachedStr = localStorage.getItem(sybilKey);

        // On first load, or after clearing of storage.
        if (!cachedStr) {
            cached = {};
            localStorage.setItem(sybilKey, JSON.stringify(cached));
        } else {
            cached = JSON.parse(cachedStr);
        }

        // force a UI update.
        cachedSybilCredentialMap = cached;

        // Connected accounts vs...
        liveAccounts = web3.eth.getAccounts();
        // ...cached accounts as an array
        tempCachedAccounts = cachedSybilCredentialMap.keys();

        // TODO: Test if accounts are unlocked, then differentiate in the UI.
        for (let i = 0, x = liveAccounts.length; i < x; i++) {
            let wallet = liveAccounts[i];

            let cachedVC = cachedSybilCredentialMap[wallet];
            if (cachedVC) {
                // Drop live accounts from cached accounts.
                tempCachedAccounts = tempCachedAccounts.filter(
                    (x) => x !== wallet
                );
            } else {
                // Add verify UI controls.
                unverifiedMap[wallet] = {
                    // UI Controls.
                    errorMessage: "",
                    loading: false,
                    wallet: wallet,
                };
            }
        }

        // force the UI update.
        unverifiedSybilWalletMap = unverifiedMap;
        cachedAccounts = tempCachedAccounts;

        if (!liveAccounts.length) {
            errorMessage = "No connected Ethereum accounts currently detected";
        }
    };

    // UI logic
    const toggleSybilCreate = () => {
        showSybilVerify = !showSybilVerify;
    };

    // VC interactions
    const sybilVerifyEvent = (walletState) => {
        if (!walletState || typeof walletState !== object) {
            errorMessage = `App State Error, called without walletState`;
            return;
        }

        walletState.loading = true;

        // make signing function block and have predictable fail state.
        const signingFn = async (data) => {
            try {
                let result = await web3.eth.sign(data, walletState.wallet);
                return [true, result];
            } catch (err) {
                return [false, err];
            }
        };

        // retrieve the Sybil list from the network, find the entry
        // in the sybil list, hopefully.
        let [success, vc] = createSybilVC(walletState.wallet, signingFn);
        if (!success) {
            walletState.errorMessage = vc;
            walletState.loading = false;
            return;
        }

        // Update the cache.
        cachedSybilCredentialMap[walletState.wallet] = vc;
        localStorage.setItem(
            sybilKey,
            JSON.stringify(cachedSybilCredentialMap)
        );

        // remove from unverifiedMap
        let tempUnverifiedMap = {};
        // We could object delete, but Chrome perf isn't fond of that.
        unverifiedSybilWalletMap.keys().forEach((key) => {
            if (key !== walletState.wallet) {
                tempUnverifiedMap[key] = unverifiedSybilWalletMap[key];
            }
        });

        // force UI update
        unverifiedSybilWalletMap = tempUnverifiedMap;
        cachedSybilCredentialMap = JSON.parse(localStorage.getItem(sybilKey));
    };

    const createSybilVC = async (wallet, signingFn) => {
        let entry;
        try {
            entry = await sybilVerifyRequest(wallet);
        } catch (err) {
            let errorMsg = `Failed to verify wallet: ${err}`;
            return [false, errorMsg];
        }

        let proof;
        [success, proof] = signingFn(JSON.stringify(credentialSubject));
        // Only fails if account is locked.
        if (!success) {
            return [false, proof];
        }

        let vc = makeSybilCredential(wallet, entry, proof);

        vcMap[wallet] = vc;
        localStorage.setItem(sybilKey, JSON.stringiify(vcMap));

        return [true, vc];
    };

    // Currently uses Uniswap's list.
    // Could change to a method that directory queries twitter from tweetID.
    const sybilVerifyRequest = async (wallet) => {
        try {
            let res = await fetch(
                "https://raw.githubusercontent.com/Uniswap/sybil-list/master/verified.json"
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
            // Could use err here, or is it better to be vague?
            return [false, "Error in Uniswap Sybil Verification"];
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

    const makeSybilCredential = (wallet, cred, proof) => {
        let credentialSubject = {
            id: `did:ethr:${wallet}`,
            sybil: cred,
        };

        let vc = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                // TODO: Add specific context?
            ],
            // !NOTE What does this need to be?
            // id: "http://example.edu/credentials/3732",
            issuer: credentialSubject.id,
            type: ["VerifiableCredential", "UniswapSybilCredential"],
            credentialSubject: credentialSubject,
            proof: proof,
        };

        return vc;
    };

</script>

<h2>Uniswap Credentials</h2>
<main>
    {#if errorMessage}
        <div class="error-container">
            <p>{errorMessage}</p>
        </div>
    {/if}
    {#if unverifiedSybilWalletMap.keys().length}
        <div>
            <p>
                Detected wallets without <a
                    href="https://sybil.org/#/delegates/uniswap"
                    >Uniswap Sybil</a
                > associated Verified Credential.
            </p>
            <button onclick={toggleSybilCreate}
                >{showSybilVerify ? "Hide" : "Show Unverified wallets"}</button
            >
            {#if showSybilVerify}
                <p>
                    Note: Assumes the targeted wallet(s) has already followed
                    the process to be approved by Uniswap
                </p>
                {#each unverifiedSybilWalletMap as walletState}
                    <div>
                        <p>{walletState.wallet}</p>
                        <button
                            onclick={() => {
                                sybilVerifyEvent(walletState);
                            }}>Verify</button
                        >
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
    {#if liveAccounts.length || cachedAccounts.length}
        <!-- TODO: An each + concat (or dup?) here -->
        <div class="btn-group">
            <input />
            <button>Issue 30-Day History</button>
            <button>Issue LP History</button>
            <a href="/"><button>Back</button></a>
        </div>
    {/if}

    <BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
        <Input />
        <SecondaryButton label="Issue 30-Day History" />
        <SecondaryButton label="Issue LP History" />
    </BaseLayout>
</main>
