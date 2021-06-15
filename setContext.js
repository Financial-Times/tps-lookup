'use strict';

module.exports = (req) => {
    if (req.cookies['express:sess']) {
        const decodedToken = JSON.parse(
            Buffer.from(req.cookies['express:sess'], 'base64').toString('ascii'),
        );
        req.session = decodedToken;
        req.userContext = decodedToken.passport.user;

        return decodedToken.passport.user.tokens;
    } else {
        console.log('Unable to set the user context using the provided request.');
    }
};
