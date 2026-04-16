const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Contract", function () {
  let dao, owner, voter1, voter2;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();
  });

  // ✅ Test 1
  it("Should deploy successfully", async function () {
    expect(dao.target).to.not.equal(0);
  });

  // ✅ Test 2
  it("Should create a proposal", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    const proposals = await dao.getProposals();
    expect(proposals.length).to.equal(1);
    expect(proposals[0].title).to.equal("Buy Server");
  });

  // ✅ Test 3
  it("Should vote for a proposal", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await dao.connect(voter1).vote(0, true);
    const proposals = await dao.getProposals();
    expect(proposals[0].forVotes).to.equal(1);
  });

  // ✅ Test 4
  it("Should vote against a proposal", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await dao.connect(voter1).vote(0, false);
    const proposals = await dao.getProposals();
    expect(proposals[0].againstVotes).to.equal(1);
  });

  // ✅ Test 5
  it("Should NOT allow double voting", async function () {
    await dao.createProposal("Buy Server", "We need a server", 3600);
    await dao.connect(voter1).vote(0, true);
    await expect(
      dao.connect(voter1).vote(0, true)
    ).to.be.revertedWith("Already voted");
  });

  // ✅ Test 6
  it("Should return correct proposal count", async function () {
    await dao.createProposal("Proposal 1", "Desc 1", 3600);
    await dao.createProposal("Proposal 2", "Desc 2", 3600);
    expect(await dao.proposalCount()).to.equal(2);
  });
});