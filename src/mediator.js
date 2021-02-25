export const save = (credential) =>
  window.credentialHandlerPolyfill
    .loadOnce(
      `https://authn.io/mediator?origin=${encodeURIComponent(
        window.location.origin
      )}`
    )
    .then(async (_) => {
      const vc = credential || {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1",
        ],
        id: "urn:uuid:253e2ec6-77e7-4c25-8f00-07b3005bc4f6",
        type: ["VerifiableCredential"],
        credentialSubject: {
          id: "did:key:z6Mkf9yfyCL3uqrCYJ5FjPF3i7gGCxTmF4yP3vrHoXagXocn",
          alumniOf: "test4",
        },
        issuer: "did:key:z6Mkf9yfyCL3uqrCYJ5FjPF3i7gGCxTmF4yP3vrHoXagXocn",
        issuanceDate: "2020-08-19T21:41:50Z",
        proof: {
          type: "Ed25519Signature2018",
          proofPurpose: "authentication",
          verificationMethod:
            "did:key:z6Mkhf8xZVxCTJ37eq3FkSDfHQ5UGPcJ6crY7EiUvVa6Guqe#z6Mkhf8xZVxCTJ37eq3FkSDfHQ5UGPcJ6crY7EiUvVa6Guqe",
          created: "2021-02-10T12:58:23.347Z",
          jws:
            "eyJhbGciOiJFZERTQSIsImNyaXQiOlsiYjY0Il0sImI2NCI6ZmFsc2V9..xEn-7cCghuuUKNTcVnJr0-AB7_7-wfeqnPGAhcHk10eoXOiXHVq3LBsmJ7SAEE2cVImirleSc_ZeTJ2w0AKNCw",
        },
      };
      const webCredential = new WebCredential("VerifiableCredential", vc);
      const result = await navigator.credentials.store(webCredential);
      console.log(result);
    });
