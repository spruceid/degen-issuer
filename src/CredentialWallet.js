import * as polyfill from 'credential-handler-polyfill';

// The user's id, as a reactive store
// https://svelte.dev/docs#Store_contract
export let id = {
	id: null,
	subscribers: [],
	set: function (id) {
		this.id = id;
		this.subscribers.forEach(fn => fn(id));
	},
	subscribe: function (fn) {
		this.subscribers.push(fn);
		fn(this.id);
		return () => {
			const i = this.subscribers.indexOf(fn);
			if (i > -1) this.subscribers.splice(i, 1);
		}
	}
};

// Request the user's id, using DIDAuth over CHAPI, without verification.
// Updates the exported id store and returns the id.
export async function connect() {
	await polyfill.loadOnce();
	const credentialQuery = {
		web: {
			VerifiablePresentation: {
				query: [{type: "DIDAuth"}]
			}
		}
	};
	const webCredential = await navigator.credentials.get(credentialQuery);
	if (!webCredential) {
		throw new Error("Unable to connect to credential wallet");
	}
	if (webCredential.type !== 'web') {
		console.error(webCredential)
		throw new Error("Unexpected web credential type: " + webCredential.type);
	}
	if (webCredential.dataType !== 'VerifiablePresentation') {
		console.error(webCredential)
		throw new Error("Unexpected web credential data type: " + webCredential.dataType);
	}
	const vp = webCredential.data;
	if (!vp) {
		console.error(webCredential)
		throw new Error("Missing web credential data");
	}
	// Skip verifying the VP and just trust the wallet.
	const holder = vp.holder;
	if (!holder) {
		console.error(webCredential)
		throw new Error("Missing verifiable presentation holder");
	}
	id.set(holder)
	return holder;
}
