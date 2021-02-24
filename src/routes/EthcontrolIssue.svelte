<script>
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import loadDIDKit from '../DIDKit.js';
	import getEthereum from '../ethereum.js';
	import { v4 as uuid } from 'uuid';

	export let params;
	$: accountId = params.accountId;
	let errorMessage;
	let statusMessage = "";
	let verifiableCredential;
	let DIDKit, ethereum;
	let credentialString;
	let signature;
	let preparation;

	const toHex = value => ('0' + value.toString(16)).substr(-2)

	// TODO: request DID from user

	Promise.all([getEthereum(), loadDIDKit()])
		.then(([_ethereum, _DIDKit]) => {
			ethereum = _ethereum;
			DIDKit = _DIDKit;
			console.log('DIDKit version:', DIDKit.getVersion())
			const subject = "did:tz:"; // TODO
			const did = 'did:ethr:' + accountId;
			const credential = {
				"@context": [
					"https://www.w3.org/2018/credentials/v1",
					{
						"sameAs": "https://www.w3.org/TR/owl-ref/#sameAs-def"
					}
				],
				id: "urn:uuid:" + uuid(),
				issuer: did,
				issuanceDate: new Date().toISOString(),
				type: "VerifiableCredential",
				credentialSubject: {
					id: subject,
					sameAs: did
				}
			};
			const proofOptions = {
					verificationMethod: did + "#Eip712Method2021"
			};
			const keyType = {"kty":"EC","crv":"secp256k1","alg":"ES256K-R"};
			statusMessage = "Preparing credential...";
			return DIDKit.prepareIssueCredential(
				credentialString = JSON.stringify(credential),
				JSON.stringify(proofOptions),
				JSON.stringify(keyType)
			)
		})
		.then(JSON.parse)
		.then(_preparation => {
			preparation = _preparation;
			const typedData = preparation.signingInput;
			if (!typedData || !typedData.primaryType) {
				console.error("proof preparation:", preparation);
				throw new Error("Expected EIP-712 TypedData");
			}
			const request = ethereum.request({
				method: "eth_signTypedData_v4",
				params: [accountId, JSON.stringify(typedData)]
			})
			statusMessage = "Waiting for signature...";
			return request;
		})
		.then(signature => {
			return DIDKit.completeIssueCredential(
				credentialString,
				JSON.stringify(preparation),
				signature
			)
		})
		.then(JSON.parse)
		.then(vc => {
			verifiableCredential = vc;
			statusMessage = "";
		})
		.catch(err => {
			statusMessage = "";
			console.error(err);
			errorMessage = err.message;
		})
</script>

<style>
	.main {
		max-width: 72ex;
		color: #eee;
		margin: 0 auto;
	}
	.error-container {
		color: red;
	}
	.verifiable-credential {
		text-align: left;
		white-space: pre-wrap;
		word-wrap: break-word;
		max-width: 68ex;
	}
</style>

<BaseLayout title="Ethereum Address Controller" icon="/ethereum.svg">
	<div class="main">
	{#if errorMessage}
		<div class="error-container">
			<p>{errorMessage}</p>
		</div>
	{/if}
	{#if statusMessage}
	<p>{statusMessage}</p>
	{/if}
	{#if verifiableCredential}
		<div>Here is your verifiable credential:</div>
	<pre class="verifiable-credential">{JSON.stringify(verifiableCredential, 0, 2)}</pre>
	{/if}
	<p><a href="/Ethcontrol/pick">Back</a></p>
	</div>
</BaseLayout>
