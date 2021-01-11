const crypto = require('crypto');
const path = require('path');
const rootdir = require('../../helpers/rootdir');
const config = require(path.join(rootdir, 'config.json'));
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport(config.mail.smtp);

// Models
const User = require(path.join(rootdir, 'models/user'));

exports.getLogin = (req, res, next) => {
    res.render(path.join(config.theme.name, 'auth/login'), {
        pageTitle: 'Login',
        flashSuccess: req.flash('success')[0],
        flashError: req.flash('error')[0]
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({email: email})
        .then(user => {
            if(!user) {
                req.flash('error', 'Invalid Email');
                return res.redirect('/login');
            }

            bcrypt.compare(password, user.password)
                .then(matches => {
                    if(matches) {
                        req.session.user = user;
                        req.session.isAuthenticated = true;
                        return req.session.save(err => {
                            res.redirect('/');
                        });
                    }
                    req.flash('error', 'Invalid Password');
                    res.redirect('/login');
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });
        })
        .catch(err => {
            console.log(err);
        });
};

exports.getRegister = (req, res, next) => {   
    res.render(path.join(config.theme.name, 'auth/register'), {
        pageTitle: 'Register',
        flashSuccess: req.flash('success')[0],
        flashError: req.flash('error')[0]
    });
};

exports.postRegister = (req, res, next) => {
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const username = req.body.username;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    crypto.randomBytes(32, (err, buffer) => {
        if(err) {
            console.log(err);
            req.flash('error', 'Unknown Error');
            return res.redirect('/register');
        }

        const token = buffer.toString('hex');

        User.findOne({$or: [{email: email}, {username: username}]})
            .then(user => {
                if(user) {
                    req.flash('error', 'Username or Email Already Exists!');
                    return res.redirect('/register');
                }

                return bcrypt.hash(password, 12)
                    .then(hashedPassword => {
                        const newUser = new User({email: email, firstName: firstName, lastName: lastName, username: username, password: hashedPassword, verifyToken: token, verifyTokenExpiration: Date.now() + 600000});
                        return newUser.save();
                    })
                    .then(result => {
                        req.flash('success', 'User successfully registered! Check your Email for Verification!');
                        res.redirect('/login');
                        return mailTransporter.sendMail({
                            to: email,
                            from: config.mail.general.from,
                            subject: 'Registration Successful!',
                            html: `<h1>You Successfully Signed Up!</h1>
                                <p>Email Verification</p>
                                <p>Click <a href="${config.server.url}/verify/${token}?userId=${result._id}">${config.server.url}/verify/${token}?userId=${result._id}</a> To Verify Your Email</p>
                            `
                        });
                    })
                    .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
    });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        res.redirect('/login');
    });
};

exports.getReset = (req, res, next) => {

    res.render(path.join(config.theme.name, 'auth/verify-reset'), {
        pageTitle: 'Reset Password',
        verifyEmail: false,
        flashSuccess: req.flash('success')[0],
        flashError: req.flash('error')[0]
    });
};

exports.postReset = (req, res, next) => {
    const email = req.body.email;

    crypto.randomBytes(32, (err, buffer) => {
        if(err) {
            console.log(err);
            req.flash('error', 'Unknown Error');
            return res.redirect('/reset');
        }
        
        const token = buffer.toString('hex');
        User.findOne({email: email})
            .then(user => {
                if(!user) {
                    req.flash('error', 'No such User with this Email');
                    return res.redirect('/reset');
                }

                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 600000; // 10 Minutes in milliseconds
                user.save()
                    .then(result => {
                        req.flash('csrf', req.csrfToken());
                        res.redirect('/confirmation?type=reset&email=' + email);
                        return mailTransporter.sendMail({
                            to: email,
                            from: config.mail.general.from,
                            subject: 'Password Reset',
                            html: `
                                <p>Requested Password Reset</p>
                                <p>Click <a href="${config.server.url}/reset/${token}">LINK</a> To Reset password</p>
                            `
                        });
                    })
                    .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
    });
};

exports.getResetPassword = (req, res, next) => {
    const token = req.params.token;

    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            if(!user) {
                req.flash('error', 'Invalid Token');
                return res.redirect('/');
            }

            res.render(path.join(config.theme.name, 'auth/reset'), {
                pageTitle: 'Reset Password',
                path: '/auth/reset-password',
                flashSuccess: req.flash('success')[0],
                flashError: req.flash('error')[0],
                userId: user._id.toString(),
                resetToken: token
            });
        })
        .catch(err => console.log(err));
};

exports.postResetPassword = (req, res, next) => {
    const token = req.body.resetToken;
    const userId = req.body.userId;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    let selectUser;

    User.findOne({_id: userId, resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            if(!user) {
                req.flash('error', 'Invalid Token');
                return res.redirect('/');
            }
            selectUser = user;
            return bcrypt.hash(password, 12)
                .then(hashedPassword => {
                    selectUser.password = hashedPassword;
                    selectUser.resetToken = undefined;
                    selectUser.resetTokenExpiration = undefined;
                    return selectUser.save();
                })
                .then(result => {
                    req.flash('success', 'Password Successfully Reset');
                    res.redirect('/login');
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
};

exports.getVerifyEmail = (req, res, next) => {
    res.render(path.join(config.theme.name, 'auth/verify-reset'), {
        pageTitle: 'Reset Password',
        verifyEmail: true,
        flashSuccess: req.flash('success')[0],
        flashError: req.flash('error')[0]
    });
};

exports.postVerifyEmail = (req, res, next) => {
    const email = req.body.email;

    crypto.randomBytes(32, (err, buffer) => {
        if(err) {
            console.log(err);
            req.flash('error', 'Unknown Error');
            return res.redirect('/verify');
        }
        
        const token = buffer.toString('hex');
        User.findOne({email: email})
            .then(user => {
                if(!user) {
                    req.flash('error', 'No such User with this Email');
                    return res.redirect('/verify');
                }
                
                if(user.verified) {
                    req.flash('error', 'User already Verified');
                    return res.redirect('/');
                }

                user.verifyToken = token;
                user.verifyTokenExpiration = Date.now() + 600000; // 10 Minutes in milliseconds
                return user.save()
                    .then(result => {
                        req.flash('csrf', req.csrfToken());
                        res.redirect('/confirmation?type=verify&email=' + email);
                        return mailTransporter.sendMail({
                            to: email,
                            from: config.mail.general.from,
                            subject: 'Email Verification',
                            html: `
                                <p>Requested Email Verification</p>
                                <p>Token: ${token}</p>
                                <p>Click <a href="${config.server.url}/verify/${token}?userId=${user._id}">${config.server.url}/verify/${token}?userId=${user._id}</a> To Verify Your Email</p>
                                <p>Or Do it manually at <a href="${config.server.url}/verify/email">${config.server.url}/verify/email</a></p>
                            `
                        });
                    })
                    .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
    });
};

exports.getVerifyToken = (req, res, next) => {
    const userId = req.query.userId;
    const token = req.params.token;

    User.findOne({_id: userId, verifyToken: token, verifyTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            if(!user) {
                req.flash('error', 'Invalid Token');
                return res.redirect('/');
            }

            if(user.verified) {
                req.flash('error', 'User already Verified');
                return res.redirect('/');
            }

            user.verified = true;
            user.verifyToken = undefined;
            user.verifyTokenExpiration = undefined;
            return user.save()
                .then(result => {
                    req.flash('success', 'Email has been Verified');
                    res.redirect('/login');
                });
        })
        .catch(err => console.log(err));
};

exports.getVerifyAccount = (req, res, next) => {
    res.render(path.join(config.theme.name, 'auth/verify-email'), {
        pageTitle: 'Verify Email',
        path: '/account/verify',
        flashSuccess: req.flash('success')[0],
        flashError: req.flash('error')[0]
    });
};

exports.postVerifyAccount = (req, res, next) => {
    const email = req.body.email;
    const token = req.body.verifyToken;

    User.findOne({email: email, verifyToken: token, verifyTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            if(!user) {
                req.flash('error', 'Invalid Token');
                return res.redirect('/');
            }

            user.verified = true;
            user.verifyToken = undefined;
            user.verifyTokenExpiration = undefined;
            req.flash('success', 'Email has been Verified');
            return user.save()
                .then(result => {
                    res.redirect('/login');
                });
        })
        .catch(err => console.log(err));
};

exports.getConfirmation = (req, res, next) => {
    const confirmType = req.query.type;
    const email = req.query.email;
    const csrf = req.flash('csrf');

    if(csrf.length <= 0) {
        return res.redirect('/');
    }

    res.render(path.join(config.theme.name, 'auth/confirmation'), {
        pageTitle: 'Confirm',
        confirmType: confirmType,
        email: email
    });
};