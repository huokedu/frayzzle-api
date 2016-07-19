/**
 * Created by Namdascious.
 */
//dependencies
const giantbomb = require('./giantbomb');
const steam = require('./steam');
const config = require('../config');

let routes = {
	setup: (router) => {

		//mainapi url
		router.post('/', (req, res) => {
			console.log(req.body)
			res.send('Token Master Running version: ' + config.version + ' - I got all de tokenz!');
		});

		/*------------------------------------------------
		 *-------------------- STEAM ---------------------
		 *-----------------------------------------------*/ 
		router.post('/steam/authenticate', (req, res) => {
			steam.authenticate( (err, auth_url) => {
				if (err) {
					res.status(401).send(err);
				} else {
					res.status(200).send({ 'url' : auth_url });
				}
			});
		});

		router.get('/steam/verify', (req, res) => {
			console.log('DING: Steam Authenticate Route Hit');
			steam.verifyAuthentication(req, (err, info) => {
				if (err) {
					res.status(401).send(err);
				} else {
					//send response back to client
					res.json({
						"steam_id" : info.steamId,
						"profile": info.steamUser,
						"token" : info.token
					});
				}
			});
		});

		/*------------------------------------------------
		 *-------------------- GIANTBOMB -----------------
		 *-----------------------------------------------*/ 
		router.get('/giantbomb/search', (req, res) => {
			console.log('DING: Giantbomb Search Route Hit');
			giantbomb.getGames(req.query.search, req.query.limit)
				.then(function (data) {
					res.status(200).send(data);
				}, function (err) {
					console.error("%s; %s", err.message);
					res.status(500).send(err);
				});
		});
	}
}

module.exports = routes;
