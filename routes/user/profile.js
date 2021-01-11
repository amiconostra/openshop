const express = require('express');
const path = require('path');
const rootdir = require('../../helpers/rootdir');
const isAuth = require(path.join(rootdir, 'middlewares', 'is-authenticated'));

// Controllers
const profileController = require(path.join(rootdir, 'controllers', 'user', 'profile'));

const router = express.Router();

router.get('/profile', isAuth, profileController.getProfile);

router.get('/profile-settings', isAuth, profileController.getProfileSettings);

router.post('/profile-settings', isAuth, profileController.postProfileSettings);

module.exports = router;