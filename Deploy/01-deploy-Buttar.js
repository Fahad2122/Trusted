const { ethers, network } = require("hardhat");
// const { verify } = require("../utils/verify");

module.exports = async ({getNamedAccounts, deployments}) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    // const chainId = network.config.chainId;

    console.log("Deploying the contract...")
    const Buttar = await deploy("Buttar", {
        from: deployer,
        args: [],
        log: true,
    })
    console.log(`contract deployed at ${Buttar.address}`);
    
    // if(chainId!==31337) {
    //     await verify(Buttar.address, []);
    // }

}

module.exports.tags = ["all", "buttar"];