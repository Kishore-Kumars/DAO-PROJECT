const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const abi = [
    "function getProposals() public view returns (tuple(string title, string description, uint forVotes, uint againstVotes, uint deadline)[])",
    "function proposalCount() public view returns (uint)"
  ];

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contract = new ethers.Contract(contractAddress, abi, provider);

  try {
    const count = await contract.proposalCount();
    console.log("Proposal Count:", count.toString());
    const proposals = await contract.getProposals();
    console.log("Proposals fetched successfully:", proposals.length);
  } catch (error) {
    console.error("Error interacting with contract:", error);
  }
}

main();
