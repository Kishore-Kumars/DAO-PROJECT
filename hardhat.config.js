require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

// Warnings
if (!PRIVATE_KEY) console.warn("⚠️  WARNING: PRIVATE_KEY not set in .env");
if (!SEPOLIA_RPC_URL) console.warn("⚠️  WARNING: SEPOLIA_RPC_URL not set in .env");

// Normalize private key
const normalizedPrivateKey =
  PRIVATE_KEY && PRIVATE_KEY.length > 0
    ? PRIVATE_KEY.startsWith("0x")
      ? PRIVATE_KEY
      : `0x${PRIVATE_KEY}`
    : undefined;

// Base networks
const networks = {
  hardhat: {},
  localhost: {
    url: "http://127.0.0.1:8545",
    chainId: 31337,
  },
};

if (normalizedPrivateKey) {
  networks.localhost.accounts = [normalizedPrivateKey];
}

// Conditionally add Sepolia
if (SEPOLIA_RPC_URL && normalizedPrivateKey) {              // ✅ Check both
  networks.sepolia = {
    url: SEPOLIA_RPC_URL,
    accounts: [normalizedPrivateKey],
    chainId: 11155111,
  };
}

module.exports = {
  solidity: "0.8.24",
  networks,
};