//=======================================Importing Module and Packages=========================================
const mongoose = require("mongoose")
const ObjectId = mongoose.Schema.Types.ObjectId

const orderSchema = new mongoose.Schema({
        userId: { type: ObjectId, ref: "User", required: true },
        items: [{
            _id: false,
            productId: { type: ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 }
        }],
        totalPrice: { type: Number, required: true },
        totalItems: { type: Number, required: true },
        totalQuantity: { type: Number, required: true },
        cancellable: { type: Boolean, default: true },
        status: { type: String, default: 'pending', enum: ["pending", "completed", "canceled"] },
        deletedAt: { type: Date }, // when the document is deleted}, 
        isDeleted: { type: Boolean, default: false }
    }, { timeStamps: true })
    //====================================Module Export===========================================================
module.exports = mongoose.model("Order", orderSchema)