# RelayChain v2.1

Decentralized parcel traceability and escrow flow on Ethereum (Hardhat + React + ethers).

## Prerequisites

- Node.js 18+
- MetaMask
- Ganache (local chain)

## Project Structure

- `contracts/` smart contracts (`RelayEscrow.sol`, `CarrierReputation.sol`)
- `scripts/` deploy and utility scripts
- `test/` Hardhat test suite
- `frontend/` React + Vite app
- `deployments/` generated deployment artifacts per network

## Quick Start

1) Install backend dependencies:

```bash
npm install
```

2) Install frontend dependencies:

```bash
cd frontend && npm install
```

3) 

4) Compile and test contracts:

```bash
npm run compile
npm run test
```

5) Deploy contracts to localhost:

```bash
npm run deploy:local
```

This generates `deployments/localhost.json`.

6) Sync deployed addresses to frontend:

```bash
npm run sync:frontend:localhost
```

7) Start frontend:

```bash
cd frontend && npm run dev
```

## One-command Deploy + Frontend Address Sync

You can deploy and auto-sync frontend addresses in one command:

```bash
npm run deploy:local:sync
```

This will:

- deploy contracts to localhost
- write `deployments/localhost.json`
- overwrite `frontend/src/config/addresses.js` with fresh addresses

## Deployment Artifact Format

Each deployment writes a JSON file in `deployments/<network>.json`:

```json
{
  "network": "localhost",
  "chainId": 1337,
  "deployedAt": "...",
  "deployer": "0x...",
  "contracts": {
    "CarrierReputation": "0x...",
    "RelayEscrow": "0x..."
  }
}
```

## Useful Commands

- `npm run test` run Solidity tests
- `npm run deploy:local` deploy to localhost only
- `npm run deploy:local:sync` deploy + sync frontend addresses
- `npm run sync:frontend:localhost` sync frontend from deployment artifact
- `cd frontend && npm run build` build frontend

## Troubleshooting

- **`Deployment file not found`** on sync: run `npm run deploy:local` first.
- **MetaMask not connecting**: ensure network is `localhost:8545` with chain id `1337`.
- **Frontend shows zero-address contracts**: run `npm run sync:frontend:localhost`.
- **RPC errors**: confirm Ganache is running before deploy/frontend actions.
