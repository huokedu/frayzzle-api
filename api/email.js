var nodemailer = require('nodemailer');
var path = require('path');
var fs = require('fs');
var Firebase = require('firebase');
var _ = require('underscore');
var config = require('../config');

var origin = '';

switch (config.appsettings.env) {
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

var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: config.email.gmail.user,
		pass: config.email.gmail.password
	}
});

var email = {};

/**
 * Send an e-mail using the default transporter.
 *
 * @param {String}   toEmail       E-mail address to send to
 * @param {String}   subject       Subject of the e-mail
 * @param {String}   template      The template to use
 * @param {Object}   replaceParams Values to replace in the template
 * @param {Function} callback      Function to call on complete
 */
email.send = function (toEmail, subject, template, replaceParams, callback) {
	var templatePath = path.join(__dirname, '..', 'emailTemplates', template);
	var htmlTemplate = fs.readFileSync(templatePath, 'utf8');

	for (var key in replaceParams) {
		htmlTemplate = htmlTemplate.replace(
			'{{' + key + '}}',
			replaceParams[key]
		);
	}

	// setup e-mail data with unicode symbols
	var mailOptions = {
		from: 'Parallel <' + config.email.gmail.user + '>', // sender address
		to: toEmail, // list of receivers
		subject: subject, // Subject line
		html: htmlTemplate // html body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, callback);
};

/**
 * Send an invite request.
 *
 * @param {String}   requestId ID of the request
 * @param {String}   commenter User who commented on the request
 * @param {String}   creator   User who created the request
 * @param {String}   gameTitle Title of the game in the request
 * @param {String}   system    System in the request
 * @param {Function} callback  Callback
 * @todo Get creator and game title/system from request?
 */
email.sendCommentEmail = function (requestId, commenter, creator, gameTitle, system, callback) {
	//Send email to the owner of the request
	var requesturl = origin + '/#/request/' + requestId;

	// Gonna need to do some querying - Get the creator, then for each
	// subscriber, get their user info, and send an email to them if they are
	// subscribed.
	var creatorRef = new Firebase(config.firebase.url + 'users');

	creatorRef
		.orderByChild('username')
		.equalTo(creator)
		.once('value', function (creatorSnapshot) {
			var creatorUserObj = creatorSnapshot.val();

			if (creatorUserObj !== null && creatorUserObj !== undefined) {

				var creatorEmail = null;
				var creatorUser = null;

				var creatorUserArray = _.map(creatorUserObj, function (userItem, userKey) {
					return userItem;
				});

				if (creatorUserArray && creatorUserArray.length) {
					creatorUser = creatorUserArray[0];
					creatorEmail = creatorUserArray[0].email;
				}

				//Send an email to the creator if (a) their email is verified & (b) they are not the commenter
				if (creatorEmail && creatorUser
					&& creatorUser.emailverified
					&& creatorUser.emailverified
					&& creator.trim() !== commenter.trim()) {

					//send email to creator
					var params = {
						addressee: creator,
						titlemessage: 'Someone commented on your request',
						grammarfocus: 'your',
						interestfocus: '',	 //interest focus is empty for the creator
						commenter: commenter,
						gametitle: gameTitle,
						system: system,
						requesturl: requesturl
					};

					email.send(
						creatorUser.email,
						'Someone commented on your gaming request',
						'commentRequestEmail.html',
						params,
						function (error, info) {
							if (error) {
								return console.log(error);
							}
							console.log('Message sent: ' + info.response);
					});
				}

				//Now we are going to make a call for each subscribed user, and send them an email one after the other
				var requestSubscribersRef = new Firebase(config.firebase.url + 'requests/' + requestId + '/subscribers');

				requestSubscribersRef.once('value', function (subsSnapshot) {
					var subscriberIds = subsSnapshot.val();

					if (subscriberIds !== null && subscriberIds !== undefined) {
						var subscriberIdsArray = _.map(subscriberIds, function (sub, key) {
							return sub.uid;
						});

						if (subscriberIdsArray !== null && subscriberIdsArray !== undefined && subscriberIdsArray.length > 0) {
							//Get the user for each uid and send them an email - all except the commenter
							_.each(subscriberIdsArray, function (subId) {

								var userRef = new Firebase(config.firebase.url + 'users/' + subId);
								userRef.once('value', function (userSnapshot) {
									var user = userSnapshot.val();

									if (user && user.username && user.email && user.emailverified && user.username.trim() !== commenter.trim()) {
										var params = {
											addressee: user.username,
											titlemessage: 'Someone commented on a request you are interested in',
											grammarfocus: 'a',
											interestfocus: 'you are interested in',
											commenter: commenter,
											gametitle: gameTitle,
											system: system,
											requesturl: requesturl
										};

										email.send(
											user.email,
											'Someone commented on a gaming request you are interested in',
											'commentRequestEmail.html',
											params,
											function (error, info) {
												if (error) {
													return console.log(error);
												}
												console.log('Message sent: ' + info.response);
										 });
									}
								});
							});
						}
					}
				});
			}

			callback();
	});
};

/**
 * Send an invite request.
 *
 * @param {String}   requestId ID of the request
 * @param {String}   invitee   Person who requested the invite
 * @param {String}   gameTitle Title of the game in the request
 * @param {String}   system    System in the request
 * @param {Function} callback  Callback
 */
email.sendInviteRequest = function (requestId, invitee, gameTitle, system, callback) {
	var requestRef = new Firebase(config.firebase.url + 'requests/' + requestId);

	// Get the request
	requestRef.once('value', function (requestSnapshot) {
		var request = requestSnapshot.val();

		if (request) {

			//Get the request creator
			var creatorRef = new Firebase(config.firebase.url + 'users/' + request.uid);
			creatorRef.once('value', function (creatorSnapshot) {

				var creator = creatorSnapshot.val();

				//Make sure their email is verified
				if (creator && creator.username && creator.email && creator.emailverified) {
					var requestUrl = origin + '/#/request/' + requestId;
					var params = {
						creator: creator.username,
						inviteRequestor: invitee,
						gametitle: gameTitle,
						system: system,
						requesturl: requestUrl
					};

					email.send(
						creator.email,
						'Response to your gaming request',
						'inviteRequestEmail.html',
						params,
						function (error, info) {
							if (error) {
								return console.log(error);
							}
							console.log('Message sent: ' + info.response);
							callback(error);
					});
				}
			});
		} else {
			callback('Unable to retrieve request for ID: ' + requestId);
		}
	});
};

/**
 * Send an e-mail for verifying the user's e-mail.
 *
 * @oaram {String}   userEmail E-mail of the user
 * @param {String}   token     Verification token
 * @param {Function} callback  Callback
 */
email.sendVerificationEmail = function (userEmail, token, callback) {
	var verify_url = origin + '/api/confirm/' + token;
	var emailParams = {
		verify_url: verify_url,
		unsubscribe_url: verify_url
	};

	email.send(
		userEmail,
		'Verify your Parallel Account Email',
		'verifyEmail.html',
		emailParams,
		callback
	);
}

module.exports = email;
