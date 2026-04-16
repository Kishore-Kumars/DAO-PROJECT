const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();

  await dao.waitForDeployment();
  console.log("DAO deployed to:", await dao.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
