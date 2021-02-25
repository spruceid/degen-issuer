<script>
	import BaseLayout from "../components/BaseLayout.svelte";
	import SecondaryButton from "../components/SecondaryButton.svelte";
	import loadDIDKit from '../DIDKit.js';
	import getEthereum from '../ethereum.js';
	import { v4 as uuid } from 'uuid';
	import * as polyfill from 'credential-handler-polyfill';
	import {id} from "../CredentialWallet.js";

	export let params;
	$: accountId = params.accountId;
	let errorMessage;
	let statusMessage = "Loading...";
	let verifiableCredential;
	$: credentialUrl = createJsonBlobUrl(verifiableCredential)
	let DIDKit;
	let ethereum;
	let credentialString;
	let signature;
	let preparation;

	const createJsonBlobUrl = object => {
		if (!object) return null;
		const blob = new Blob([JSON.stringify(object, null, 2)]);
		return URL.createObjectURL(blob, {type: 'application/json'});
	}

	const toHex = value => ('0' + value.toString(16)).substr(-2)

	if ($id) go()
	function go() {
		Promise.all([
			(async () => DIDKit = await loadDIDKit())(),
			(async () => ethereum = await getEthereum())(),
			polyfill.loadOnce()
		])
		.then(() => {
			console.log('DIDKit version:', DIDKit.getVersion())
			const subject = $id;
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
				type: ["VerifiableCredential"],
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
	}

	async function storeCredential(e) {
		e.preventDefault();
		errorMessage = "";
		statusMessage = "Storing credential…";
		try {
			// Wrap VC in a unsigned VP for CHAPI
			const vp = {
				"@context": ["https://www.w3.org/2018/credentials/v1"],
				type: "VerifiablePresentation",
				verifiableCredential
			};
			const webCredential = new WebCredential("VerifiablePresentation", vp);
			const storeResult = await navigator.credentials.store(webCredential);
			if (!storeResult) throw new Error("Unable to store credential");
			statusMessage = JSON.stringify(storeResult);
		} catch(err) {
			statusMessage = "";
			console.error(err);
			errorMessage = err.message;
		}
	}
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
	a {
		text-decoration: underline;
	}
	p {
		margin: 1em 0;
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
	{#if credentialUrl}
		<p>Your credential is ready.</p>
		<div><a href={credentialUrl} on:click={storeCredential}>Store credential in CHAPI wallet</a></div>
		<div>or</div>
		<div><a href={credentialUrl}>Download credential</a></div>
	{/if}
	<p><a href="/Ethcontrol/pick">Back</a></p>
	</div>
</BaseLayout>
