# x402 Examples


This repository is a public collection of examples and tests using x402 and onchain payments.
Please feel free to contribute.

To install dependencies:

```bash
bun install
```

To setup:

```bash
cp .env.example .env
```

and fill in the relevant private keys

## Workspaces

- **local-examples-config:** is for storing local config that is easily accessible through `@thegreataxios/local-examples-config` in other packages
- **eip3009-forwarder-ethersv6:** allows the simple addition of [`EIP3009Forwarder.sol`](https://github.com/thegreataxios/eip3009-forwarder) for quick testing

## Contributing

To contribute please make a PR. This repository is very early stage and does not yet have linting, formatting, etc. That will be fixed in future releases.

## License

This repository is licensed under MIT. All examples are MIT by default.