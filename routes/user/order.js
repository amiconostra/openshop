const express = require('express');
const path = require('path');
const rootdir = require('../../helpers/rootdir');
const isAuth = require(path.join(rootdir, 'middlewares', 'is-authenticated'));
const inputValidator = require(path.join(rootdir, 'middlewares', 'input-validator'));

// Controllers
const orderController = require(path.join(rootdir, 'controllers', 'user', 'order'));

const router = express.Router();

router.get('/dashboard/orders', isAuth, orderController.getOrders);

router.get('/dashboard/invoices', isAuth, orderController.getInvoices);

router.get('/dashboard/invoices/:orderId', isAuth, orderController.getInvoice);

router.get('/dashboard/invoices/:orderId/download', isAuth, orderController.getDownloadInvoice);

router.get('/checkout/:productId', orderController.getCheckout);

router.post('/checkout', inputValidator.validate('checkout'), orderController.postCheckout);

module.exports = router;