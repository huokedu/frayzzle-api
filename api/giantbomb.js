/**
 * Created by Namdascious on 6/4/2015.
 * Modified by Michael on 2015-10-22
 */
var requestPromise = require('request-promise');
var config = require('../config');

module.exports = {
	getGames: function(query, max){
		var gbRef = config.giant_bomb;
		var limit = (max !== null && max !== undefined)
			? max
			: gbRef.limit;
		var url = gbRef.url + 'search/?api_key=' + gbRef.key + '&limit='
			+ limit + '&format=json&query="' + query
			+ '"&resources=game&field_list=id,name,image,original_release_date';
			
		var options = {
			uri: url,
			headers: {
				'User-Agent': 'Parallel-Team'	
			}
		};
		return requestPromise(options);
	}
};
