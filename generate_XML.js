// Module dependencies

const app = require('express')();
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const desktop = path.resolve(__dirname, '..', '..', 'text.xml');
const file = fs.createWriteStream(desktop);
// Application initialization
const http = require('http');

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

// Creating a promise to deal with asynchronous code
const searchQuery = new Promise((resolve, reject) => {
	// Array that will store all products
	let products = [];
	// Select all rows from table and order them by product_id in ascending order
	connection.query(
		'SELECT * FROM ocvj_product ORDER BY product_id ASC',
		function(err, rows, fields) {
			if (err) throw err;
			console.log('The book titles are being written: \n');

			// Constructing the image_url
			// Create the first part of the url
			let url = 'http://utopiashop.ro/image/cache/';
			rows.forEach(row => {
				if (row.status === 1) {
					// Concatenating first part with whatever comes from row.image tab
					let new_url = url + row.image;
					// Splt the url at '.' in order the insert text
					let splitted_url = new_url.split('.');
					// Extract the last element and assign it to a variable
					let ext = splitted_url.pop();
					// Adding resolution to the last element of the array
					splitted_url[splitted_url.length - 1] += '-800x800';
					// Push the extension, create the final url then replace white space with '%20'
					splitted_url.push(ext);
					let correct_url = splitted_url.join('.');
					let spaced_url = correct_url.split(' ').join('%20');

					// Pushing all the needed data from the first table
					products.push({
						product_id: row.product_id,
						model: row.model,
						price: row.price,
						manufacturer_id: row.manufacturer_id,
						image_url: spaced_url
					});
				}
			});
			// Clear the connection
			// Return products array after the operation is complete
			resolve(products);
		}
	);
});
// Starting the promise chain
searchQuery
	.then(products => {
		// Verifying how many active elements there are
		console.log(`Done.\nFile size: ${products.length}`);
		// Returning the object to use moving forward
		return products;
	})

	.then(products => {
		// console.log(`Size of the ids array: ${ids.length}`)
		products.map(product => {
			for (let product_id in product) {
				if (product.hasOwnProperty(product_id)) {
					// console.log(`The ID's is: ${product.product_id}`)
				}
			}
		});
		// Creating a new promise that handles warranty
		const warrantyQuery = new Promise((resolve, reject) => {
			connection.query(
				'Select * FROM ocvj_product_attribute ORDER BY product_id ASC',
				function(err, rows, fields) {
					if (err) throw err;
					console.log('Looking for data...');
					products.map(product => {
						rows.map(row => {
							// Getting the data that matches the condition
							if (
								row.product_id === product.product_id &&
								row.attribute_id === 12
							) {
								// Split the text to transform months into years and add 'an' or 'ani'
								let splitDate = row.text.split(' ');
								for (let i = 0; i < splitDate.length - 1; i++) {
									let divideYear = Number(splitDate[0]) / 12;
									if (divideYear === 24) {
										splitDate[1] = 'an';
									} else {
										splitDate[1] = 'ani';
									}
									// Putting everything together
									product.warranty = `Garantie ${divideYear.toString()} ${
										splitDate[1]
									}`;
									// console.log(product.warranty);
									break;
								}
							}
						});
					});
					// Adding delivery property
					products.map(product => {
						Number(product.price) > 300
							? (product.delivery = 'Free')
							: (product.delivery = '30  Ron');
					});
					resolve(products);
				}
			);
		});
		return warrantyQuery;
	})
	.then(products => {
		products.map(product => {
			if (product.warranty === undefined) {
				product.warranty = 'faragarantie';
			}
		});
		return products;
	})
	.then(products => {
		// Get the name of the product
		const nameQuery = new Promise(function(resolve, reject) {
			connection.query(
				'SELECT * FROM ocvj_product_description ORDER BY product_id ASC',
				(err, rows, fields) => {
					if (err) throw err;
					products.map(product => {
						rows.map(row => {
							if (product.product_id === row.product_id) {
								let replaceAscii = row.name.replace('&amp;', '&');
								let replaceQuote = replaceAscii.replace('&quot;', '"');
								product.name = replaceQuote;
							}
						});
					});
					resolve(products);
				}
			);
		});
		return nameQuery;
	})
	.then(products => {
		// Get the manufacturer name
		const manufacturerQuery = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_manufacturer ORDER BY manufacturer_id ASC',
				(err, rows, fields) => {
					if (err) throw err;
					products.map(product => {
						rows.map(row => {
							if (product.manufacturer_id === row.manufacturer_id) {
								let replaceAscii = row.name.replace('&amp;', '&');
								product.manufacturer = replaceAscii;
								// console.log(product);
							}
						});
					});
					resolve(products);
				}
			);
		});
		return manufacturerQuery;
	})
	.then(products => {
		// Get the id of the manufacturer in to use it for the name
		const categoryID = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_product_to_category ORDER BY product_id ASC',
				(err, rows, fields) => {
					if (err) throw err;
					products.map(product => {
						rows.map(row => {
							if (product.product_id === row.product_id) {
								product.category_id = row.category_id;
							}
						});
					});
					resolve(products);
				}
			);
		});
		return categoryID;
	})
	.then(products => {
		// Get IDs that construct the product URL
		const pathID = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_category_path ORDER BY level ASC',
				(err, rows, fields) => {
					if (err) throw err;
					products.map(product => {
						// Store path ids in an array to construct the product_url
						product.path_ids = [];
						rows.map(row => {
							if (product.category_id === row.category_id) {
								product.path_ids.push(row.path_id);
							}
						});
					});
					resolve(products);
				}
			);
		});
		return pathID;
	})
	.then(products => {
		products.map(product => {
			let ids = [];
			product.product_url =
				'http://utopiashop.ro/index.php?route=product/product&path=';
			for (let i = 0; i < product.path_ids.length; i++) {
				let s = product.path_ids[i] + '_';
				if (i === product.path_ids.length - 1) {
					let m = s.split('_');
					s = m[0];
				}
				product.product_url += s;
			}
			product.product_url += `&product_id=${product.product_id}`;
		});
		return products;
	})
	.then(products => {
		products.map(product => {
			// Keep shifting array elements until array.length becomes 2
			while (product.path_ids.length > 2) {
				product.path_ids.shift();
			}
			product.mo_categoryID = product.path_ids[0];
			product.descriptionID = product.path_ids[1];
		});
		return products;
	})
	.then(products => {
		const category = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_category_description',
				(err, rows, fields) => {
					if (err) throw err;
					products.map(product => {
						// Store path ids in an array to construct the product_url
						product.path_ids = [];
						rows.map(row => {
							// Replace ASCII code with symbols
							if (product.mo_categoryID === row.category_id) {
								let replaceAscii = row.name.replace('&amp;', '&');
								product.category = replaceAscii;
							} else if (product.descriptionID === row.category_id) {
								let replaceAscii = row.name.replace('&amp;', '&');
								product.description = replaceAscii;
							}
						});
					});
					resolve(products);
				}
			);
		});
		return category;
	})
	.then(products => {
		const specialPrice = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_product_special ORDER BY product_id ASC',
				(err, rows, fields) => {
					if (err) throw err;
					products.map(product => {
						rows.map(row => {
							if (product.product_id === row.product_id) {
								product.price = row.price;
							}
						});
					});
					resolve(products);
				}
			);
		});
		return specialPrice;
	})
	.then(products => {
		function compare(a, b) {
			if (a.manufacturer < b.manufacturer) return -1;
			if (a.manufacturer > b.manufacturer) return 1;
			return 0;
		}
		products.sort(compare);
		return products;
	})
	.then(products => {
		// Write the XML file
		file.write('<products>\n');
		products.map(product => {
			file.write(
				`\t<product>\n\t\t<manufacturer>${
					product.manufacturer
				}</manufacturer>\n\t\t<name>${product.name}</name>\n\t\t <image_url>${
					product.image_url
				}</image_url>\n\t\t<product_url>${
					product.product_url
				}</product_url>\n\t\t<price>${(product.price * 1.19).toFixed(
					2
				)}</price>\n\t\t<currency>Ron</currency>\n\t\t<category>${
					product.category
				}</category>\n\t\t<description>${
					product.description
				}</description>\n\t\t<delivery_cost>${
					product.delivery
				}</delivery_cost>\n\t\t<product_id>${
					product.model
				}</product_id>\n\t\t<identifier>${
					product.product_id
				}</identifier>\n\t\t<action_text>${
					product.warranty
				}</action_text>\n\t</product>\n`
			);
		});
		file.write('</products>');
		console.log('Done writing file!');
		file.end();
	});

app.listen(5000, function() {
	console.log('Listening on port 5000');
});
