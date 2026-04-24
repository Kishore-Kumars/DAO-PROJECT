const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Contract", function () {
  let dao, govToken, owner, voter1, voter2;
  const initialSupply = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();

    const GovToken = await ethers.getContractFactory("GovToken");
    govToken = await GovToken.deploy();
    await govToken.waitForDeployment();

    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(await govToken.getAddress());
    await dao.waitForDeployment();

    // Distribute tokens
    await govToken.transfer(voter1.address, ethers.parseEther("100"));
    await govToken.transfer(voter2.address, ethers.parseEther("50"));
  });

  it("Should deploy successfully", async function () {
    expect(await dao.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await dao.governanceToken()).to.equal(await govToken.getAddress());
  });

  it("Should create a proposal", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    const proposals = await dao.getProposals();
    expect(proposals.length).to.equal(1);
    expect(proposals[0].title).to.equal("Buy Server");
  });

  it("Should vote for a proposal with weight", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await dao.connect(voter1).vote(0, true);
    const proposals = await dao.getProposals();
    expect(proposals[0].forVotes).to.equal(ethers.parseEther("100"));
  });

  it("Should vote against a proposal with weight", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await dao.connect(voter2).vote(0, false);
    const proposals = await dao.getProposals();
    expect(proposals[0].againstVotes).to.equal(ethers.parseEther("50"));
  });

  it("Should NOT allow voting without tokens", async function () {
    const [_, __, ___, nonHolder] = await ethers.getSigners();
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await expect(
      dao.connect(nonHolder).vote(0, true)
    ).to.be.revertedWith("No voting power");
  });

  it("Should NOT allow double voting", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await dao.connect(voter1).vote(0, true);
    await expect(
      dao.connect(voter1).vote(0, true)
    ).to.be.revertedWith("Already voted");
  });

  it("Should return correct proposal count", async function () {
    await dao.createProposal("Proposal 1", "Desc 1", 3600);
    await dao.createProposal("Proposal 2", "Desc 2", 3600);
    expect(await dao.proposalCount()).to.equal(2);
  });
});
