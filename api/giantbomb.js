/**
 * Created by Namdascious on 6/4/2015.
 * Modified by Michael on 2015-10-22
 */
var requestPromise = require('request-promise');
var config = require('../config');

module.exports = {
	getGames: (query, max) => {
		let gbConfig = config.giant_bomb;
		let limit = max ? max : gbConfig.limit;
		let url = gbConfig.url + 'search/?api_key=' + gbConfig.key + '&limit='
			+ limit + '&format=json&query="' + query
			+ '"&resources=game&field_list=id,name,image,original_release_date';
			
		let options = {
			uri: url,
			headers: {
				'User-Agent': 'Parallel-Team'	
			}
		};
		return requestPromise(options);
	}
};
