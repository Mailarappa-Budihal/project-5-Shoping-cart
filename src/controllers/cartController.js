//=======================================Importing Module and Packages=======================================//
const cartModel = require("../Model/cartModel")
const userModel = require("../Model/userModel")
const productModel = require("../Model/productModel")
const mongoose = require("mongoose")
const validator = require("../validation/validation")
    //======================================================createCart==================================//
const createCart = async function(req, res) {
    try {
        let userId = req.params.userId
        if (!userId) return res.status(400).send({ status: false, message: "userId is required" })
        if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: `${userId} is not a valid userId` })
        let user = await userModel.findById(userId)
        if (!user) return res.status(404).send({ status: false, message: "userId not found" })

        let data = req.body
        if (!validator.isValidBody(data)) {
            return res.status(400).send({ status: false, message: "please provide some in the cart body" })
        }

        let { productId, quantity, cartId } = data

        if (!productId) return res.status(400).send({ status: false, message: "productId is required" })
        if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: `${productId} is not a valid productId` })

        if (cartId) {
            if (!validator.isValid(cartId)) return res.status(400).send({ status: false, message: "Incorrect cartId" })
            if (!mongoose.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: `${cartId} is not a valid cartId` })
        }

        if (!quantity) {
            if (quantity == 0) return res.status(400).send({ status: false, message: "Quantity must be greater than 0" })
            quantity = 1
        }
        if (typeof quantity != "number") return res.status(400).send({ status: false, message: "Incorrect quantity" })

        let product = await productModel.findById(productId)
        if (!product || product.isDeleted == true) {
            return res.status(404).send({ status: false, message: "product not found" })
        }

        if (cartId) {
            const cart = await cartModel.findById(cartId).populate([{ path: "items.productId" }])
            if (!cart) return res.status(404).send({ status: false, message: "Cart does not exist with this cartId" })

            let itemsArr = cart.items
            let totalPrice = cart.totalPrice
            let totalItems = cart.totalItems
            let flag = true

            for (i = 0; i < itemsArr.length; i++) {
                if (itemsArr[i].productId._id == productId) { //if the product already exist in our cart
                    itemsArr[i].quantity += quantity
                    totalPrice += itemsArr[i].productId.price * quantity
                    flag = false
                }
            }

            if (flag == true) { //if product does not already exist in our cart then add it in the cart
                itemsArr.push({ productId: productId, quantity: quantity })
                totalPrice += product.price * quantity
            }

            totalPrice = totalPrice.toFixed(2)
            totalItems = itemsArr.length
            const updatedCart = await cartModel.findOneAndUpdate({ _id: cartId }, ({ items: itemsArr, totalPrice: totalPrice, totalItems: totalItems }), { new: true }).select({ __v: 0 }).populate([{ path: "items.productId" }])

            if (!updatedCart) return res.status(404).send({ status: false, message: "cart not found" })

            return res.status(200).send({ status: true, message: "product added into existing cart", data: updatedCart })

        } else {
            let cartData = {
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: quantity
                }],
                totalPrice: (product.price * quantity).toFixed(2),
                totalItems: quantity
            }
            const checkCart = await cartModel.findOne({ userId })
            if (checkCart) {
                return res.status(409).send({ status: false, message: `cart is already Created` })
            }
            const cart = await cartModel.create(cartData)
            return res.status(201).send({ status: true, message: "cart created Succefully", data: cart })
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


//======================================================updateCart=========================================//
const updateCart = async function(req, res) {
    try {
        const userId = req.params.userId

        //validations
        //userid validation

        if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: `${userId} is not a valid userId` })

        const data = req.body
        if (!validator.isValidBody(data)) {
            return res.status(400).send({ status: false, message: "plz enter some keys and values in the data" })
        }
        let { cartId, productId, removeProduct } = data

        //cartId validations
        if (!cartId) return res.status(400).send({ status: false, message: "cartId is mandatory" })
        if (!mongoose.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: `${cartId} is not a valid cartId` })

        //productId validations
        if (!productId) return res.status(400).send({ status: false, message: "productId is mandatory" })
        if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: `${productId} is not a valid ProductId` })

        //removeProduct validations
        if (removeProduct == 0 || removeProduct == 1);
        else return res.status(400).send({ status: false, message: "please set removeProduct to 1 to decrease poduct quantity by 1, or set to 0 to remove product completely from the cart" })

        //cart validations-
        //Make sure that cart exist-
        const foundCart = await cartModel.findById(cartId).populate([{ path: "items.productId" }]) //since productid is inside an ARRAY of OBJECT
        if (!foundCart) return res.status(404).send({ status: false, message: "No products found in the cart" })

        //Make sure the user exist-
        const foundUser = await userModel.findById(userId)
        if (!foundUser) return res.status(404).send({ status: false, message: "user not found for the given userId" })

        //Check if the productId exists and is not deleted before updating the cart
        let foundProduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!foundProduct) return res.status(404).send({ status: false, message: "Product not found for the given productId" })

        //removeProduct and update
        let itemsArr = foundCart.items
        let initialItems = itemsArr.length
        let totalPrice = foundCart.totalPrice
        let totalItems = foundCart.totalItems

        if (itemsArr.length === 0) return res.status(400).send({ status: false, message: "cart is empty nothing to delete" })

        if (removeProduct === 0) {
            for (let i = 0; i < itemsArr.length; i++) {
                if (productId == itemsArr[i].productId._id) {
                    totalPrice -= itemsArr[i].productId.price * itemsArr[i].quantity
                    totalItems--
                    itemsArr.splice(i, 1)
                }
            }
            if (initialItems === itemsArr.length) return res.status(404).send({ status: false, message: "product does not exist in the cart" })
        }

        if (removeProduct === 1) {
            initialItems = totalItems
            let flag = false
            for (let i = 0; i < itemsArr.length; i++) {
                if (productId == itemsArr[i].productId._id) {
                    flag = true
                    totalPrice -= itemsArr[i].productId.price
                    itemsArr[i].quantity--
                        if (itemsArr[i].quantity == 0) {
                            totalItems--
                            itemsArr.splice(i, 1)
                        }
                }
            }
            if (!flag) return res.status(404).send({ status: false, message: "product does not exist in the cart" })
        }

        totalPrice = totalPrice.toFixed(2)
        const updatedCart = await cartModel.findOneAndUpdate({ _id: cartId }, ({ items: itemsArr, totalPrice: totalPrice, totalItems: totalItems }), { new: true }).select({ __v: 0 }).populate([{ path: "items.productId" }])

        if (!updatedCart)
            return res.status(404).send({ status: false, message: "cart not found" })

        return res.status(200).send({ status: true, message: "Product is  removed Successfully", data: updatedCart })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


//======================================================deleteById======================================//
const getById = async(req, res) => {
        try {
            //User validation
            let userId = req.params.userId
            if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid UserId" })
            let findUserId = await userModel.findOne({ _id: userId })
            if (!findUserId) return res.status(404).send({ status: false, message: "No user found" })

            let checkCart = await cartModel.findOne({ userId }).populate([{ path: "items.productId" }])

            if (!checkCart) return res.status(404).send({ status: false, message: "Cart not exist for this userId" })
            return res.status(200).send({ status: true, message: "fetched cart Successfully", data: checkCart })
        } catch (err) {
            return res.status(500).send({ status: false, message: err.message })
        }
    }
    //======================================================deleteById=========================================//
const deleteById = async(req, res) => {
        try {
            //user Validation
            let userId = req.params.userId
            if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "invalid UserId" })
            let findUserId = await userModel.findOne({ _id: userId })
            if (!findUserId) return res.status(404).send({ status: false, message: "No user found" })

            let checkCart = await cartModel.findOne({ userId })
            if (!checkCart) return res.status(404).send({ status: false, message: "Cart not exist for this userId" })
            let deleteCart = await cartModel.findOneAndUpdate({ userId }, { items: [], totalItems: 0, totalPrice: 0 }, { new: true })
            return res.status(204).send({ status: true, message: "cart deleted Successfully", data: deleteCart })

        } catch (err) {
            return res.status(500).send({ status: false, message: err.message })
        }
    }
    //======================================Module Export=======================================================
module.exports = { createCart, getById, deleteById, updateCart }