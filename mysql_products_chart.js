// Module dependencies

const app = require('express')();
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const json2xls = require('json2xls');
const desktop = path.resolve(__dirname, '..', '..', 'products_chart.xml');
const file = fs.createWriteStream(desktop);
// Application initialization
const http = require('http');
const d = '2018-05-01';
function connected(err) {
	console.log('Connected to the host');
}

function formatDate(date) {
	let formatedDate = new Date(date);
	let day = '';
	let month = '';
	if (formatedDate.getDate() < 10) {
		day += `0${formatedDate.getDate()}`;
	} else
		formatedDate.getDate() < 10
			? (day += `0${formatedDate.getDate()}`)
			: (day += formatedDate.getDate());
	formatedDate.getMonth() + 1 < 10
		? (month += `0${formatedDate.getMonth() + 1}`)
		: (month += formatedDate.getMonth() + 1);
	return `${day}.${month}.${formatedDate.getFullYear()}`;
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

const searchQuery = new Promise((resolve, reject) => {
	// Array that will store all products
	let products = [];

	// Select all rows from table and order them by product_id in ascending order
	connection.query(
		`SELECT * FROM ocvj_order_history WHERE (order_status_id = 5) AND (DATE(date_added) between "${d}" AND "2018-05-15") ORDER BY order_id ASC`,
		function(err, rows, fields) {
			if (err) throw err;
			console.log('Searching: \n');

			rows.map(row => {
				products.push({
					order_id: row.order_id,
					date_added: formatDate(row.date_added)
				});
			});
			// Clear the connection
			// Return products array after the operation is complete
			resolve(products);
		}
	);
});

searchQuery
	.then(products => {
		let details = [];
		const getProductDetails = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_order_product ORDER BY order_id ASC',
				function(err, rows, fields) {
					if (err) throw err;
					console.log('Getting product details');

					products.map(product => {
						// var count = 0;

						// details.push(rows.filter(row => row.order_id === 131));
						rows.map(row => {
							if (product.order_id === row.order_id) {
								// if (count === 0) {
								// 	product.name = [];
								// 	product.model = [];
								// 	product.quantity = [];
								// 	product.price = [];
								// }
								// product.name.push(row.name);
								// product.model.push(row.model);
								// product.quantity.push(row.quantity);
								// product.price.push(row.total + row.tax);

								product.name = row.name;
								product.model = row.model;
								product.quantity = row.quantity;
								product.price = row.total + row.tax;

								details.push({
									// order_id: product.order_id,
									Nume: product.name,
									Cantitate: product.quantity,
									Pret_furnizor: product.price,
									Model: product.model,
									Data_adaugare: product.date_added
								});
								return;
								// count++;
							}
						});
						// details.push({
						// 	order_id: product.order_id,
						// 	name: product.name,
						// 	model: product.model,
						// 	quantity: product.quantity,
						// 	price: product.price,
						// 	date_added: product.date_added
						// });
					});
					// details.map((detail, index) => {
					// 	if (detail.name.length < 2) {
					// 		detail.name = detail.name.toString();
					// 		detail.model = detail.model.toString();
					// 		detail.quantity = parseInt(detail.quantity);
					// 		detail.price = parseFloat(detail.price.toString());
					// 	}
					// });
					resolve(details);
				}
			);
		});
		return getProductDetails;
	})
	.then(details => {
		// let json = JSON.stringify(details, null, 4);

		// let xls = json2xls(details);
		console.log(JSON.stringify(details, null, 4));
		// fs.writeFileSync('data.xlsx', xls, 'binary');
	})
	.catch(err => console.log(err));

app.listen(5000, function() {
	console.log('Listening on port 5000');
});
