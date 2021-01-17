const mongoose = require('mongoose');

// Models
const Order = require('./order');
const Sale = require('./sale');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: Number,
    bio: String,
    location: {
        country: String,
        state: String,
        zip: Number,
        address: String
    },
    company: String,
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    verifyToken: String,
    verifyTokenExpiration: Date,
    resetToken: String,
    resetTokenExpiration: Date
});

userSchema.methods.addSale = async function(orderId) {
    try {
        const orders = await Order.find({'seller.userId': this._id});
        let orderIds = orders.filter(order => order._id.toString() != orderId.toString()).map(order => order._id);
        const newOrders = [...orderIds];
        newOrders.push(orderId);

        const foundSale = await Sale.findOne({sellerId: this._id});
        if(foundSale) {
            foundSale.orderIds = newOrders;
            return foundSale.save();
        } else{
            const sale = new Sale({sellerId: this._id, orderIds: newOrders});
            return sale.save();
        }
    } catch(err) {
        const error = new Error(err);
        error.status = 500;
        return next(error);
    }
}

module.exports = mongoose.model('User', userSchema);