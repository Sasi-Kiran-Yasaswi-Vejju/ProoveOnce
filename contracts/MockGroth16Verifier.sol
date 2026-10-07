// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev TEST ONLY. Accepts every proof so contract logic can be unit-tested without a circuit.
contract MockGroth16Verifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[13] calldata
    ) external pure returns (bool) {
        return true;
    }
}
