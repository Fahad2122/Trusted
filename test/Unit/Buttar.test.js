const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name) ? describe.skip : 
describe("Buttar", function () {

    let deployer, buttarAddress, buttar, account1, account2;

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        account1 = (await getNamedAccounts()).account1;
        account2 = (await getNamedAccounts()).account2;

        await deployments.fixture(["buttar"]);

        buttarAddress = (await deployments.get("Buttar")).address;
        buttar = await ethers.getContractAt("Buttar", buttarAddress); 
    })

    describe("constructor", function () {
        it("sets the initial parameters to 0", async () => {
            assert.equal((await buttar.getTotalLiquidity()).toString(), "0");
            assert.equal((await buttar.getCurrentProductId()).toString(), "0");
            assert.equal((await buttar.getCurrentOrderId()).toString(), "0");
            assert.equal((await buttar.getTotalContractBalance()).toString(), "0");
        })
        it("sets the owner address correctaly", async () => {
            const owner = await buttar.i_owner();
            assert.equal(owner.toString(), deployer);
        })
    })

    describe("becomeSeller", function () {
        beforeEach(async () => {
            await buttar.becomeSeller({value: 10000});
        })
        it("register the seller successfully", async () => {
            const sellerTotalLiquidity = await buttar.getSellerTotalLiquidity(deployer);
            const sellerAvailbleLiquidity = await buttar.getSellerAvailbleLiquidity(deployer);
            assert.equal(sellerTotalLiquidity.toString(), "10000");
            assert.equal(sellerAvailbleLiquidity.toString(), "9000");
        })
        it("reverts if the person is already a seller", async () => {
            await expect(buttar.becomeSeller({value: 1000})).to.be.revertedWithCustomError(buttar, "AlreadySeller");
        })
    })

    describe("provideLiquid", function () {
        it("reverts if the seller is not avalible", async () => {
            await expect(buttar.provideLiquid(account1)).to.be.revertedWithCustomError(buttar, "SellerNotAvailble");
        })
        it("reverts if the seller is blocked", async () => {
            await buttar.becomeSeller({value: 10000});
            await buttar.blockSeller(deployer);
            await expect(buttar.provideLiquid(deployer, {value: 2000})).to.be.revertedWithCustomError(buttar, "SellerIsBlocked");
        })
        it('provides the liquidity correctaly', async () => {
            await buttar.becomeSeller({value: 10000});
            await buttar.provideLiquid(deployer, {value: 2000})
            assert.equal((await buttar.getSellerTotalLiquidity(deployer)).toString(), "12000");
            assert.equal((await buttar.getSellerAvailbleLiquidity(deployer)).toString(), "11000");
            assert.equal((await buttar.getTotalLiquidity()).toString(), "12000");
        })
    })

    describe("sell", function () {
        beforeEach(async () => {
            await buttar.becomeSeller({value: 10000});
        })
        it("reverts if there is not enough Liquidity", async () => {
            await expect(buttar.sell(account2, 12000, 20)).to.be.revertedWithCustomError(buttar, "NotEnoughLiquidity");
        })
        it("reverts if seller is blocked", async () => {
            await buttar.blockSeller(deployer);
            await expect(buttar.sell(account2, 2000, 2)).to.be.revertedWithCustomError(buttar, "SellerIsBlocked");
        })
        it("added the product for sell", async () => {
            await buttar.sell(account2, 2000, 2);
            const productId = Number(await buttar.getCurrentProductId()) - 1;
            assert.equal((await buttar.getProductHash(productId)).toString(), account2);
            assert.equal((await buttar.getProductState(productId)).toString(), "0");
            assert.equal((await buttar.getProductQuantity(productId)).toString(), "2");
        })
        it("should handle the seller availble liquidity correctaly", async () => {
            await buttar.sell(account2, 2000, 2);
            assert.equal((await buttar.getSellerAvailbleLiquidity(deployer)).toString(), "5000");
        })
    })

    describe("purchase", function () {
        beforeEach(async () => {
            await buttar.becomeSeller({value: 12000});
            await buttar.sell(account1, 100, 20);
            await buttar.sell(account2, 80, 5);
        })
        it("should revert with out of stock error", async () => {
            await buttar.stopSell(0);
            await expect(buttar.purchase([0], [10], {value: 12000})).to.be.revertedWithCustomError(buttar, "OutOfStock");
            await buttar.stopSell(1);
            await expect(buttar.purchase([1], [4], {value: 10000})).to.be.revertedWithCustomError(buttar, "OutOfStock");
        })
        it("should revert if order quanity is more than availble", async () => {
            await expect(buttar.purchase([0, 1], [25, 3], {value: 2400})).to.be.revertedWithCustomError(buttar, "QuantityNotAvailble");
            await expect(buttar.purchase([0, 1], [10, 8], {value: 2400})).to.be.revertedWithCustomError(buttar, "QuantityNotAvailble");
        })
        it("should if buyer pay less than required amount", async () => {
            await expect(buttar.purchase([0], [10], {value: 800})).to.be.revertedWithCustomError(buttar, "NotEnoughMoney");
        })
        it("should calculate the bill successfully", async () => {
            await buttar.purchase([0, 1], [6, 3], {value: 840});
            const orderId = Number(await buttar.getCurrentOrderId()) - 1;
            const bill = await buttar.getOrderBill(orderId);
            assert.equal(bill.toString(), "840")
        })
        it("should sends back the extra to buyer", async () => {
            // const beforeSellBalance = Number(await ethers.provider.getBalance(deployer));
            await buttar.purchase([0], [10], {value: 1000000000000000})
            // const reciept = await ethers.provider.getTransactionReceipt(purchase.hash);
            // const gas = Number(reciept.gasUsed) * Number(reciept.gasPrice);
            // const afterSellBalance = Number(await ethers.provider.getBalance(deployer));
            const balance = await buttar.getTotalContractBalance();
            const orderId = Number(await buttar.getCurrentOrderId()) - 1;
            const bill = await buttar.getOrderBill(orderId);
            assert.equal(balance, 12000+1000);
            assert.equal(bill, 1000);
        })
        it("should purchase the items successfully", async () => {
            await buttar.purchase([1, 0], [4, 5], {value: 900});
            const orderId = Number(await buttar.getCurrentOrderId()) - 1;
            assert.equal((await buttar.getOrderBuyerAddress(orderId)).toString(), deployer);
            assert.equal((await buttar.getOrderState(orderId)).toString(), "0");
            assert.equal((await buttar.getOrderDetails(orderId)).toString(), "1,0");
            assert.equal((await buttar.getOrderQuantity(orderId)).toString(), "4,5");
            assert.equal((await buttar.getOrderBill(orderId)).toString(), "820");
        })
    })

    describe("stopSell", function () {
        let productId;
        beforeEach(async () => {
            await buttar.becomeSeller({value: 12000});
            await buttar.sell(account1, 100, 20);
            productId = Number(await buttar.getCurrentProductId()) - 1;
        })
        // it("should revert with only seller can stop sell", async () => {
        //     await expect(buttar.stopSell(productId, {from: account2})).to.be.revertedWithCustomError(buttar, "OnlySellerCanStopSell");
        // })
        it("should stop the sell successfully", async () => {
            await buttar.stopSell(productId);
            assert.equal((await buttar.getProductState(productId)), "1");
        })
    })

    describe("deliverOrder", function () {
        let orderId;
        beforeEach(async() => {
            await buttar.becomeSeller({value: 12000});
            await buttar.sell(account1, 100, 20);
            await buttar.purchase([0], [10], {value: 1000});
            orderId = Number(await buttar.getCurrentOrderId()) - 1;
        })
        it("should not delivered the order", async () => {
            await buttar.cancelOrder(orderId);
            await expect(buttar.deliverOrder(orderId)).to.be.revertedWithCustomError(buttar, "OrderCannotDelivered")
        })
        it("should deliver the order successfully", async () => {
            await buttar.deliverOrder(orderId);
            assert.equal((await buttar.getOrderState(orderId)).toString(), "1");
        })
    })

    describe("recieveOrder", function () {
        let orderId;
        beforeEach(async () => {
            await buttar.becomeSeller({value: 12000});
            await buttar.sell(account1, 100, 20);
            await buttar.sell(account2, 80, 10);
            await buttar.purchase([1, 0], [4, 6], {value: 920});
            orderId = Number(await buttar.getCurrentOrderId()) - 1;
        })
        // it("should only buyer or contract owner can recieve the order", async () => {
        //     await expect(buttar.recieveOrder(orderId), {from: account2}).to.be.revertedWithCustomError(buttar, "OnlyBuyerCanRecieve");
        // })
        it("Should not recieve order if not deliverd", async () => {
            await expect(buttar.recieveOrder(orderId)).to.be.revertedWithCustomError(buttar, "OrderCannotRecieved");
        })
        it("should update the product quantity successfully", async () => {
            await buttar.deliverOrder(orderId);
            await buttar.recieveOrder(orderId);
            assert.equal((await buttar.getProductQuantity(0)).toString(), "14");
            assert.equal((await buttar.getProductQuantity(1)).toString(), "6");
        })
        it("should update the seller amount successfully", async () => {
            await buttar.deliverOrder(orderId);
            await buttar.recieveOrder(orderId);
            assert.equal((await buttar.getSellerAmount()), "920")
        })
        it("should update the seller liquidity sucessfully", async () => {
            await buttar.deliverOrder(orderId);
            await buttar.recieveOrder(orderId);
            assert.equal(Number(await buttar.getSellerAvailbleLiquidity(deployer)), 12000-1000-2000-800+920);
        })
        it("should update the order state successfully", async () => {
            await buttar.deliverOrder(orderId);
            await buttar.recieveOrder(orderId);
            assert.equal((await buttar.getOrderState(orderId)).toString(), "4");
        })
    })

    describe("cancelOrder", function () {
        beforeEach(async () => {
            await buttar.becomeSeller({value: 12000});
            await buttar.sell(account1, 100, 20);
            await buttar.sell(account2, 80, 10);
            await buttar.purchase([1, 0], [4, 6], {value: 920});
            orderId = Number(await buttar.getCurrentOrderId()) - 1;            
        })
        it("should not cancle order after recieve", async () => {
            await buttar.deliverOrder(orderId);
            await buttar.recieveOrder(orderId);
            await expect(buttar.cancelOrder(orderId)).to.be.revertedWithCustomError(buttar, "OrderCannotCanceled");
            assert.equal(Number(await buttar.getTotalContractBalance()), 12920);
        })
        it("should cancle the order successfully", async () => {
            await buttar.deliverOrder(orderId);
            await buttar.cancelOrder(orderId);
            assert.equal((await buttar.getOrderState(orderId)).toString(), "3");
            assert.equal((await buttar.getOrderBill(orderId)).toString(), "0");
            assert.equal(Number(await buttar.getTotalContractBalance()), 12000)
        })
    })

    describe("paySeller", function () {
        beforeEach(async () => {
            await buttar.becomeSeller({value: 12000});
            await buttar.sell(account1, 100, 20);
            await buttar.sell(account2, 80, 10);
            await buttar.purchase([1, 0], [4, 6], {value: 920});
            orderId = Number(await buttar.getCurrentOrderId()) - 1;            
            await buttar.deliverOrder(orderId);
            await buttar.recieveOrder(orderId);
        })
        it("should deliver the seller successfully", async () => {
            assert.equal((await buttar.getSellerAmount()).toString(), "920");
            await buttar.paySeller(deployer);
            assert.equal((await buttar.getSellerAmount()).toString(), "0");
        })
    })

    describe("blockSeller", function () {
        beforeEach(async () => {
            await buttar.becomeSeller({value: 12000});
        })
        it("should block the seller successfully", async () => {
            await buttar.blockSeller(deployer);
            assert.equal((await buttar.getSellerState()).toString(), "1");
        })
    })
})