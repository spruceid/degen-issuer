# Degen Issuer

The Degen Issuer is a demo application demonstrating
basic cross-chain credential issuance to prove 
both blockchain account control and trading history. 
The Degen Issuer demo is built to work with Spruce's 
credential wallet which uses did:tz as the default 
DID method.

## Get started

Install the dependencies...

```bash
git clone https://github.com/spruceid/ssi ../ssi
git clone https://github.com/spruceid/didkit ../didkit
cd ../didkit/lib/wasm
cargo install wasm-pack
wasm-pack build --target web
cd ../../../degenissuer
npm install
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000).