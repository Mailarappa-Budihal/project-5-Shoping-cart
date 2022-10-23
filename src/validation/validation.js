//==================================validation of isValid=====================================================
function isValid(value) {
    if (typeof value === "undefined" || typeof value === null) return false;
    if (typeof value === "string" && value.trim().length == 0) return false;
    return true
};
//==================================validation of isValidBody=====================================================
function isValidBody(value) {
    return Object.keys(value).length > 0
}
//==================================validation of isValidEmail=====================================================
let isValidEmail = function(email) {
        let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
        return emailRegex.test(email)
    }
    //==================================validation of isValidPassword=====================================================
let isValidPassword = function(password) {
        let passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,15}$/
        return passwordRegex.test(password)
    }
    //==================================validation of isBoolean=====================================================
function isBoolean(value) {
    if (value == "true" || value == "false") { return true }
    return false
}
//==================================validation of isValidRequestBody===========================================//
const isValidRequestBody = function(requestBody) {
    return Object.keys(requestBody).length > 0;
};
//==================================validation of isValidObjectId=============================================//
const isValidObjectId = function(objectId) {
        return mongoose.Types.ObjectId.isValid(objectId)
    }
    //====================================Module Export=============================================================
module.exports = { isValid, isValidBody, isValidEmail, isValidPassword, isBoolean, isValidRequestBody, isValidObjectId }