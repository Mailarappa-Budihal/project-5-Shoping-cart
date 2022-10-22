//=======================================Importing Module and Packages============================================
const userModel = require("../Model/userModel")
const bcrypt = require("bcrypt")
const validator = require("../validation/validation")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const { uploadFile } = require("./aws")

const phoneRex = /^[6789][0-9]{9}$/
    //======================================================createUser==============================================//
const createUser = async(req, res) => {
        try {
            //fetching data present in request body 
            let files = req.files;
            const requestBody = req.body

            if (!validator.isValidBody(requestBody)) {
                return res.status(400).send({ status: false, message: "please provide data in the body" })
            }
            //Destructuring requestBody
            let { fname, lname, phone, email, password, address } = requestBody
            //--------------------------------Validation starts-------------------------------
            //fname
            if (!validator.isValid(fname)) return res.status(400).send({ status: false, message: `fname is required` });
            if (!fname.trim().match(/^[a-zA-Z]{2,20}$/)) return res.status(400).send({ status: false, message: `Firstname should only contain alphabet` });

            //lname
            if (!validator.isValid(lname)) return res.status(400).send({ status: false, message: `lname is required ` });
            if (!lname.trim().match(/^[a-zA-Z]{2,20}$/)) return res.status(400).send({ status: false, message: `lname should only contain alphabet ` });

            //email
            if (!validator.isValid(email)) return res.status(400).send({ status: false, message: `Email is required` })
            email = email.trim().toLowerCase()
            if (!validator.isValidEmail(email)) return res.status(400).send({ status: false, message: `Email should be a valid email address ` })
            const isEmailAlreadyUsed = await userModel.findOne({ email });
            if (isEmailAlreadyUsed) return res.status(409).send({ status: false, message: `${email} email address is already registered` })

            //profileImage
            if (!files || (files && files.length === 0)) return res.status(400).send({ status: false, message: 'Profile image is required' })
            const profilePicture = await uploadFile(files[0], "user")

            //phone
            if (!validator.isValid(phone)) return res.status(400).send({ status: false, message: 'phone no is required' });
            phone = phone.trim()
            if (phone.length != 10) return res.status(400).send({ status: false, message: `${phone.length} is not valid phone number length` })
            if (!phone.match(phoneRex)) return res.status(400).send({ status: false, message: `Please fill Indian phone number with 1st no only(6,7,8,9)` })
            const isPhoneAlreadyUsed = await userModel.findOne({ phone });
            if (isPhoneAlreadyUsed) return res.status(409).send({ status: false, message: `${phone} phone number is already registered` })

            //password
            if (!validator.isValid(password)) return res.status(400).send({ status: false, message: `Password is required` })
            if (!validator.isValidPassword(password)) return res.status(400).send({ status: false, message: `Password must between 8-15 and contain a Capital,Symbol,Numeric` })

            //address
            if (!validator.isValid(address))
                return res.status(400).json({ status: false, msg: "Address is required" });
            address = JSON.parse(address)
            if (address) {
                if (typeof address != "object") return res.status(400).send({ status: false, message: "Please provide Address in Object" })
                if (address) {
                    if (address.shipping) {
                        if (!validator.isValid(address.shipping.street)) return res.status(400).send({ status: false, Message: "Shipping Street is required" })
                        if (!validator.isValid(address.shipping.city)) return res.status(400).send({ status: false, Message: "Shipping city is required" })
                        if (!validator.isValid(address.shipping.pincode)) return res.status(400).send({ status: false, Message: "Shipping pincode is required" })
                        if (!/^[1-9][0-9]{5}$/.test(address.shipping.pincode)) return res.status(400).send({ status: false, message: "Shipping Pincode should in six digit Number" })
                    } else {
                        return res.status(400).send({ status: false, message: "please provide shipping address" })
                    }

                    if (address.billing) {
                        if (!validator.isValid(address.billing.street)) return res.status(400).send({ status: false, Message: "Billing street is required" })
                        if (!validator.isValid(address.billing.city)) return res.status(400).send({ status: false, Message: "Billing city is required" })
                        if (!validator.isValid(address.billing.pincode)) return res.status(400).send({ status: false, Message: "Billing pincode is required" })
                        if (!/^[1-9][0-9]{5}$/.test(address.billing.pincode)) return res.status(400).send({ status: false, message: "Billing pincode is invalid", })
                    } else {
                        return res.status(400).send({ status: false, message: "please provide billing address" })
                    }
                }
                // ---------------------------------Validation ends-------------------------------
                //generating salt
                const salt = await bcrypt.genSalt(10)
                    //hashing
                const hashedPassword = await bcrypt.hash(password, salt)
                    //response structure
                const userData = {
                    fname: fname,
                    lname: lname,
                    profileImage: profilePicture,
                    email: email,
                    phone: phone,
                    password: hashedPassword,
                    address: address,
                }
                let newUser = await userModel.create(userData);
                newUser = newUser.toObject()
                delete(newUser.password)
                return res.status(201).send({ status: true, message: ` User created successfully`, data: newUser });
            }
        } catch (error) {
            return res.status(500).send({ status: false, message: error.message });
        }
    }
    //===================================================loginUser===============================================//
const loginUser = async function(req, res) {
    try {
        const loginData = req.body
        const { email, password } = loginData

        //validation
        if (!validator.isValidBody(loginData)) return res.status(400).send({ status: false, message: "Please provide login credentials" })

        if (!validator.isValid(email)) return res.status(400).send({ status: false, message: " email is mandatory" })
        if (!validator.isValidEmail(email)) return res.status(400).send({ status: false, message: "Please provide valid email" })

        if (!validator.isValid(password)) return res.status(400).send({ status: false, message: " password is mandatory" })
        if (!validator.isValidPassword(password)) return res.status(400).send({ status: false, message: "Please provide valid password" })

        let user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(404).send({ status: false, message: "email is not found" });
        }
        //comparing hard-coded password to the hashed password
        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.status(400).send({ status: false, message: "Invalid Credentials" })
        }
        //token credentials
        const token = jwt.sign({
                userId: user._id.toString(),
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
            },
            "project/productManagementGroup7" // => secret key
        );
        return res.status(200).send({ status: true, message: "User login successfully", data: { userId: user._id, token: token } })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


//======================================================getUserById=========================================//
const getUserById = async(req, res) => {
        try {
            const userId = req.params.userId
            if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: `${userId} is not a valid userId` })
            const user = await userModel.findById(userId, { password: 0 })
            if (!user) return res.status(404).send({ status: false, message: "UserId Not found" })
            if (req.tokenData.userId != userId) return res.status(403).send({ status: false, message: "unauthorized access" })
            return res.status(200).send({ status: true, message: 'User profile details', data: user })
        } catch (error) {
            return res.status(500).send({ status: false, message: error.message })
        }
    }
    //======================================================updateUser========================================//
const updateUser = async(req, res) => {
        try {
            const userId = req.params.userId
            if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "You entered a Invalid userId in params" })
            const User = await userModel.findById({ _id: userId })
            if (!User) return res.status(404).send({ status: false, message: "user not found" })
            const requestBody = req.body
            const { fname, lname, phone, email, password, address, profileImage } = requestBody
            let files = req.files;
            if (!validator.isValidBody(requestBody)) return res.status(400).send({ status: false, message: "Please provide something to update" })
            if (fname) {
                if (!validator.isValid(fname)) return res.status(400).send({ status: false, message: "fname is empty" })
                User["fname"] = fname
            }
            if (lname) {
                if (!validator.isValid(lname)) return res.status(400).send({ status: false, message: "lname is empty" })
                User["lname"] = lname
            }
            if (email) {
                if (!validator.isValid(email)) return res.status(400).send({ status: false, message: "email is empty" })
                const findEmail = await userModel.findOne({ email: email })
                if (findEmail) return res.status(409).send({ status: false, message: "email is already exists please enter a new emailId " })
                if (validator.isValidEmail(email) == false) return res.status(400).send({ status: false, message: "You entered a Invalid email" })
                User["email"] = email
            }

            if (profileImage) {
                if (!files || (files && files.length === 0)) return res.status(400).send({ status: false, message: 'Profile image is empty' })
                const profileImage = await uploadFile(files[0])
                User["profileImage"] = profileImage
            }

            if (phone) {
                if (!validator.isValid(phone)) return res.status(400).send({ status: false, message: "phone is empty" })
                const findPhone = await userModel.findOne({ phone: phone })
                if (phoneRex.test(phone) == false) return res.status(400).send({ status: false, message: "You entered a Invalid phone number" })
                if (findPhone) return res.status(409).send({ status: false, message: "This phone number is already exists" })
                User["phone"] = phone
            }
            if (password) {
                if (!validator.isValid(password)) return res.status(400).send({ status: false, message: "password is empty" })
                if (!validator.isValidPassword(password)) return res.status(400).send({ status: false, message: `Password must between 8-5 and contain a Capital,Symbol,Numeric` })
                const salt = await bcrypt.genSalt(10)
                const hashedPassword = await bcrypt.hash(requestBody.password, salt)
                User["password"] = hashedPassword
            }
            let address1 = JSON.parse(address)
            if (address1) {
                if (Object.keys(address1).length > 0) {
                    const shippingAddress = address1.shipping

                    if (shippingAddress) {
                        if (shippingAddress.street) {
                            if (!validator.isValid(shippingAddress.street)) return res.status(400).send({ status: false, message: "shipping street is empty" })
                            User.address.shipping["street"] = shippingAddress.street
                        }
                        if (shippingAddress.city) {
                            if (!validator.isValid(shippingAddress.city)) return res.status(400).send({ status: false, message: "shipping city is empty" })
                            User.address.shipping["city"] = shippingAddress.city
                        }
                        if (shippingAddress.pincode) {
                            if (!validator.isValid(shippingAddress.pincode)) return res.status(400).send({ status: false, message: "shipping pincode is empty" })
                            if (!/^[1-9][0-9]{5}$/.test(shippingAddress.pincode)) return res.status(400).send({ status: false, message: "Shipping Pincode should in six digit Number" })
                            User.address.shipping["pincode"] = shippingAddress.pincode
                        }
                    }
                }
                const billingAddress = address1.billing
                if (billingAddress) {
                    if (billingAddress.street) {
                        if (!validator.isValid(billingAddress.street)) return res.status(400).send({ status: false, message: "billing street is empty" })
                        User.address.billing["street"] = billingAddress.street
                    }
                    if (billingAddress.city) {
                        if (!validator.isValid(billingAddress.city)) return res.status(400).send({ status: false, message: "billing city is empty" })
                        User.address.billing["city"] = billingAddress.city
                    }
                    if (billingAddress.pincode) {
                        if (!validator.isValid(billingAddress.pincode)) return res.status(400).send({ status: false, message: "billing pincode is empty" })
                        if (!/^[1-9][0-9]{5}$/.test(billingAddress.pincode)) return res.status(400).send({ status: false, message: "billing Pincode should in six digit Number" })
                        User.address.billing["pincode"] = billingAddress.pincode
                    }
                }
            }
            const UpdateUser1 = await User.save()
            const strUserUpdate = JSON.stringify(UpdateUser1)
            const ObjectUserUpdate = JSON.parse(strUserUpdate)
            delete(ObjectUserUpdate.password)

            return res.status(200).send({ status: true, message: "User profile updated", data: ObjectUserUpdate })

        } catch (error) {
            return res.status(500).send({ status: false, message: error.message })
        }
    }
    //===================================================Module Export========================================//
module.exports = { createUser, loginUser, getUserById, updateUser }