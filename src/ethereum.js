export default async function getEthereum() {
	return new Promise((resolve, reject) => {
		if (!window.ethereum) {
			return reject(new Error("Ethereum wallet not found."));
		}
		if (!window.ethereum.request) {
			return reject(new Error("Ethereum request function not found."));
		}
		resolve(window.ethereum);
	});
};
