const db = require('../database/connection');
const httpError = require('../utils/httpError');

const ORDER_SELECT = `
  SELECT o.*, b.name AS buyer_name, COALESCE(sp.shop_name, s.name) AS shop_name
  FROM orders o
  JOIN users b ON b.id = o.buyer_id
  JOIN users s ON s.id = o.seller_id
  LEFT JOIN seller_profiles sp ON sp.user_id = o.seller_id`;

function listOrders(where = '', params = []) {
  const orders = db.prepare(`${ORDER_SELECT} ${where} ORDER BY o.id DESC`).all(...params);
  const itemsQuery = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  return orders.map((order) => ({ ...order, items: itemsQuery.all(order.id) }));
}

function getOrderForUser(id, user) {
  const [order] = listOrders('WHERE o.id = ?', [id]);
  if (!order) throw httpError(404, 'Заказ не найден');
  const allowed =
    user.role === 'admin' || order.buyer_id === user.id || order.seller_id === user.id;
  if (!allowed) throw httpError(403, 'Нет доступа к заказу');
  return order;
}

function createOrders(buyerId, data) {
  const quantities = new Map();
  data.items.forEach(({ productId, quantity }) => {
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  });

  const orderIds = db.transaction(() => {
    const bySeller = new Map();
    for (const [productId, quantity] of quantities) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product || product.status !== 'published') {
        throw httpError(400, `Товар №${productId} недоступен для заказа`);
      }
      if (product.seller_id === buyerId) throw httpError(400, 'Нельзя заказывать собственные товары');
      if (product.stock < quantity) {
        throw httpError(400, `Товара «${product.name}» недостаточно в наличии (осталось ${product.stock})`);
      }
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, productId);
      const lines = bySeller.get(product.seller_id) || [];
      lines.push({ product, quantity });
      bySeller.set(product.seller_id, lines);
    }

    const ids = [];
    for (const [sellerId, lines] of bySeller) {
      const total = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO orders (buyer_id, seller_id, total_price, contact_name, contact_phone, delivery_address, comment)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(buyerId, sellerId, total, data.contactName, data.contactPhone, data.deliveryAddress, data.comment || null);
      lines.forEach(({ product, quantity }) => {
        db.prepare(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)'
        ).run(lastInsertRowid, product.id, product.name, quantity, product.price);
      });
      ids.push(lastInsertRowid);
    }
    return ids;
  })();

  return listOrders(`WHERE o.id IN (${orderIds.map(() => '?').join(',')})`, orderIds);
}

function updateStatus(id, status, user) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw httpError(404, 'Заказ не найден');
  if (user.role === 'seller' && order.seller_id !== user.id) {
    throw httpError(403, 'Можно изменять только заказы на свои товары');
  }
  if (['completed', 'cancelled'].includes(order.status)) {
    throw httpError(400, 'Статус завершённого или отменённого заказа изменить нельзя');
  }
  db.transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    if (status === 'cancelled') {
      db.prepare(
        `UPDATE products SET stock = stock + (SELECT quantity FROM order_items WHERE order_id = ? AND product_id = products.id)
         WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ? AND product_id IS NOT NULL)`
      ).run(id, id);
    }
  })();
}

module.exports = { listOrders, getOrderForUser, createOrders, updateStatus };
