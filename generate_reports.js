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
const today = new Date();
const todayFormat = process.env.MAX_DATE || formatDate(today);
const minDate = process.env.MIN_DATE || '2000-05-01';
// const dateQuery = `AND (DATE(date_added) between "${d}" AND "2018-05-15")`;
function connected(err) {
	console.log('Connected to the host');
}

// Utility functions=================
function formatDate(date, inverse = true) {
	let formattedDate = new Date(date);
	let day = '';
	let month = '';
	if (formattedDate.getDate() < 10) {
		day += `0${formattedDate.getDate()}`;
	} else
		formattedDate.getDate() < 10
			? (day += `0${formattedDate.getDate()}`)
			: (day += formattedDate.getDate());
	formattedDate.getMonth() + 1 < 10
		? (month += `0${formattedDate.getMonth() + 1}`)
		: (month += formattedDate.getMonth() + 1);

	if (inverse) {
		return `${formattedDate.getFullYear()}-${month}-${day}`;
	} else {
		return `${day}.${month}.${formattedDate.getFullYear()}`;
	}
}

function formatNumber(nr) {
	let regEx = /^\W?4?(\d{4})\W?(\d{3})\W?(\d{3})/;
	let formattedNr = nr.replace(regEx, '$1 $2 $3');
	return formattedNr;
}

function getStoreName(id) {
	if (id === 0) {
		return 'UTOPIA';
	} else {
		return 'DEPOZIT';
	}
}

function formatPayment(str) {
	if (str.match(/online/)) {
		return 'Card online';
	} else {
		return 'Ramburs';
	}
}
// ==================================

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
		`SELECT * FROM ocvj_order_history WHERE (order_status_id = 5) AND (DATE(date_added) between "${minDate}" AND "${todayFormat}")  ORDER BY order_id ASC`,
		function(err, rows, fields) {
			if (err) throw err;
			console.log('Searching: \n');

			rows.map(row => {
				products.push({
					order_id: row.order_id,
					date_added: formatDate(row.date_added, false)
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
									order_id: product.order_id,
									name: product.name,
									quantity: product.quantity,
									price: parseFloat(product.price.toFixed(2)),
									model: product.model,
									date_added: product.date_added
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
		let customers = [];
		const getCostumers = new Promise((resolve, reject) => {
			connection.query(
				'SELECT * FROM ocvj_order ORDER BY order_id ASC',
				function(err, rows, fields) {
					if (err) throw err;
					console.log('Getting costumers');

					details.map(detail => {
						rows.map(row => {
							if (detail.order_id === row.order_id) {
								detail.customerName = `${row.firstname} ${row.lastname}`;
								detail.shippingAdd = `${row.shipping_address_1}, ${
									row.shipping_city
								}`;
								detail.payAdd = `${row.payment_address_1}, ${row.payment_city}`;
								detail.payMethod = formatPayment(row.payment_method);
								detail.phone = formatNumber(row.telephone);
								detail.storeID = getStoreName(row.store_id);

								customers.push({
									Nume: detail.name,
									Cantitate: detail.quantity,
									Pret_furnizor: detail.price,
									Data_adaugare: detail.date_added,
									Referinta: detail.storeID,
									Nr_comanda: detail.order_id,
									Nume_Client: detail.customerName,
									Nr_telefon: detail.phone,
									Adresa_facturare: detail.payAdd,
									Adresa_livrare: detail.shippingAdd,
									Modalitate_plata: detail.payMethod
								});
								// console.log(detail);
								return;
							}
						});
					});
					resolve(customers);
				}
			);
		});
		return getCostumers;
	})
	.then(customers => {
		// let json = JSON.stringify(details, null, 4);
		let xls = json2xls(customers);
		console.log(JSON.stringify(customers, null, 4));
		fs.writeFileSync('raport.xlsx', xls, 'binary');
	})
	.catch(err => console.log(err));

app.listen(5000, function() {
	console.log('Listening on port 5000');
});
