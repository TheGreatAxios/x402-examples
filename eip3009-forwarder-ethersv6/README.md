# eip3009-forwarder-ethersv6

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

To add a new example:

1. Deploy the EIP-3009 Forwarder from https://github.com/thegreataxios/eip3009-forwarder
2. Update the [config file](../local-examples-config/src/index.ts) to add your new chain, token, and forwarder as needed
3. Update the [package.json](./package.json) to add your new token with the proper formatting of:

`<testnet/mainnet>:<chain-name>:<token-symbol>`

**Examples**

- testnet:europa:usdc
- mainnet:quake:usdt

