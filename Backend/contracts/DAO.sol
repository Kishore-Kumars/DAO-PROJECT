// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title A simple DAO for creating and voting on proposals.
 * @dev This contract is designed to work with the frontend application.
 *      It aligns with the ABI defined in `app.js`.
 */
contract DAO {
    // This struct matches the tuple structure expected by the frontend's ABI.
    struct Proposal {
        string title;
        string description;
        uint forVotes;
        uint againstVotes;
        uint deadline;
    }

    // An array to store all proposals.
    Proposal[] public proposals;

    // A nested mapping to track if a user has voted on a specific proposal.
    // mapping(proposalIndex => mapping(voterAddress => hasVoted))
    mapping(uint => mapping(address => bool)) public voted;

    // Events to notify the frontend of on-chain activities.
    event ProposalCreated(uint indexed id, string title, uint deadline);
    event Voted(uint indexed id, address indexed voter, bool support);

    /**
     * @dev Creates a new proposal. The deadline is set based on the current
     *      block timestamp plus the provided duration in seconds.
     * @param _title The title of the proposal.
     * @param _desc A short description of the proposal.
     * @param _duration The voting duration in seconds (e.g., 300 for 5 minutes).
     */
    function createProposal(
        string memory _title,
        string memory _desc,
        uint _duration
    ) public {
        require(_duration > 0, "DAO: Duration must be positive");
        uint deadline = block.timestamp + _duration;

        proposals.push(
            Proposal({
                title: _title,
                description: _desc,
                forVotes: 0,
                againstVotes: 0,
                deadline: deadline
            })
        );

        uint proposalId = proposals.length - 1;
        emit ProposalCreated(proposalId, _title, deadline);
    }

    /**
     * @dev Allows a user to vote on an active proposal.
     *      - It requires that the proposal exists.
     *      - It requires that the proposal's deadline has not passed.
     *      - It requires that the user has not already voted.
     * @param _index The index of the proposal to vote on.
     * @param _support A boolean indicating the vote (true for 'For', false for 'Against').
     */
    function vote(uint _index, bool _support) public {
        require(_index < proposals.length, "DAO: Proposal does not exist");
        require(isActive(_index), "DAO: Proposal is not active");
        require(!voted[_index][msg.sender], "DAO: You have already voted");

        Proposal storage p = proposals[_index];

        if (_support) {
            p.forVotes++;
        } else {
            p.againstVotes++;
        }

        voted[_index][msg.sender] = true;
        emit Voted(_index, msg.sender, _support);
    }

    /**
     * @dev Returns all created proposals. This function is the source of truth
     *      for the proposal list on the frontend.
     */
    function getProposals() public view returns (Proposal[] memory) {
        return proposals;
    }

    /**
     * @dev Returns the total number of proposals created. Used for stats.
     */
    function proposalCount() public view returns (uint) {
        return proposals.length;
    }

    /**
     * @dev Checks if a proposal's voting period is still active.
     *      The frontend also calculates this, but having it on-chain is robust
     *      and required for the `vote` function's security.
     */
    function isActive(uint _index) public view returns (bool) {
        require(_index < proposals.length, "DAO: Proposal does not exist");
        return block.timestamp < proposals[_index].deadline;
    }

    /**
     * @dev Checks if a specific address has already voted on a proposal.
     *      This is essential for the frontend's "My Votes" filter and for
     *      preventing double votes in the UI and contract.
     */
    function hasVoted(uint _index, address _voter) public view returns (bool) {
        require(_index < proposals.length, "DAO: Proposal does not exist");
        return voted[_index][_voter];
    }
}
