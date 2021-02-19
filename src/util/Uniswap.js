const uniswapSybilListURL = "https://raw.githubusercontent.com/Uniswap/sybil-list/master/verified.json";

export const createSybilVC = async (wallet, signingFn) => {
    let entry;
    try {
        entry = await sybilVerifyRequest(wallet);
    } catch (err) {
        let errorMsg = `Failed to verify wallet: ${err}`;
        return [false, errorMsg];
    }

    let [success, jws] = signingFn(JSON.stringify(credentialSubject));
    // Only fails if account is locked.
    if (!success) {
        return [false, jws];
    }

    let proof = makeSybilProof(wallet, jws);

    let vc = makeSybilCredential(wallet, entry, proof);

    return [true, vc];
};

// TODO: Verify format
const makeSybilProof = (wallet, jws) => {
    return {
        type: "Secp256k1SignatureAuthentication2018",
        // TODO: Fmt?
        created: Date.now(),
        proofPurpose: "assertionMethod",
        verificationMethod: `did:ethr:${wallet}`,
        jws: jws,
    };
}

// Currently uses Uniswap's list.
// Could change to a method that directory queries twitter from tweetID.
const sybilVerifyRequest = async (wallet) => {
    try {
        let res = await fetch(
            uniswapSybilListURL
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
    } catch (_err) {
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
        "@context": "https://w3id.org/did/v1",
        id: `did:ethr:${wallet}`,
        publicKey: [
            {
                id: `did:ethr:${wallet}#owner`,
                type: "Secp256k1VerificationKey2018",
                owner: `did:ethr:${wallet}`,
                ethereumAddress: wallet,
            },
        ],
        authentication: [
            {
                type: "Secp256k1SignatureAuthentication2018",
                publicKey: `did:ethr:${wallet}#owner`,
            },
        ],
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