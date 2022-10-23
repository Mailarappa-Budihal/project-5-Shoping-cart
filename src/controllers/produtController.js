//=======================================Importing Module and Packages=====================================//
const productModel = require("../Model/productModel")
const validator = require("../validation/validation")
const mongoose = require("mongoose")
const { uploadFile } = require("./aws")

var nameRegex = /^[a-zA-Z\s]*$/
var priceRegex = /^[1-9]\d*(\.\d+)?$/
var installmentRegex = /\d/
    //======================================================createProduct=========================================//
const createProduct = async(req, res) => {
        try {
            let data = req.body
            let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = data

            let objectCreate = {}
                //-----------------------------------------VALIDATION--------------------------------------------------//
            if (!validator.isValidBody(data)) return res.status(400).send({ status: false, message: "Please enter some details in the request body" })

            if (!title) return res.status(400).send({ status: false, message: "title field is Required" })
            let findtitle = await productModel.findOne({ title: title })
            if (findtitle) return res.status(409).send({ status: false, message: "This title is already exists" })
            if (nameRegex.test(title) == false) return res.status(400).send({ status: false, message: "you entered a invalid Title" })
            objectCreate.title = title

            if (!description) return res.status(400).send({ status: false, message: "description field is Required" })
            if (nameRegex.test(description) == false) return res.status(400).send({ status: false, message: "you entered a invalid description" })
            objectCreate.description = description

            if (!price) return res.status(400).send({ status: false, message: "Price field is Required" })
            if (priceRegex.test(price) == false) return res.status(400).send({ status: false, message: "you entered a invalid price" })
            objectCreate.price = price

            if (!currencyId)
                return res.status(400).send({ status: false, message: "currencyId field is Required" })
            let checkCurrencyId = "INR"
            if (currencyId != checkCurrencyId)
                return res.status(400).send({ status: false, message: "you entered a invalid currencyId---> currencyId should be INR" })
            objectCreate.currencyId = currencyId

            if (!currencyFormat)
                return res.status(400).send({ status: false, message: "currencyFormat field is Required" })
            let checkCurrencyFormat = "₹"
            if (currencyFormat != checkCurrencyFormat)
                return res.status(400).send({ status: false, message: "you entered a invalid currencyFormat--> currencyFormat should be ₹" })
            objectCreate.currencyFormat = currencyFormat

            if (isFreeShipping) {
                if (!validator.isBoolean(isFreeShipping)) return res.status(400).send({ status: false, message: "Is free Shipping value should be boolean" })
            }
            objectCreate.isFreeShipping = isFreeShipping

            let image = req.files
            if (!image || image.length == 0)
                return res.status(400).send({ status: false, message: "productImage key and value is Required" })
            let productImage = await uploadFile(image[0])
            objectCreate.productImage = productImage

            if (style) {
                if (nameRegex.test(style) == false) return res.status(400).send({ status: false, message: "Style to enterd is invalid" })
                objectCreate.style = style
            }

            let checkSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"]
            if (!availableSizes)
                return res.status(400).send({ status: false, message: "Available Sizes field is Required" })

            let arrayOfSizes = availableSizes.trim().split(",")

            for (let i = 0; i < arrayOfSizes.length; i++) {
                if (checkSizes.includes(arrayOfSizes[i].trim())) continue;
                else return res.status(400).send({ status: false, message: "Sizes should in this ENUM only :S/XS/M/X/L/XXL/XL" })
            }
            let newSize = []
            for (let j = 0; j < arrayOfSizes.length; j++) {
                if (newSize.includes(arrayOfSizes[j].trim())) continue;
                else newSize.push(arrayOfSizes[j].trim())
            }
            objectCreate.availableSizes = newSize

            if (installments) {
                if (installmentRegex.test(installments) == false) return res.status(400).send({ status: false, message: "Installment must be in valid number" })
                objectCreate.installments = installments
            }

            let productCreate = await productModel.create(objectCreate)
            return res.status(201).send({ status: true, message: "product created successfully", data: productCreate })
        } catch (err) {
            return res.status(500).send({ status: false, Message: err.message })
        }
    }
    //======================================================getProduct==========================================//
const getProduct = async function(req, res) {
        try {
            let queryData = req.query
            if (Object.keys(queryData).length == 0) {
                let filterData = await productModel.find({ isDeleted: false })
                return res.status(200).send({ status: true, message: `Found ${filterData.length} Items`, data: filterData })
            }
            let objectFilter = { isDeleted: false }
            let size = queryData.size
            if (size) {

                let checkSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"]
                let arraySize = size.split(",")
                for (let i = 0; i < arraySize.length; i++) {
                    if (checkSizes.includes(arraySize[i]))
                        continue;
                    else
                        return res.status(400).send({ status: false, message: "Sizes should in this ENUM only :S/XS/M/X/L/XXL/XL" })
                }

                objectFilter.availableSizes = arraySize
            }
            let name = queryData.name
            if (name) {
                if (!validator.isValid(name))
                    return res.status(400).send({ status: false, message: "Name should not be empty" })
                name = name.trim()
                if (nameRegex.test(name) == false)
                    return res.status(400).send({ status: false, message: "You entered invalid Name" })

                objectFilter.title = {}
                objectFilter.title.$regex = name
                objectFilter.title.$options = "$i"

            }
            let priceGreaterThan1 = queryData.priceGreaterThan
            if (priceGreaterThan1) {
                if (!Number(priceGreaterThan1)) return res.status(400).send({ status: false, message: "priceGreaterThan should be in valid number/decimal format" })
                objectFilter["price"] = { $gt: priceGreaterThan1 }
            }
            let priceLessThan1 = queryData.priceLessThan
            if (priceLessThan1) {
                if (!Number(priceLessThan1)) return res.status(400).send({ status: false, message: "priceLessThan should be in valid number/decimal format" })
                objectFilter["price"] = { $lt: priceLessThan1 }
            }
            let price3 = priceLessThan1 && priceGreaterThan1
            if (price3) {
                if (!Number(priceGreaterThan1)) return res.status(400).send({ status: false, message: "priceGreaterThan should be in valid number/decimal format" })
                if (!Number(priceLessThan1)) return res.status(400).send({ status: false, message: "priceLessThan should be in valid number/decimal format" })
                objectFilter["price"] = { $lt: priceLessThan1, $gt: priceGreaterThan1 }
            }

            const foundProducts = await productModel.find(objectFilter).select({ __v: 0 })

            let priceSort = queryData.priceSort
            if (!priceSort) priceSort = 1
            if (priceSort == 1) {
                foundProducts.sort((a, b) => {
                    return a.price - b.price
                })
            } else if (priceSort == -1) {
                foundProducts.sort((a, b) => {
                    return b.price - a.price
                })
            } else return res.status(400).send({ status: false, message: "priceSort should be 1 or -1" })

            if (foundProducts.length == 0) return res.status(404).send({ status: false, message: "no product found for the given query" })

            return res.status(200).send({ status: "true", message: `${foundProducts.length} Matched Found`, data: foundProducts })
        } catch (err) {
            return res.status(500).send({ status: false, Message: err.message })
        }
    }
    //======================================================getProductById==============================//
const getProductById = async(req, res) => {
        try {
            let productId = req.params.productId
            if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: `${productId} is not a valid productId` })
            const product = await productModel.findOne({ _id: productId, isDeleted: false })
            if (!product) return res.status(404).send({ status: false, message: "productId Not found" })
            return res.status(200).send({ status: true, message: 'product details', data: product })
        } catch (error) {
            return res.status(500).send({ status: false, message: error.message })
        }
    }
    //======================================================updateProduct=======================================//
const updateProduct = async function(req, res) {
        try {
            let productId = req.params.productId
            let data = req.body

            if (!productId) return res.status(400).send({ status: false, message: "ProductId is required" })
            if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: `${productId} is not a valid productId` })
            const products = await productModel.findOne({ _id: productId, isDeleted: false })
            if (!products) return res.status(404).send({ status: false, message: "productId Not found" })

            if (!validator.isValidBody(data) && !req.files) return res.status(400).send({ status: false, message: "Please provide data to update" })
            let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments, productImage, isDeleted } = data

            if (title) {
                if (!validator.isValid(title)) return res.status(400).send({ status: false, message: "title is in incorrect format" })
                let isUniqueTitle = await productModel.findOne({ title: title });
                if (isUniqueTitle) {
                    return res.status(409).send({ status: false, message: "This title is being used already" })
                }
            }
            //description validation
            if (description) {
                if (!validator.isValid(description)) return res.status(400).send({ status: false, message: "description is in incorrect format" })
            }

            if (price || price === "") {
                price = price.trim()
                if (!validator.isValid(price)) return res.status(400).send({ status: false, message: "price is empty" })
                if (priceRegex.test(price) == false) return res.status(400).send({ status: false, message: "you entered a invalid price" })
                data.price = price
            }
            //currencyID validation
            if (currencyId && currencyId.trim().length !== 0) {
                if (currencyId !== "INR") return res.status(400).send({ status: false, message: "only indian currencyId is allowed and the type should be string :INR" })
            }
            //currency format validation
            if (currencyFormat && currencyFormat.trim().length !== 0) {
                if (currencyFormat !== "₹") return res.status(400).send({ status: false, message: "only indian currencyFormat is allowed and the type should be string : ₹ " })
            }
            //isFreeShipping validation
            if (isFreeShipping) {
                if (!validator.isBoolean(isFreeShipping)) return res.status(400).send({ status: false, message: "Is free Shipping value should be boolean" })
            }
            //productImage validation
            if (productImage) return res.status(400).send({ status: false, message: "only image files are allowed" })
            if (req.files) {
                let image = req.files[0]
                if (image) {
                    if (!(image.mimetype.startsWith("image"))) return res.status(400).send({ status: false, message: "only image files are allowed" })
                    let url = await uploadFile(image)
                    data.productImage = url
                }
            }
            //style validation
            if (style) {
                if (!validator.isValid(style) || !style.match(nameRegex))
                    return res.status(400).send({ status: false, message: "style is in incorrect format" })
            }
            //installments validation
            if (installments) {
                installments = parseInt(installments)
                if (!installments || typeof installments != "number")
                    return res.status(400).send({ status: false, message: "installments should be of type number" })
            }
            //availableSizes validation
            if (availableSizes) {
                availableSizes = availableSizes.split(",").map(ele => ele.trim())
                if (Array.isArray(availableSizes)) {
                    let enumArr = ["S", "XS", "M", "X", "L", "XXL", "XL"]
                    let uniqueSizes = [...new Set([...availableSizes, ...products.availableSizes])]
                    for (let ele of uniqueSizes) {
                        if (enumArr.indexOf(ele) == -1) {
                            return res.status(400).send({ status: false, message: `'${ele}' is not a valid size, only these sizes are allowed [S, XS, M, X, L, XXL, XL]` })
                        }
                    }
                    data.availableSizes = uniqueSizes
                } else return res.status(400).send({ status: false, message: "availableSizes should be of type Array" })
            }

            if (isDeleted) {
                if (!validator.isBoolean(isDeleted)) return res.status(400).send({ status: false, message: "Is free Shipping value should be boolean" })

                if (isDeleted == true || isDeleted == "true") data.deletedAt = new Date
            }

            let updatedProduct = await productModel.findOneAndUpdate({ _id: productId }, data, { new: true })
            return res.status(200).send({ status: true, message: 'product updated successfully', data: updatedProduct })
        } catch (err) {
            return res.status(500).send({ status: false, message: err.message })
        }
    }
    //======================================================deleteById============================================//
const deleteById = async(req, res) => {
        try {
            let productId = req.params.productId
            if (!mongoose.isValidObjectId(productId)) return res.status(400).send({ status: false, message: `Invalid ProductId` })
            const product = await productModel.findOne({ _id: productId })
            if (!product) return res.status(404).send({ status: false, message: "productId Not found" })
            const updateProduct = await productModel.findOneAndUpdate({ _id: productId }, { isDeleted: true, deletedAt: new Date() }, { new: true }).select({ __v: 0 })
            if (updateProduct.isDeleted == true) return res.status(404).send({ status: false, message: `product already deleted` })
            return res.status(200).send({ status: true, message: 'product deleted successfully', data: updateProduct })

        } catch (error) {
            return res.status(500).send({ status: false, message: error.message })
        }
    }
    //====================================Module Export=================================================//
module.exports = { createProduct, getProduct, getProductById, updateProduct, deleteById }