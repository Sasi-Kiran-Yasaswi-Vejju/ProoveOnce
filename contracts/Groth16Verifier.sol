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
    uint256 constant alphax  = 14228199444446338851502444894874976131502136642301985381408940830197161454593;
    uint256 constant alphay  = 9187290950363372072934671499468609666592505765724780631690509894338961384859;
    uint256 constant betax1  = 21454882727370790782027241219218915324217655163340605494645206745130154992636;
    uint256 constant betax2  = 15248121548351946466382278689457586096707038802763062240900308085238209996479;
    uint256 constant betay1  = 1440080393462757517906590762806945113899196398321175616648659949122862645759;
    uint256 constant betay2  = 3823047451087230151323084337752672360588443590452265447908718821139789435771;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 1501721774053721282562371075595447631312448492146832548892230084314790884243;
    uint256 constant deltax2 = 11092591062652433211808440453636654327467227590509790560910313196144607291713;
    uint256 constant deltay1 = 20938003394000433927842865487159610336435158764561428456970711027456070077884;
    uint256 constant deltay2 = 3928416879927543703322817477398916153529472168446470208476903654434086707412;

    
    uint256 constant IC0x = 11630303254933036476620775808087479883107793031759622675464007460713316409973;
    uint256 constant IC0y = 16202112819053102423071853965972570821232761440380081860066801772118427117561;
    
    uint256 constant IC1x = 21751676185800137501779708757491016767949507602089966205679840026700893971166;
    uint256 constant IC1y = 15571205802311609687909790933471597831070694240711416595389882001461550010748;
    
    uint256 constant IC2x = 2985237108729167890491192425179131190754158652933204913585415633293163719412;
    uint256 constant IC2y = 20208463722180906436401259331813976120515228908343345747905181564126544750983;
    
    uint256 constant IC3x = 13807562178644646616663789138530755266620142882298308423417482701691541433777;
    uint256 constant IC3y = 13615102282222822533501431752635366493360838725581002692579402124041786973348;
    
    uint256 constant IC4x = 5433700484951412272238137707757059475589176395837478440705208268239906270685;
    uint256 constant IC4y = 8383715055530702632798612580293559796660139097826413810047215949248382974557;
    
    uint256 constant IC5x = 10105537606034883509856408067362417000602284355073975470189891286283267950215;
    uint256 constant IC5y = 12699224345686183409436568689702146782646571671304750379987176191529787084646;
    
    uint256 constant IC6x = 3955552507645091850660343572937743115417938981692185953183409724656483041022;
    uint256 constant IC6y = 12628799181279843403798762375013188958393889867419427623976454946405700301739;
    
    uint256 constant IC7x = 10134833696713781673689442235459570018081320730344803905188129368438689194886;
    uint256 constant IC7y = 7242592245359378517050917583516073797777681231477699695634468461771112278058;
    
    uint256 constant IC8x = 301998762693975994181649189164081588663217363425944887741084270801216048554;
    uint256 constant IC8y = 3189896080089493041799911827002793729828851509750207382119646822205701271587;
    
    uint256 constant IC9x = 7209117528625168820190299616468775392264121152836260716322027446362561013970;
    uint256 constant IC9y = 6726049170071691319869497541569789132981549635874205588556962283739157317931;
    
    uint256 constant IC10x = 4821706994902120959716903788502018472355281984191932959119215997106657325170;
    uint256 constant IC10y = 14410393247532961490831602404722794163702525577442231762143322612678508072385;
    
    uint256 constant IC11x = 15436343552803142217921360317303153963194387684391108298546813357541552421676;
    uint256 constant IC11y = 7244309523858302975809439450956402476143643297009255402119285757426388073537;
    
    uint256 constant IC12x = 17871225506026667019352737288144689039133069674097146972008831527426632591888;
    uint256 constant IC12y = 17156387307180960124243329891421476458191160069497099417633547361424939943841;
    
    uint256 constant IC13x = 20700992859230409591741669980532255044274659341226522612399499763689213757666;
    uint256 constant IC13y = 12858885694719679858538286380552521076592346847604443287649975295127051614415;
    
 
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
