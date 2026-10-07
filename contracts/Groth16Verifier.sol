// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 2800271829103249527672937385541249702243087897573470565746380707791570563254;
    uint256 constant alphay  = 3384798046049301597484830509423042034569390788181436030743456052519741840037;
    uint256 constant betax1  = 20192224144301785445286328152384455340699818742849635513645610083980278440765;
    uint256 constant betax2  = 18306365925933883109379479550346691744093397772801997897816582047662470135592;
    uint256 constant betay1  = 1238266152289675896331906474712639738559626529805588634408964782954022675433;
    uint256 constant betay2  = 14684484377879141326132755398102374374508385723601779251904578260112452168134;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 2048532214025132943427770079070998880542977753300960858931261107858174918580;
    uint256 constant deltax2 = 16006027876859272623204067745577656632819292670297262784121427312002111867744;
    uint256 constant deltay1 = 20443825600101670473965578398752934736802880026477140797276010976932302564202;
    uint256 constant deltay2 = 16041322286332621734925546664662401005052081867202728645401840247907038468127;

    
    uint256 constant IC0x = 1939705264847278184831998795465020081503938390047498604751443503706254401184;
    uint256 constant IC0y = 5750292950197455431820949109525741572817096670704229874621597115228853859053;
    
    uint256 constant IC1x = 2710789180146945581613977721843166644494132066303655289127238044462113439846;
    uint256 constant IC1y = 17994282116176836820057299703062018270665805565447452805635568577777163039096;
    
    uint256 constant IC2x = 21144354334318784572277276804340378508150085943893584001422941916198451126301;
    uint256 constant IC2y = 9524559556165513919514120250859785296587546134395633840711965868055668754214;
    
    uint256 constant IC3x = 7768525907087689626174726569869196291569290169512945565054323126739309493463;
    uint256 constant IC3y = 16616131578516524670577452530700089179405267937475617329364017473356953336632;
    
    uint256 constant IC4x = 15596114824758165878533503904955507598636455952968609721525436252911847387203;
    uint256 constant IC4y = 3470023799077799553731635121059553664202222104137921284565939074530338964607;
    
    uint256 constant IC5x = 18746625724972497654276782474833948415925611834134904113877474622827855633363;
    uint256 constant IC5y = 836568618199230446523264821327381695361108316403716244388251402469133903007;
    
    uint256 constant IC6x = 20259491389760693452365664374462882769430517074578939791275852378114120859401;
    uint256 constant IC6y = 20530930968374324193475986929659033863942685053475276549301368717060044885063;
    
    uint256 constant IC7x = 18201711003883654322247829682961043833734626374010205154434591614163456924674;
    uint256 constant IC7y = 20115990502767884216204673750090815163259904099029739613177262064356763374005;
    
    uint256 constant IC8x = 16901835220344535003176052215616555001531926471485890550013273818487232534969;
    uint256 constant IC8y = 16834456586820277803958204543831938557645126356835034889541742555419253804475;
    
    uint256 constant IC9x = 875383078761978288462256215128083687207015462805521146133378291783439428095;
    uint256 constant IC9y = 9023673884708052745856365898897538751514766794972023838022964325622755417479;
    
    uint256 constant IC10x = 2227551104249066827470386276044378319748835223629564639396520140857774290778;
    uint256 constant IC10y = 5294594387613192315185588665561957523386532066657185051614256309687528187052;
    
    uint256 constant IC11x = 10873057763326548507244995220738575508916550267542157789251609470481817186718;
    uint256 constant IC11y = 4447766385454138553821432803722583198862209329045887079262851487299948373114;
    
    uint256 constant IC12x = 17240475726988882577693125939398442779446252335049481417006896105586428961208;
    uint256 constant IC12y = 5888267874743616455210120512921919261834706284812635928291862840052675219959;
    
    uint256 constant IC13x = 11809071780602040451040923403262925403286390493259277421346298227002794929661;
    uint256 constant IC13y = 18182610318375135074240260802477892912632810757277758707791370735773315429031;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[13] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
