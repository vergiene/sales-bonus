/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
	const discount = 1 - (purchase.discount / 100);
	return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
	if (index === 0) {
		return seller.profit * 0.15;
	} else if (index === total - 1) {
		return 0;
	} else if (index === 1 || index === 2) {
		return seller.profit * 0.1;
	} else {
		return seller.profit * 0.05;
	}
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
	if (!data
		|| !Array.isArray(data.sellers)
		|| data.sellers.length === 0
		|| !Array.isArray(data.purchase_records)
		|| data.purchase_records.length === 0
		|| !Array.isArray(data.products)
		|| data.products.length === 0) {
		throw new Error('Not enough data.');
	}

	const {calculateBonus, calculateRevenue} = options;
	if (!calculateBonus || !calculateRevenue
		|| typeof calculateBonus !== 'function'
		|| typeof calculateRevenue !== 'function') {
		throw new Error('Not enough options.');
	}

	const sellerStats = data.sellers.map(seller => ({
		id: seller.id,
		name: `${seller.first_name} ${seller.last_name}`,
		revenue: 0,
		profit: 0,
		sales_count: 0,
		products_sold: {}
	}));

	const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));
	const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

	data.purchase_records.forEach(record => {
		const seller = sellerIndex[record.seller_id];
		seller.sales_count += 1;
		seller.revenue += record.total_amount;

		record.items.forEach(item => {
			const product = productIndex[item.sku];
			const cost = product.purchase_price * item.quantity;
			const revenue = calculateRevenue(item, product);
			const profit = revenue - cost;
			seller.profit += profit;
			if (!seller.products_sold[item.sku]) {
				seller.products_sold[item.sku] = 0;
			}
			seller.products_sold[item.sku] += item.quantity;
		});
	});

	sellerStats.sort((a, b) => b.profit - a.profit);

	sellerStats.forEach((seller, index) => {
		seller.bonus = calculateBonus(index, sellerStats.length, seller);
		seller.top_products = Object.entries(seller.products_sold)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([sku, quantity]) => ({sku: sku, quantity: quantity}));
	});

	return sellerStats.map(seller => ({
		seller_id: seller.id,
		name: seller.name,
		revenue: +seller.revenue.toFixed(2),
		profit: +seller.profit.toFixed(2),
		sales_count: seller.sales_count,
		top_products: seller.top_products,
		bonus: +seller.bonus.toFixed(2)
	}));
}
