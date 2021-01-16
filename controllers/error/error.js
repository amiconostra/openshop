const path = require('path');
const rootdir = require('../../helpers/rootdir');
const config = require(path.join(rootdir, 'config.json'));

exports.get404 = (req, res, next) => {
    res.render(path.join(config.theme.name, 'error/404'), {
        pageTitle: '404',
        path: '/404'
    });
};