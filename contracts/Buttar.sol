// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

error OnlyOwnerError();
error NotEnoughLiquidity();
error ItemOutofStock();
error OutOfStock();
error QuantityNotAvailble();
error OnlySellerCanStopSell();
error OnlyBuyerCanCancel();
error TransferFailed();
error OrderCannotCanceled();
error AlreadySeller();
error SellerNotAvailble();
error SellerIsBlocked();
error OrderCannotDelivered();
error OrderCannotRecieved();
error OnlyBuyerCanRecieve();
error NotEnoughMoney();

contract Buttar {

    enum itemState {
        Availble,
        OutofStock
    }
    enum orderState {
        Placed,
        Delivered,
        Closed,
        Canceled,
        Recieved
    }
    enum sellerState {
        Open,
        Block
    }

    struct Product {
        // uint256 productId;
        address productHash;
        uint256 productPrice;
        address sellerId;
        itemState state;
    }

    struct Order {
        address buyer;
        uint256 bill;
        uint256[] productList;
        uint256[] productQuantityList;
        orderState state;
    }

    struct Seller {
        uint256 sellerAmount;
        uint256 sellerTotalLiquidity;
        uint256 sellerAvailbleLiquidity;
        sellerState state;
    }

    address public immutable i_owner;

    Product[] product;
    // mapping (address => product) product;
    //productId to Product
    mapping (uint256 => Product) products;
    mapping (uint256 => uint256) productQuantity;

    Seller[] sellers;
    mapping (address => Seller) seller;
    mapping(address => bool) isSeller;

    address[] buyer;
    mapping (address => uint256[]) buyerCart;
    mapping (address => uint256) buyerBill;
    mapping (address => mapping (uint256 => uint256) ) buyerProductQuantity;

    Order[] orders;
    //orderId to Order
    mapping (uint256 => Order) order;
    mapping (uint256 => address) orderBuyerAddress;

    uint256 Liquidity;
    uint256 currentProductId;
    uint256 currentOrderId;

    uint256 TotalContractAssests;

    event SellerAdded(address indexed sellerAddress);
    event LiquidityProvided(address indexed selleAddress, uint256 liquidityAmount);

    event ProductAdded(uint256 indexed productId, uint256 productPrice, uint256 productAmount);
    event OrderPlaced(uint256 indexed OrderId, uint256[] productList, uint256[] productQunatity, uint256 bill);
    event OrderDeliverd(uint256 indexed OrderId);
    event OrderRecieved(uint256 indexed OrderId);
    event OrderCanceled(uint256 indexed OrderId);

    event SellerBlocked(address indexed sellerAddress);

    event SellStoped(uint256 productId);

    modifier onlyOwner {
        // require(msg.sender == i_owner, OnlyOwnerError);
        _;
    }

    constructor() {
        i_owner = msg.sender;
        Liquidity = 0;
        currentProductId = 0;
        currentOrderId = 0;
        TotalContractAssests = 0;
    }

    function becomeSeller() public payable {
        if(isSeller[msg.sender]) {
            revert AlreadySeller();
        }
        // sellers.push(payable(msg.sender));
        
        Seller memory newSeller;
        newSeller.sellerAmount = 0;
        newSeller.sellerTotalLiquidity = 0;
        newSeller.sellerAvailbleLiquidity = 0;
        newSeller.state = sellerState(0);
// 
        sellers.push(newSeller);
        seller[msg.sender] = newSeller;
        isSeller[msg.sender] = true;
        provideLiquid(msg.sender);

        emit SellerAdded(msg.sender);
    }

    function provideLiquid(address _seller) public payable {
        if(!isSeller[_seller]){
            revert SellerNotAvailble();
        }
        if(seller[_seller].state == sellerState(1)){
            revert SellerIsBlocked();
        }
        seller[_seller].sellerTotalLiquidity += msg.value;
        seller[_seller].sellerAvailbleLiquidity = seller[_seller].sellerTotalLiquidity - 1000 wei;
        Liquidity += msg.value;

        emit LiquidityProvided(msg.sender, msg.value);
    }

    function sell(address _productHash, uint256 _productPrice, uint256 _productQuantity) public {
        if(seller[msg.sender].sellerAvailbleLiquidity < _productPrice * _productQuantity){
            revert NotEnoughLiquidity();
        }
        if(seller[msg.sender].state == sellerState(1)){
            revert SellerIsBlocked();
        }
        Product memory newProduct;
        newProduct.productHash = _productHash;
        newProduct.productPrice = _productPrice;
        newProduct.sellerId = msg.sender;
        newProduct.state = itemState(0);

        products[currentProductId] = newProduct;
        productQuantity[currentProductId] = _productQuantity;
        seller[msg.sender].sellerAvailbleLiquidity -= _productPrice * _productQuantity;

        product.push(newProduct);

        emit ProductAdded(currentProductId, _productPrice, _productQuantity);
        currentProductId++;
    }

    function purchase(uint256[] memory _id, uint256[] memory _quantity) public payable {
        uint256 bill = 0 wei;
        for (uint i = 0; i < _id.length; i++) {
            if(products[_id[i]].state == itemState(1)){
                revert OutOfStock();
            }
            if(productQuantity[_id[i]] < _quantity[i]) {
                revert QuantityNotAvailble();
            }
            bill += products[_id[i]].productPrice * _quantity[i];
        }
        if(bill > msg.value) {
            revert NotEnoughMoney();
        }
        buyer.push(payable(msg.sender));
        Order memory newOrder;
        newOrder.buyer = msg.sender;
        newOrder.bill = bill;
        newOrder.productList = _id;
        newOrder.productQuantityList = _quantity;
        orders.push(newOrder);
        order[currentOrderId] = newOrder;
        orderBuyerAddress[currentOrderId] = msg.sender;

        orders.push(newOrder);
        if(msg.value > bill) {
            (bool success, ) = msg.sender.call{ value: msg.value - bill}("");
            if(!success) {
                revert TransferFailed();
            }
        }

        order[currentOrderId].state = orderState(0); 
        currentOrderId++;
        emit OrderPlaced(currentOrderId, _id, _quantity, bill);
    }

    function stopSell(uint256 _id) public {
        if(products[_id].sellerId != msg.sender) {
            revert OnlySellerCanStopSell();
        }
        products[_id].state = itemState(1);

        emit SellStoped(_id);
    }

    function deliverOrder(uint256 _id) public {
        if(order[_id].state != orderState(0)) {
            revert OrderCannotDelivered();
        }
        order[_id].state = orderState(1);

        emit OrderDeliverd(_id);
    }

    function recieveOrder(uint256 _id) public {
        if(order[_id].buyer != msg.sender || i_owner != msg.sender) {
            revert OnlyBuyerCanRecieve();
        }
        //NOTE
            //anyone can call recieveOrder function which cause the potential error
        if(order[_id].state != orderState(1)) {
            revert OrderCannotRecieved();
        }
        Order memory myOrder = order[_id];
        order[_id].state = orderState(4);
        uint256 myPrice = 0;
        for (uint i = 0; i < myOrder.productList.length; i++) {
            myPrice=0;
            productQuantity[myOrder.productList[i]] -= myOrder.productQuantityList[i];
            if(productQuantity[myOrder.productList[i]] == 0) {
                products[myOrder.productList[i]].state = itemState(1);
            }
            myPrice =  products[myOrder.productList[i]].productPrice * myOrder.productQuantityList[i];
            seller[products[myOrder.productList[i]].sellerId].sellerAmount += myPrice;
            seller[products[myOrder.productList[i]].sellerId].sellerAvailbleLiquidity += products[myOrder.productList[i]].productPrice * myOrder.productQuantityList[i];
        }

        emit OrderRecieved(_id);
    }

    function cancelOrder(uint256 _id) public {
        if(orderBuyerAddress[_id] != msg.sender) {
            revert OnlyBuyerCanCancel();
        }
        if(order[_id].state == orderState(2) || order[_id].state == orderState(3) || order[_id].state == orderState(4)){
            revert OrderCannotCanceled();
        }
        order[_id].state = orderState(3);
        returnBuyer(_id);

        emit OrderCanceled(_id);
    }

    function paySeller(address _seller) public payable onlyOwner {
        (bool success, ) = _seller.call{ value: seller[msg.sender].sellerAmount}("");
        if(!success) {
            revert TransferFailed();
        }
        seller[_seller].sellerAmount = 0;
    }

    function returnBuyer(uint256 _id) internal {
        (bool success, ) = order[_id].buyer.call{ value: order[_id].bill }("");
        if(!success) {
            revert TransferFailed();
        }
        order[_id].bill = 0;
    }

    function blockSeller(address _seller) public onlyOwner {
        seller[_seller].state = sellerState(1);
    }

    //pure functions
    // function calculateLiquidityLimit(int256 _amount) internal pure returns(int256) {
        // int256 liquid;

        // sellerAvailbleLiquidity[_seller] += _amount;
    // }

    //getters
    function getTotalContractBalance() public view returns(uint256) {
        return address(this).balance;
    }
    function getTotalLiquidity() public view returns(uint256) {
        return Liquidity;
    }

    function getSellerTotalLiquidity(address _seller) public view returns(uint256) {
        return seller[_seller].sellerTotalLiquidity;
    }
    function getSellerAvailbleLiquidity(address _seller) public view returns(uint256) {
        return seller[_seller].sellerAvailbleLiquidity;
    }
    function getSellerAmount() public view returns(uint256) {
        return seller[msg.sender].sellerAmount;
    }
    function getSellerState() public view returns(sellerState) {
        return seller[msg.sender].state;
    }

    function getCurrentProductId() public view returns(uint256) {
        return currentProductId;
    }
    function getCurrentOrderId() public view returns(uint256) {
        return currentOrderId;
    }

    function getProductHash(uint256 _id) public view returns(address) {
        return products[_id].productHash;
    }
    function getProductState(uint256 _id) public view returns(itemState) {
        return products[_id].state;
    }
    function getProductQuantity(uint256 _id) public view returns(uint256) {
        return productQuantity[_id];
    }

    function getOrderBuyerAddress(uint256 _id) public view returns(address) {
        return orderBuyerAddress[_id];
    }
    function getOrderState(uint256 _id) public view returns(orderState) {
        return order[_id].state;
    }
    function getOrderDetails(uint256 _id) public view returns(uint256[] memory) {
        return order[_id].productList;
    }
    function getOrderQuantity(uint256 _id) public view returns(uint256[] memory) {
        return order[_id].productQuantityList;
    }
    function getOrderBill(uint256 _id) public view returns(uint256) {
        return order[_id].bill;
    }

}