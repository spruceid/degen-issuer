<script>
  import BaseLayout from "../components/BaseLayout.svelte";
  import { getEthereum } from "../ethereum.js";
  let ethereumAccounts = [];
  let errorMessage;
  let waitingForEthereum = true;
  getEthereum()
    .then((ethereum) => {
      return ethereum.request({ method: "eth_requestAccounts" });
    })
    .then((accounts) => {
      waitingForEthereum = false;
      ethereumAccounts = accounts;
    })
    .catch((err) => {
      waitingForEthereum = false;
      console.error(err);
      errorMessage = "Unable to list Ethereum accounts: " + err.message;
    });
</script>

<BaseLayout title="Ethereum Address Controller" icon="/ethereum.svg">
  <div class="main">
    {#if errorMessage}
      <div class="error-container">
        <p>{errorMessage}</p>
      </div>
    {/if}
    {#if ethereumAccounts.length}
      <p class="text-white m-auto">Select the desired</p>
      <ul>
        {#each ethereumAccounts as account}
          <li class="account">
            <a href="/Ethcontrol/issue/{account}"><code>{account}</code></a>
          </li>
        {/each}
      </ul>
    {:else if waitingForEthereum}
      <p>Waiting for Ethereum wallet…</p>
    {:else}
      <p>No Ethereum accounts detected</p>
    {/if}
    <p><a href="/Ethcontrol">Back</a></p>
  </div>
</BaseLayout>

<style>
  .main {
    max-width: 72ex;
    color: #eee;
    margin: 0 auto;
  }
  .error-container {
    color: red;
  }
  .account {
    color: #9cf;
  }
</style>
