// Module dependencies

const app = require('express')();
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const desktop = path.resolve(__dirname, '..', '..', 'attr_order.xml');
const file = fs.createWriteStream(desktop);
// Application initialization
const http = require('http');
let attr = [];
function connected(err) {
	console.log('Connected to the host');
}

// Connecting to the MySQL DB
const connection = mysql.createConnection({
	host: process.env.HOST,
	user: process.env.USER_ID,
	password: process.env.USER_PASSWORD,
	database: process.env.DB,
	port: 3306
});

connection.connect(function(err) {
	if (err) {
		console.log('Something went wrong\n', err.stack);
	} else {
		console.log('Connected to the database');
	}
});

const groupAttrQuery = new Promise((resolve, reject) => {
	let sortGroup = [];
	connection.query(
		'SELECT * FROM  ocvj_attribute_group ORDER BY sort_order ASC',
		function(err, rows, fields) {
			if (err) throw err;
			// Clear the connection
			// Return products array after the operation is complete
			rows.map(row => {
				sortGroup.push({
					sort_order: row.sort_order,
					name: null,
					attribute_group_id: row.attribute_group_id,
					attributes: []
				});
			});
			resolve(sortGroup);
		}
	);
});

groupAttrQuery
	.then(sortGroup => {
		const getGroupName = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM  ocvj_attribute_group_description ORDER BY attribute_group_id ASC',
				function(err, rows, fields) {
					if (err) throw err;
					// Clear the connection
					// Return products array after the operation is complete
					rows.map(row => {
						sortGroup.map(sortObj => {
							if (row.attribute_group_id === sortObj.attribute_group_id) {
								sortObj.name = row.name;
								return;
							}
						});
					});
					resolve(sortGroup);
				}
			);
		});
		return getGroupName;
	})
	.then(sortGroup => {
		const getAttributeIDs = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM  ocvj_attribute ORDER BY attribute_group_id ASC',
				function(err, rows, fields) {
					if (err) throw err;
					// Clear the connection
					// Return products array after the operation is complete
					rows.map(row => {
						sortGroup.map(sortObj => {
							if (row.attribute_group_id === sortObj.attribute_group_id) {
								sortObj.attributes.push({
									sortId: row.sort_order,
									id: row.attribute_id
								});
							}
						});
					});
					resolve(sortGroup);
				}
			);
		});
		return getAttributeIDs;
	})
	.then(sortGroup => {
		const getAttributeName = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM  ocvj_attribute_description ORDER BY attribute_id ASC',
				function(err, rows, fields) {
					if (err) throw err;
					// Clear the connection
					// Return products array after the operation is complete
					rows.map(row => {
						sortGroup.map(sortObj => {
							sortObj.attributes.map(idObj => {
								if (row.attribute_id === idObj.id) {
									idObj.name = row.name;
									return;
								}
							});
						});
					});
					resolve(sortGroup);
				}
			);
		});
		return getAttributeName;
	})
	.then(sortGroup => {
		sortGroup.map(obj => {
			obj.attributes.sort((obj1, obj2) => obj1.sortId > obj2.sortId);
		});
		return sortGroup;
	})
	.then(sortGroup => {
		const jsonContent = JSON.stringify(sortGroup, null, 4);
		fs.writeFile('output.json', jsonContent, 'utf8', function(err) {
			if (err) {
				console.log('An error occured while writing JSON Object to File.');
				return console.log(err);
			}

			console.log('JSON file has been saved.');
		});
		// console.log(JSON.stringify(sortGroup, null, 4))
	})

	.catch(err => console.log(err));

app.listen(5000, function() {
	console.log('Listening on port 5000');
});
