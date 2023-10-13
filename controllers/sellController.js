const Sell = require('../models/sellModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const sendToken = require('../utils/sendToken');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const cloudinary = require('cloudinary');

// Register User
exports.registerSell = asyncErrorHandler(async (req, res, next) => {

    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
    });

    const { name, email, gender, password , product_name, product_cat} = req.body;

    const user = await Sell.create({
        name, 
        email,
        gender,
        password,
        product_name,
        product_cat,
        avatar: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
        },
    });

    sendToken(user, 201, res);
});

// Login User
exports.loginSell = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if(!email || !password) {
        return next(new ErrorHandler("Please Enter Email And Password", 400));
    }

    const sell = await Sell.findOne({ email}).select("+password");

    if(!sell) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    const isPasswordMatched = await sell.comparePassword(password);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    sendToken(sell, 201, res);
});

// Logout User
exports.logoutSell = asyncErrorHandler(async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});

// Get User Details
exports.getSellDetails = asyncErrorHandler(async (req, res, next) => {
    
    const sell = await Sell.findById(req.user.id);

    res.status(200).json({
        success: true,
        sell,
    });
});

// Forgot Password
exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {
    
    const sell = await Sell.findOne({email: req.body.email});

    if(!sell) {
        return next(new ErrorHandler("User Not Found", 404));
    }

    const resetToken = await sell.getResetPasswordToken();

    await sell.save({ validateBeforeSave: false });

    // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`;
    const resetPasswordUrl = `https://${req.get("host")}/password/reset/${resetToken}`;

    // const message = `Your password reset token is : \n\n ${resetPasswordUrl}`;

    try {
        await sendEmail({
            email: sell.email,
            templateId: process.env.SENDGRID_RESET_TEMPLATEID,
            data: {
                reset_url: resetPasswordUrl
            }
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${sell.email} successfully`,
        });

    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await sell.save({ validateBeforeSave: false });
        return next(new ErrorHandler(error.message, 500))
    }
});

// Reset Password
exports.resetPassword = asyncErrorHandler(async (req, res, next) => {

    // create hash token
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const sell = await Sell.findOne({ 
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!sell) {
        return next(new ErrorHandler("Invalid reset password token", 404));
    }

    sell.password = req.body.password;
    sell.resetPasswordToken = undefined;
    sell.resetPasswordExpire = undefined;

    await sell.save();
    sendToken(sell, 200, res);
});

// Update Password
exports.updatePassword = asyncErrorHandler(async (req, res, next) => {

    const sell = await Sell.findById(req.sell.id).select("+password");

    const isPasswordMatched = await sell.comparePassword(req.body.oldPassword);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Old Password is Invalid", 400));
    }

    sell.password = req.body.newPassword;
    await sell.save();
    sendToken(sell, 201, res);
});

// Update User Profile
exports.updateProfile = asyncErrorHandler(async (req, res, next) => {

    const newSellData = {
        name: req.body.name,
        email: req.body.email,
    }

    if(req.body.avatar !== "") {
        const sell = await Sell.findById(req.user.id);

        const imageId = sell.avatar.public_id;

        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
            folder: "avatars",
            width: 150,
            crop: "scale",
        });

        newSellData.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
        }
    }

    await Sell.findByIdAndUpdate(req.sell.id, newSellData, {
        new: true,
        runValidators: true,
        useFindAndModify: true,
    });

    res.status(200).json({
        success: true,
    });
});

// ADMIN DASHBOARD

// Get All Users --ADMIN
exports.getAllSell = asyncErrorHandler(async (req, res, next) => {

    const sell = await Sell.find();

    res.status(200).json({
        success: true,
        sell,
    });
});

// Get Single User Details --ADMIN
exports.getSinglSell = asyncErrorHandler(async (req, res, next) => {

    const sell = await Sell.findById(req.params.id);

    if(!sell) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        sell,
    });
});

// Update User Role --ADMIN
exports.updateSellRole = asyncErrorHandler(async (req, res, next) => {

    const newSellData = {
        name: req.body.name,
        email: req.body.email,
        gender: req.body.gender,
        role: req.body.role,
    }

    await Sell.findByIdAndUpdate(req.params.id, newSellData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// Delete Role --ADMIN
exports.deleteSell = asyncErrorHandler(async (req, res, next) => {

    const sell = await Sell.findById(req.params.id);

    if(!sell) {
        return next(new ErrorHandler(`Seller doesn't exist with id: ${req.params.id}`, 404));
    }

    await sell.remove();

    res.status(200).json({
        success: true
    });
});