# OpenScan v1.0.0-alpha Release Notes

## Announcing OpenScan Alpha

We're excited to announce the first public alpha release of **OpenScan** — a trustless, open-source blockchain explorer for Ethereum and Layer 2 networks.

> *We choose to build trustless systems even when it is harder.*
> *We pay the cost of openness over the convenience of control.*

### Alpha Status

**This is an alpha release and is not production ready.** The purpose of this release is to:

- Test the basic and initial features of the explorer
- Gather community feedback on functionality and user experience
- Identify bugs and edge cases across different networks
- Validate our trustless, RPC-first architecture

Our goal is to iterate based on feedback and deliver a **production-ready explorer** for all supported networks in future releases.

---

## Access OpenScan

- **ENS Gateway:** [openscan.eth.link](https://openscan.eth.link)
- **GitHub Pages:** [openscan-explorer.github.io/explorer](https://openscan-explorer.github.io/explorer)
- **IPFS:** Pinned on IPFS for censorship-resistant access

---

## Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Ethereum Mainnet | 1 | Supported |
| Arbitrum One | 42161 | Supported |
| Optimism | 10 | Supported |
| Base | 8453 | Supported |
| Polygon PoS | 137 | Supported |
| BSC (BNB Chain) | 56 | Supported |
| Sepolia Testnet | 11155111 | Supported |
| BSC Testnet | 97 | Supported |
| Localhost (Hardhat/Anvil) | 31337 | Supported |

---

## Features

### Core Explorer Functionality
- **Block Explorer** — View detailed block information including transactions, gas usage, and timestamps
- **Transaction Details** — Inspect transaction data, receipts, logs, and execution traces
- **Address Lookup** — Check balances, transaction history, and contract code
- **Network Statistics** — Track chain metrics, gas prices, and block times

### Smart Contract Interaction
- **Verified Contract Support** — Read from and write to verified smart contracts
- **ABI Import** — Import contract ABIs for unverified contracts
- **Hardhat 3 Ignition Support** — Import and interact with local deployments

### Layer 2 Support
- **Arbitrum** — L1 block numbers, send counts, request IDs
- **Optimism/Base** — L1 fee breakdown (l1Fee, l1GasPrice, l1GasUsed)

### RPC Strategy Options
- **Fallback Mode** — Sequential RPC calls with automatic failover
- **Parallel Mode** — Query multiple providers simultaneously for comparison and reliability

### Developer Tools
- **Hex Encoder/Decoder** — Convert between hex and text formats
- **Unit Converter** — Convert between Wei, Gwei, and ETH
- **Custom RPC Support** — Configure your own RPC endpoints per network
- **Transaction Builder** — Construct and simulate transactions

### User Experience
- **Dark/Light Mode** — Toggle between themes
- **Responsive Design** — Mobile-friendly interface
- **ENS Resolution** — Display ENS names for addresses
- **IPFS/ENS Hosting** — Fully decentralized deployment

---

## Known Limitations

As an alpha release, please be aware of:

- Some RPC providers may have rate limits or occasional downtime
- Contract verification relies on Sourcify; not all contracts may be verified
- Performance may vary depending on network congestion and RPC response times
- Some edge cases in transaction decoding may not be fully handled

---

## Feedback & Contributions

We welcome your feedback! This alpha release is about learning and improving together.

- **Report Issues:** [GitHub Issues](https://github.com/openscan-explorer/explorer/issues)
- **Contribute:** [Contributing Guide](https://github.com/openscan-explorer/explorer/blob/main/CONTRIBUTING.md)
- **Contact:** Available via XMTP on the [Contact Page](https://openscan.eth.link/#/contact)

---

## What's Next

Our roadmap toward a stable v1.0.0 release includes:

- Stability improvements and bug fixes based on community feedback
- Enhanced error handling and loading states
- Performance optimizations
- Additional network support
- Improved contract interaction UX

---

Thank you for being part of the OpenScan journey. Together, we're building a more open and trustless blockchain infrastructure.

**The OpenScan Team**
