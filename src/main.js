/**
 * Функция для расчета выручки
 *  @param purchase запись о покупке * 
 * @param _product карточка товара * 
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    const discountRate = discount / 100;
    const totalPrice = sale_price * quantity;

    return totalPrice * (1 - discountRate);
}

/** * Функция для расчета бонусов * 
 * @param index порядковый номер в отсортированном массиве 
 * * @param total общее число продавцов 
 * * @param seller карточка продавца 
 * * @returns {number} */

function calculateBonusByProfit(index, total, seller) {
    const profit = seller.profit || 0;

    if (index === 0) {
        return profit * 0.15;
    }

    if (index === 1 || index === 2) {
        return profit * 0.10;
    }

    if (index === total - 1) {
        return 0;
    }

    return profit * 0.05;
}

/** 
 * Функция для анализа данных продаж 
 * @param data 
 * @param options 
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]} */

function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Данные не переданы или имеют неверный формат');
    }

    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Отсутствуют данные о продажах');
    }

    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Отсутствуют данные о товарах');
    }

    if (data.sellers && (!Array.isArray(data.sellers) || data.sellers.length === 0)) {
        throw new Error('Некорректные данные о продавцах');
    }

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Не переданы настройки');
    }

    if (typeof options.calculateRevenue !== 'function') {
        throw new Error('Функция calculateRevenue не передана');
    }

    if (typeof options.calculateBonus !== 'function') {
        throw new Error('Функция calculateBonus не передана');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Индексация товаров
    const productsMap = {};
    data.products.forEach(product => {
        productsMap[product.id] = product;
    });

    // Подготовка продавцов
    const sellersMap = {};

    data.purchase_records.forEach(record => {
        const { seller_id, seller_name, items } = record;

        if (!Array.isArray(items)) return;

        if (!sellersMap[seller_id]) {
            sellersMap[seller_id] = {
                seller_id,
                name: seller_name,
                revenue: 0,
                profit: 0,
                sales_count: 0,
                products_sold: {}
            };
        }

        const seller = sellersMap[seller_id];

        items.forEach(item => {
            const product = productsMap[item.product_id];
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = (product.cost_price || 0) * item.quantity;
            const profit = revenue - cost;

            seller.revenue += revenue;
            seller.profit += profit;
            seller.sales_count += item.quantity;

            if (!seller.products_sold[item.product_id]) {
                seller.products_sold[item.product_id] = 0;
            }

            seller.products_sold[item.product_id] += item.quantity;
        });
    });

    const sellers = Object.values(sellersMap);

    sellers.sort((a, b) => b.profit - a.profit);

    const total = sellers.length;

    sellers.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, total, seller);
    });

    return sellers.map(seller => {
        const top_products = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([productId]) => Number(productId));

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: seller.revenue,
            profit: seller.profit,
            sales_count: seller.sales_count,
            bonus: seller.bonus,
            top_products
        };
    });
}