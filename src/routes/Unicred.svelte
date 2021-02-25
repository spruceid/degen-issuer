<script>
  import BaseLayout from "../components/BaseLayout.svelte";
  import { getEthereumAccounts } from "../ethereum.js";
  import {
    getQualifications,
    sybilVerifyRequest,
    makeEthProof,
    makeUniswapSybilVC,
    makeUniswapTradeActivityVC,
    makeUniswapLiquidityVC,
  } from "../uniswap";

  import { onMount } from "svelte";

  import QualifiedCredentialButton from "../components/QualifiedCredentialButton.svelte";

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
  onMount(async () => {
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
    let liveAccounts = await getEthereumAccounts();
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
    cachedCredentialMap = cachedAccounts;
    uniswapVCStatusMap = statusMap;

    if (!liveAccounts.length) {
      errorMessage = "No connected Ethereum accounts currently detected";
    }
  });

  // cache operations
  // Given a wallet, a category, and a list of types, returns a status map
  const createStatusMapEntry = (
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

  // VC interactions

  // TODO: Handle getting trade history seperate from testing for qualifications.
  // A more modular approach to Qualifications would probably make this clearer.
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

    if (
      needsActiveTrades ||
      needsLiquidity ||
      !uniswapTradeHistoryMap[wallet]
    ) {
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

        uniswapTradeHistoryMap[wallet] = transactions;

        // Update the state w/ new values
        if (needsActiveTrades) {
          Object.assign(entry.status.activity, activity);
        }
        if (needsLiquidity) {
          Object.assign(entry.status.liquidity, liquidity);
        }
      } else {
        if (!needsActiveTrades) {
          entry.status.activity.qualified_err = result;
        }

        if (!needsLiquidity) {
          entry.status.liquidity.qualified_err = result;
        }
      }
    }

    entry.loading = false;

    // Force UI Change.
    uniswapVCStatusMap[wallet] = entry;
    uniswapVCStatusMap = uniswapVCStatusMap;
  };

  const cacheVC = async (wallet, vcKey) => {
    let targetWalletStatus = uniswapVCStatusMap[wallet]?.status;
    if (!targetWalletStatus) {
      errorMessage = `Error creating ${vcKey} credential`;
      return;
    }

    let vcEntry = targetWalletStatus[vcKey];
    if (!targetWalletStatus) {
      errorMessage = `Error creating ${vcKey} credential`;
      return;
    }

    let cred = vcEntry.qualified_proof;

    let proof = makeEthProof(wallet, cred);
    let vc;
    switch (vcKey) {
      case "sybil":
        vc = makeUniswapSybilVC(wallet, cred, proof);
        break;
      case "activity":
        vc = makeUniswapTradeActivityVC(wallet, cred, proof);
        break;
      case "liquidity":
        vc = makeUniswapLiquidityVC(wallet, cred, proof);
        break;
      default:
        errorMessage = `Unknown credential: ${vcKey}`;
        return;
    }

    // DEBUG: should be set up already.
    if (!cachedCredentialMap[wallet]) {
      cachedCredentialMap[wallet] = { uniswap: {} };
    }

    cachedCredentialMap[wallet].uniswap[vcKey] = vc;
    localStorage.setItem(
      vcLocalStorageKey,
      JSON.stringify(cachedCredentialMap)
    );

    // Force UI Update
    let tempUniswapMap = uniswapVCStatusMap;
    tempUniswapMap[wallet].status[vcKey].cached = true;
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

      // Two real eth addresses, the first qualifies for Sybil, the second for Activity.

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
  };
</script>

<BaseLayout title="Uniswap Credentials" icon="/uniswap.svg">
  <!-- TODO: REMOVE THIS AS DEBUG
	<div>
		<p style="color:red">Debug Mock Data</p>
		<button
			on:click={() => {
				debugUIData();
			}}>Start Debug</button
		>
	</div >
	-->

  {#if errorMessage}
    <p style="color:red">{errorMessage}</p>
  {/if}
  <label for="currentAddress" class="mx-auto text-white mb-2"
    >Choose An Address</label
  >
  <!-- svelte-ignore a11y-no-onchange -->
  <select
    class="text-white p-4 text-left rounded-2xl max-w-sm mx-auto flex items-center h-16 w-full bg-blue-998 border-2 border-blue-997 mb-6"
    bind:value={currentAddress}
    on:change={() => {
      checkQualifications(currentAddress);
    }}
    id="currentAddress"
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
  {#if currentAddress}
    {#if loading || uniswapVCStatusMap[currentAddress].loading}
      <p style="color:white">Updating...</p>
    {:else}
      <QualifiedCredentialButton
        credentialKey="activity"
        credentialTitle="Trade Activity"
        statusEntry={uniswapVCStatusMap[currentAddress]}
        issueFunc={() => {
          alert("Implement Activity Issue Func");
        }}
        createFunc={() => {
          cacheVC(currentAddress, "activity");
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
          cacheVC(currentAddress, "liquidity");
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
          cacheVC(currentAddress, "sybil");
        }}
      />
    {/if}
  {/if}
</BaseLayout>
