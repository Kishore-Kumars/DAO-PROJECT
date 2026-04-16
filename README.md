# TokenVoteDAO - Comprehensive Project Documentation

## 🎯 Project Overview

**TokenVoteDAO** is a fully-functional decentralized autonomous organization (DAO) governance platform built with:

- **Solidity** smart contract for on-chain proposal creation and token-weighted voting
- **Hardhat** for local blockchain development, testing, and Sepolia deployment
- **Ethers.js** frontend with MetaMask integration for real-time voting
- **TailwindCSS** + custom glassmorphism UI for modern dashboard experience

**Key Features:**

- Create proposals with title, description, and deadline (5-minute default)
- Vote FOR/AGAINST with duplicate vote protection (`hasVoted` mapping)
- Real-time proposal filtering: Active/Closed/My Votes
- Wallet connection (MetaMask primary, demo wallets)
- Live vote tallies with progress bars
- Fully responsive dashboard + landing page
- Hardhat local chain (31337) + Sepolia ready

## 🏗️ Architecture

```
c:/DAO-PROJECT/
├── contracts/DAO.sol              # Core DAO contract
├── test/DAO.test.js              # Contract tests (6 passing tests)
├── scripts/deploy.js             # Deployment script
├── hardhat.config.js             # Localhost:31337 + Sepolia
├── Frontend/
│   ├── index.html               # Landing page
│   ├── dashboard.html           # Main app
│   ├── app.js                   # Ethers.js + MetaMask integration (800+ lines)
│   └── style.css                # Inline Tailwind + custom styles
├── Backend/                      # Duplicate Hardhat setup (legacy?)
└── package.json                 # Hardhat toolbox deps
```

## 📋 Core Components

### 1. **DAO.sol** - Smart Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DAO {
    struct Proposal { /* title, description, forVotes, againstVotes, deadline */ }
    Proposal[] public proposals;
    mapping(uint => mapping(address => bool)) public hasVoted;  // Vote protection

    // Events for frontend
    event ProposalCreated(uint id, string title, uint deadline);
    event Voted(uint id, address voter, bool support);

    // Core functions: createProposal(), vote(), getProposals(), proposalCount()
}
```

**Key Logic:**

- Duplicate voting blocked via `hasVoted[index][msg.sender]`
- Time-bound voting (`block.timestamp < deadline`)
- Public getters for frontend consumption

### 2. **Frontend/app.js** - Wallet + Voting Logic (Primary File)

- **Ethers v6** provider/signer/contract setup
- **MetaMask** connect/switch to localhost:8545 (chainId 31337)
- **Real-time** proposal loading via `getProposals()`
- **Vote tracking** via `myVotes` Set + `hasVoted()` check
- **Modals**: Wallet connect, Proposal create, Options
- **Toast notifications** for tx status
- **Hardcoded ABI** + `contractAddress = \"0x5FbDB2315678afecb367f032d93F642f64180aa3\"`

**Flow:**

```
Connect Wallet → Switch to Localhost:31337 → Load Proposals → Create/Vote
```

### 3. **UI Structure**

- **index.html**: Hero landing → Enter Dashboard CTA
- **dashboard.html**: Header (balance/address), Stats grid, Filter tabs, Proposal cards
- **Inline Tailwind** + Poppins font + Lucide icons + Glassmorphism design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- VSCode terminal

### 1. Install & Start Local Chain

```bash
npm install
npx hardhat node          # Starts localhost:8545 (chainId 31337)
```

### 2. Deploy Contract

```bash
npx hardhat run scripts/deploy.js --network localhost
# Copy NEW contract address to Frontend/app.js
```

### 3. Frontend

```bash
# Auto-opens in browser (serve folder if needed)
# Navigate: index.html → dashboard.html
```

**Expected Flow:**

1. Landing page → \"Enter DAO Dashboard\"
2. Connect MetaMask → Switch to Localhost 31337
3. Create proposal → Vote on proposals → Filter views update live

## 🧪 Testing

```bash
npx hardhat test          # 6 tests pass: deploy, create, vote, double-vote block, count
```

**Tests Cover:**

- Deployment success
- Proposal creation/retrieval
- FOR/AGAINST voting
- Duplicate vote rejection
- Proposal counting

## 🔧 Configuration

### hardhat.config.js

```js
networks: {
  localhost: { url: \"http://127.0.0.1:8545\", chainId: 31337 },
  sepolia: { /* .env: SEPOLIA_RPC_URL + PRIVATE_KEY */ }
}
```

### .env Template (Sepolia)

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

## 📖 API Reference

### Contract ABI (app.js)

```js
[
  \"createProposal(string,uint)\", \"vote(uint,bool)\", \"getProposals()\",
  \"proposalCount()\", \"isActive(uint)\", \"hasVoted(uint,address)\"
]
```

### Key Functions

| Function                                | Access | Returns    | Purpose                  |
| --------------------------------------- | ------ | ---------- | ------------------------ |
| `createProposal(title, desc, duration)` | Public | Event      | Creates timed proposal   |
| `vote(index, support)`                  | Public | Event      | Records vote (protected) |
| `getProposals()`                        | View   | Proposal[] | All proposals data       |
| `proposalCount()`                       | View   | uint       | Total proposals          |

## 🎨 Design System

- **Colors**: Dark navy (#141b2b), Blue (#6690ff), Emerald (#10b981)
- **Typography**: Poppins 400/600/700/800
- **Effects**: Glassmorphism, Gradients, Backdrop blur
- **Icons**: Lucide (shield-check, users, zap, etc.)
- **Responsive**: Mobile-first, 4 breakpoints

## 🔍 Troubleshooting

| Issue             | Solution                                 |
| ----------------- | ---------------------------------------- |
| \"Wrong network\" | MetaMask → Localhost 8545 (31337)        |
| No proposals      | Deploy contract, update `app.js` address |
| \"Already voted\" | Expected - per-user per-proposal         |
| Tests fail        | `npx hardhat compile` first              |
| Tx pending        | Hardhat node running? Refresh page       |

## 🚀 Next Steps / Improvements

- [ ] Token-weighted voting (ERC20 balance)
- [ ] Proposal quorum threshold
- [ ] Execute passed proposals
- [ ] IPFS description storage
- [ ] Production deploy (Vercel + Alchemy)
- [ ] Multicall batching for perf

## 📄 License

MIT - Free to fork/extend

**Deployed Local Contract:** `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Update after redeploy)

---

_Generated automatically by BLACKBOXAI from project analysis. Last updated: Current session._
