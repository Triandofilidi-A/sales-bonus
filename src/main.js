/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;

  const discountRate = discount / 100;
  const totalPrice = sale_price * quantity;
  const revenue = totalPrice * (1 - discountRate);

  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  // Первое место — 15%
  if (index === 0) {
    return profit * 0.15;
  }

  // Второе и третье место — 10%
  if (index === 1 || index === 2) {
    return profit * 0.1;
  }

  // Последнее место — 0%
  if (index === total - 1) {
    return 0;
  }

  // Все остальные — 5%
  return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
  if (!data) {
    throw new Error("Некорректные входные данные: data не определен");
  }
  
  const sellers = data.sellers || data.customers;
  
  if (
    !Array.isArray(sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // Проверка наличия опций
  if (!options || !options.calculateRevenue || !options.calculateBonus) {
    throw new Error("Не переданы функции расчёта");
  }

  const { calculateRevenue, calculateBonus } = options;
  if (typeof calculateRevenue !== "function") {
    throw new Error("calculateRevenue должна быть функцией");
  }

  if (typeof calculateBonus !== "function") {
    throw new Error("calculateBonus должна быть функцией");
  }

  // 🔧 Индексация товаров по sku и id
  const productIndex = data.products.reduce((index, product) => {
    if (product.sku) index[product.sku] = product;
    if (product.id) index[product.id] = product;
    return index;
  }, {});

  const sellerStats = sellers.map((seller) => ({
    seller_id: seller.id,
    name: seller.name || `${seller.first_name || ''} ${seller.last_name || ''}`.trim(),
    revenue: 0,
    profit: 0,
    sales_count: 0,
    bonus: 0,
    products_sold: {},
    top_products: [],
  }));

  const sellerIndex = sellerStats.reduce((index, stat) => {
    index[stat.seller_id] = stat;
    return index;
  }, {});

  // Расчет выручки и прибыли
  data.purchase_records.forEach((record) => {
    const stat = sellerIndex[record.seller_id];
    if (!stat) return;
    if (!Array.isArray(record.items)) return;

    record.items.forEach((item) => {
      // 🔧 Ищем товар по sku или product_id
      const product = productIndex[item.sku] || productIndex[item.product_id];
      if (!product) return;

      const revenue = calculateRevenue(item, product);

      stat.revenue += revenue;
      
      // 🔧 Используем purchase_price для расчета прибыли
      const costPrice = product.purchase_price || product.cost_price || 0;
      const productCost = costPrice * item.quantity;
      stat.profit += revenue - productCost;
      
      stat.sales_count += item.quantity;

      // Накопление продаж по товарам
      const productKey = item.sku || item.product_id;
      if (!stat.products_sold[productKey]) {
        stat.products_sold[productKey] = 0;
      }
      stat.products_sold[productKey] += item.quantity;
    });
  });
  
  // Сортировка по прибыли (по убыванию)
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Назначение бонусов и топ 10
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku]) => sku);
  });

  // Итоговый результат с округлением
  const result = sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: Math.round(seller.revenue * 100) / 100,
    profit: Math.round(seller.profit * 100) / 100,
    sales_count: seller.sales_count,
    bonus: Math.round(seller.bonus * 100) / 100,
    top_products: seller.top_products,
  }));

  return result;
}
