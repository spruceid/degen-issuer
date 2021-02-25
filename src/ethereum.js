const getEthereum = async () => {
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

const getEthereumAccounts = async () => {
  return getEthereum().then((ethereum) =>
    ethereum.request({ method: "eth_requestAccounts" }).catch((err) => {
      console.error(err);
      return [];
    })
  );
};

export { getEthereum, getEthereumAccounts };
