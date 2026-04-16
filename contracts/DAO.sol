// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DAO {
    struct Proposal {
        string title;
        string description;
        uint forVotes;
        uint againstVotes;
        uint deadline;
    }

    Proposal[] public proposals;
    
    // ✅ Track who voted on which proposal
    mapping(uint => mapping(address => bool)) public hasVoted;

    // ✅ Events for frontend to listen to
    event ProposalCreated(uint indexed id, string title, uint deadline);
    event Voted(uint indexed id, address voter, bool support);

    // ✅ Create proposal
    function createProposal(
        string memory _title, 
        string memory _desc, 
        uint duration
    ) public {
        proposals.push(Proposal(_title, _desc, 0, 0, block.timestamp + duration));
        emit ProposalCreated(proposals.length - 1, _title, block.timestamp + duration);
    }

    // ✅ Vote with duplicate protection
    function vote(uint index, bool support) public {
        require(index < proposals.length, "Proposal does not exist");
        require(block.timestamp < proposals[index].deadline, "Voting ended");
        require(!hasVoted[index][msg.sender], "Already voted");

        hasVoted[index][msg.sender] = true;

        if (support) {
            proposals[index].forVotes++;
        } else {
            proposals[index].againstVotes++;
        }

        emit Voted(index, msg.sender, support);
    }

    // ✅ Get all proposals
    function getProposals() public view returns (Proposal[] memory) {
        return proposals;
    }

    // ✅ Get proposal count (needed by frontend)
    function proposalCount() public view returns (uint) {
        return proposals.length;
    }

    // ✅ Check if voting is still active
    function isActive(uint index) public view returns (bool) {
        require(index < proposals.length, "Proposal does not exist");
        return block.timestamp < proposals[index].deadline;
    }
}