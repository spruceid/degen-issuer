# Degen Issuer

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