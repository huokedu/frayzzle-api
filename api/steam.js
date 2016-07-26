/**
 * Created by Namdascious.
 */
var requestPromise = require('request-promise');
var url = require('url');
var openid = require('openid');
var config = require('../config');
var origin = '';

switch (config.env) {
    case 'dev':
        origin = 'http://' + process.env.HOST + ':' + process.env.PORT;
        break;

    case 'test':
        origin = config.appsettings.testDomain;
        break;

    case 'prod':
        origin = config.appsettings.prodDomain;
        break;

    default:
        break;
}

var relyingParty = new openid.RelyingParty(
	origin + '/api/steam/authenticate/verify', // Verification URL (yours)
	origin, // Realm (optional, specifies realm for OpenID authentication)
	true, // Use stateless verification
	false, // Strict mode
	[]
); // List of extensions to enable and include

var steam = {};

/**
 * Authenticate with Steam.
 *
 * @param {Function} callback Callback to send results to
 */
steam.authenticate =  (callback) => {
	let identifier = config.steam.provider;

	relyingParty.authenticate(identifier, false, (error, authUrl) => {
		if (error) {
			callback(error);
		} else if (!authUrl) {
			callback('Authentication failed');
		} else {
			callback(null, authUrl);
		}
	});
};

/**
 * Get a steam user.
 *
 * @param {String} userId ID of the user to get
 * @return {Object} Promise
 */
steam.getSteamUser = (userId) => {
	let steamUrl = config.steam.api_url
		+ 'ISteamUser/GetPlayerSummaries/v0002/?key='
		+ config.steam.api_key
		+ '&format=json&steamids=' + userId;

	return requestPromise(steamUrl);
};

/**
 * Verify the authentication attempt.
 *
 * @oaram {Object}   request  Express request object
 * @param {Function} callback Callback to send results to
 */
steam.verifyAuthentication = (request, callback) => {
	relyingParty.verifyAssertion(request, function (error, result) {
		if (error) {
			console.error(error);
			return callback(error);
		}

		let urlObj = url.parse(result.claimedIdentifier);
		let pathArray = urlObj.pathname.split('/');

		if (pathArray && pathArray.length > 0) {
			let steamId = pathArray[(pathArray.length - 1)];

			//Get the user profile from steam
			steam.getSteamUser(steamId)
				 .then(function (data) {
					let steamData = JSON.parse(data);
					if (steamData && steamData.response
						&& steamData.response.players
						&& steamData.response.players.length > 0) {

						let steamUser = steamData.response.players[0];

						//Firebase - Generate a firebase token for our steam auth user info
						//let tokenGenerator = new FirebaseTokenGenerator(config.firebase.secret);
						//let token = tokenGenerator.createToken({ uid: 'steam:' + steamId });

						callback(null, {
							steamId: steamId,
							steamUser: steamUser,
							token: token
						})
					}
				}, function (err) {
					callback(err);
				});
		} else {
			callback('Unable to get path');
		}
	});
};

module.exports = steam;
