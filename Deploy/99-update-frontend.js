// const { frontEndContractFile, frontEndAbiFile } = require("../helper-hardhat-config");
// const { artifacts, deployments, network } = require("hardhat");
// const { fs } = require("fs");
// require("dotenv").config();

// module.exports = async () => {
//     if(process.env.UPDATE_FRONT_END) {
//         console.log("writing to frontend...");
//         await updateAbi();
//         await updateContractAddress();
//         console.log("write to frontend successfully");
//     }
// }

// async function updateAbi() {
//     const buttarArtifacts = await artifacts.readArtifact("Buttar");
    
//     if(buttarArtifacts && buttarArtifacts.abi && buttarArtifacts.abi.length > 0) {
//         fs.writeFileSync(frontEndAbiFile, JSON.stringify(buttarArtifacts.abi));
//         console.log("Write to frontend successful");
//     }
//     else {
//         console.log("Error: ABI is undefined, empty, or does not have a valid structure.")
//     }
// }

// async function updateContractAddress() {
//     const buttarAddress = (await deployments.get("Buttar")).address;
//     let addresses = {};
//     try {
//         const content = fs.readFilSync(frontEndContractFile, "utf-8");
//         if(content.trim() !== '') {
//             addresses = JSON.parse(content);
//         }

//         const chaidId = network.config.chainId.toString();
//         if(chainId in addresses) {
//             if(!addresses[chaidId].includes(buttarAddress)) {
//                 addresses[chainId] = buttarAddress;
//             }
//         }
//         else {
//             addresses[chainId] = [buttarAddress];
//         }

//         fs.writeFileSync(frontEndContractFile, JSON.stringify(addresses));
//     } catch (error) {
//         console.log(error);
//     }
// }