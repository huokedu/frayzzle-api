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
steam.authenticate = function (callback) {
	var identifier = config.steam.provider;

	relyingParty.authenticate(identifier, false, function (error, authUrl) {
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
steam.getSteamUser = function (userId) {
	var steamUrl = config.steam.api_url
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
steam.verifyAuthentication = function (request, callback) {
	relyingParty.verifyAssertion(request, function (error, result) {
		if (error) {
			console.error(error);
			return callback(error);
		}

		var urlObj = url.parse(result.claimedIdentifier);
		var pathArray = urlObj.pathname.split('/');

		if (pathArray && pathArray.length > 0) {
			var steamId = pathArray[(pathArray.length - 1)];

			//Get the user profile from steam
			steam.getSteamUser(steamId)
				 .then(function (data) {
					var steamData = JSON.parse(data);
					if (steamData && steamData.response
						&& steamData.response.players
						&& steamData.response.players.length > 0) {

						var steamUser = steamData.response.players[0];

						//Generate a firebase token for our steam auth user info
						var tokenGenerator = new FirebaseTokenGenerator(config.firebase.secret);
						var token = tokenGenerator.createToken({ uid: 'steam:' + steamId });

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
