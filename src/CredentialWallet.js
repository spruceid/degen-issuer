// The user's id, as a reactive store
// https://svelte.dev/docs#Store_contract

const EXTENSION_ID = "mooongagddnmjjjkbiadledpghgoecll";

export const polyfill = {
  get: (event) => {
    return new Promise((resolve, _) => chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "get", event },
      resolve
    ));
  },
  store: (event) => {
    return new Promise((resolve, _) => chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "store", event },
      resolve
    ));
  },
};

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

// Updates the exported id store and returns the id.
export async function connect() {
	const credentialQuery = {
    query: [{type: "DIDAuth"}]
	};

  const vp = await polyfill.get(credentialQuery);
	// Skip verifying the VP and just trust the wallet.
	const holder = vp.holder;
	if (!holder) {
		console.error(vp)
		throw new Error("Missing verifiable presentation holder");
	}
	id.set(holder)
	console.log(holder);
	return holder;
}
