//=======================================Importing Module and Packages====================================================
const userModel = require('../Model/userModel')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

//====================================check authentication=====================================================//
const authentication = async function(req, res, next) {
        try {
            const bearerHeader = req.headers['authorization'];
            //check if bearer is undefined
            if (typeof bearerHeader !== 'undefined') {
                //split the space at the bearer
                const bearer = bearerHeader.split(' ');
                //Get token from string
                const bearerToken = bearer[1];

                jwt.verify(bearerToken, "project/productManagementGroup7", (err, decodedToken) => {
                    if (err && err.message == "jwt expired") return res.status(401).send({ status: false, message: "Session expired! Please login again." })
                    if (err) return res.status(401).send({ status: false, message: "Incorrect token" })
                        //set the token
                    req.tokenData = decodedToken;
                    next();
                })

            } else return res.status(401).send({ status: false, message: "token must be present" })
        } catch (err) {
            return res.status(500).send({ status: false, message: err.message });
        }
    }
    //====================================check authorization==================================================//
const authorization = async(req, res, next) => {
        // get user id fron params
        const userId = req.params.userId

        //  get user id from token
        const token = req.tokenData

        //  check valid object id
        if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, Message: "Invalid user ID!" })

        // check the user exist in db
        const user = await userModel.findById(userId)
        if (!user) return res.status(404).send({ status: false, Message: " No user found!" })

        // auth Z 
        if (userId !== token.userId) return res.status(403).send({ status: false, Message: " Unauthorized user!" })

        next()
    }
    //====================================Module Export=========================================================//
module.exports = { authentication, authorization }