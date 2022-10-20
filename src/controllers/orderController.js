//=======================================Importing Module and Packages================================================
const orderModel = require("../Model/orderModel")
const cartModel = require("../Model/cartModel")
const userModel = require("../Model/userModel")
const mongoose = require("mongoose")
const validator = require("../validation/validation")
//======================================================createOrder========================================================
const createOrder = async function (req, res) {
    try {
        let userId = req.params.userId
        if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "userId is invalid" })
        let findUser = await userModel.findOne({ _id: userId })
        if (!findUser) return res.status(404).send({ status: false, message: "userId is not found" })

        let data = req.body
        if (!validator.isValidBody(data)) {
            return res.status(400).send({ status: false, message: "please provide data in the body" })
        }

        let { cancellable, cartId } = data
        if (!cartId) {
            return res.status(400).send({ status: false, message: "please provide a cartId" })
        }

        if (!validator.isValid(cartId)) return res.status(400).send({ status: false, message: "Incorrect cartId" })
        if (!mongoose.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "cartId is invalid" })

        const checkCart = await cartModel.findById(cartId)
        if (!checkCart) {
            return res.status(404).send({ status: false, message: "cart not found" })
        }

        if (checkCart.items.length === 0) return res.status(400).send({ status: false, message: "Cart is empty cannot place an order!" })

        let orderData = checkCart.toObject()
        delete orderData["_id"]

        orderData["totalQuantity"] = 0
        let itemsArr = checkCart.items
        for (i = 0; i < itemsArr.length; i++) {
            orderData.totalQuantity += itemsArr[i].quantity
        }

        if (cancellable != undefined) {
            if (!(cancellable == "true" || cancellable == "false" || typeof cancellable === "boolean"))
                return res.status(400).send({ status: false, message: "cancellable should be Boolean or true/false" })
            orderData["cancellable"] = cancellable
        }

        checkCart.items = []
        checkCart.totalPrice = 0
        checkCart.totalItems = 0
        checkCart.save()
        const order = await orderModel.create(orderData)
        return res.status(201).send({ status: true, message: "order created Successfully", data: order })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}
//======================================================updateOrder========================================================
const updateOrder = async (req, res) => {
    try {
        let userId = req.params.userId
        if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "You entered an invalid userId" })

        let findUser = await userModel.findById({ _id: userId })
        if (!findUser) return res.status(404).send({ status: false, message: "No such User found" })

        let cartId = req.body.cartId
        if (!cartId)
            return res.status(400).send({ status: false, message: "cartId is required" })
        if (!mongoose.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "You entered an invalid cartId" })
        let findCart = await cartModel.findById({ _id: cartId })
        if (!findCart)
            return res.status(404).send({ status: false, message: "No cart found....." })

        let data = req.body
        if (!validator.isValidBody(data)) {
            return res.status(400).send({ status: false, message: "please provide data in the body" })
        }

        let orderId = req.body.orderId

        if (!validator.isValidBody(data)) {
            return res.status(400).send({ status: false, message: "please provide data in the body" })
        }

        if (!orderId)
            return res.status(400).send({ status: false, message: "OrderId is required" })

        if (!mongoose.isValidObjectId(orderId))
            return res.status(400).send({ status: false, message: "You entered an invalid orderId" })

        let findOrder = await orderModel.findOne({ _id: orderId })
        if (!findOrder)
            return res.status(404).send({ status: false, message: "No such Order found" })

        let status = req.body.status
        if (!status) {
            return res.status(400).send({ status: false, message: "Please provide status to update.." })
        }
        else {
            let statusEnum = ["pending", "completed", "cancled"]
            if (!statusEnum.includes(status))
                return res.status(400).send({ status: false, message: "Order status should be only Pending,completed,cancled" })

            if (status == "cancled") {
                let checkCancellable = await orderModel.findOne({ _id: orderId, cancellable: true })
                if (!checkCancellable)
                    return res.status(400).send({ status: false, message: "This order cannot be cancelled" })

                if (checkCancellable.status == 'cancled')
                    return res.status(400).send({ status: false, message: "This order is already canceled" })
                checkCancellable.status = status

                let updateOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: checkCancellable }, { new: true })

                return res.status(200).send({ status: true, message: "status updated successfully", data: updateOrder })
            }
            if (status == "completed") {
                if (findOrder.status == "completed")
                    return res.status(400).send({ status: false, message: "This order is already completed" })

                findOrder.status = status

                let updateOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: findOrder }, { new: true })

                return res.status(200).send({ status: true, message: "status updated successfully", data: updateOrder })
            }
            else {
                if (findOrder.status == "pending")
                    return res.status(400).send({ status: false, message: "Order status is already pending..." })
            }
        }
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}
//======================================Module Export===========================================================
module.exports = { createOrder, updateOrder }