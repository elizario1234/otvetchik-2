const savedTheme = localStorage.getItem('theme');
document.documentElement.dataset.theme =
  savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const app = document.getElementById('app');
const navBox = document.getElementById('nav');
const dialog = document.getElementById('dialog');
const toastBox = document.getElementById('toast');

const state = {
  user: null,
  categories: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  products: new Map()
};

const statusNames = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  processing: 'В работе',
  shipped: 'Отправлен',
  completed: 'Выполнен',
  cancelled: 'Отменён'
};

const emptyImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#e2d6c4"/><text x="300" y="390" font-size="64" text-anchor="middle" fill="#a8977f" font-family="serif">HANDCRAFT</text></svg>'
  );

const heroImages = [
  'https://unsplash.com/photos/lSRVxgcmwLY/download?force=true&w=900',
  'https://unsplash.com/photos/CNjfgzoY8JU/download?force=true&w=900',
  'https://unsplash.com/photos/MvDOOkWPpGs/download?force=true&w=900'
];

document.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName === 'IMG' && e.target.src !== emptyImage) e.target.src = emptyImage;
  },
  true
);

function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₸';
}

function formatDate(str) {
  return new Date(str.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function toast(text, bad) {
  toastBox.textContent = text;
  toastBox.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (toastBox.className = 'toast'), 2800);
}

async function api(url, method, body) {
  const res = await fetch('/api' + url, {
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  renderNav();
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function remember(list) {
  list.forEach((p) => state.products.set(p.id, p));
  return list;
}

function addToCart(id, qty) {
  const product = state.products.get(id);
  if (!product) return;
  const line = state.cart.find((item) => item.id === id);
  const current = line ? line.qty : 0;
  if (current + qty > product.stock) {
    toast('В наличии только ' + product.stock + ' шт.', true);
    return;
  }
  if (line) {
    line.qty += qty;
  } else {
    state.cart.push({
      id: product.id,
      qty: qty,
      name: product.name,
      price: product.price,
      image: product.image,
      shop: product.shop,
      stock: product.stock
    });
  }
  saveCart();
  toast('Добавлено в корзину');
}

function renderNav() {
  const u = state.user;
  let links = '<a href="#/catalog">Каталог</a>';
  if (!u) links += '<a class="hide-m" href="#/register">Стать мастером</a>';
  if (u && u.role === 'seller') links += '<a href="#/seller">Мастерская</a>';
  if (u && u.role === 'admin') links += '<a href="#/admin">Админ-панель</a>';
  if (u && u.role !== 'admin') links += '<a href="#/orders">Заказы</a>';
  links += u
    ? '<a href="#" data-logout class="hide-m">Выйти (' + esc(u.name.split(' ')[0]) + ')</a>'
    : '<a href="#/login">Войти</a>';
  if (!u || u.role === 'buyer') {
    links += '<a class="cart-link" href="#/cart">Корзина <span class="cart-count">' + cartCount() + '</span></a>';
  }
  const dark = document.documentElement.dataset.theme === 'dark';
  links += '<button class="theme-btn" data-theme-toggle aria-label="Сменить тему">' + (dark ? '☀' : '☾') + '</button>';
  navBox.innerHTML = '<a class="logo" href="#/">HAND<span>CRAFT</span></a><nav class="nav-links">' + links + '</nav>';
}

function card(p) {
  return (
    '<article class="card">' +
    '<a class="card-img" href="#/product/' + p.id + '"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
    '<span class="tag">' + esc(p.category_name) + '</span></a>' +
    '<div class="card-body"><p class="shop">' + esc(p.shop) + '</p>' +
    '<h3><a href="#/product/' + p.id + '">' + esc(p.name) + '</a></h3>' +
    '<div class="card-foot"><strong>' + money(p.price) + '</strong>' +
    '<button class="round" data-add="' + p.id + '"' + (p.stock < 1 ? ' disabled' : '') + ' aria-label="В корзину">+</button></div></div></article>'
  );
}

function emptyBlock(title, text, link) {
  return (
    '<div class="empty wrap"><h2>' + title + '</h2><p>' + text + '</p>' +
    (link ? '<p style="margin-top:28px"><a class="btn" href="' + link[0] + '">' + link[1] + '</a></p>' : '') +
    '</div>'
  );
}

async function home() {
  const products = remember(await api('/products'));
  const cats = state.categories
    .map((c) => {
      const first = products.find((p) => p.category_slug === c.slug);
      return (
        '<a class="cat" href="#/catalog?category=' + c.slug + '">' +
        (first ? '<img src="' + esc(first.image) + '" alt="" loading="lazy">' : '') +
        '<div><h3>' + esc(c.name) + '</h3><p>' + c.total + ' изделий</p></div></a>'
      );
    })
    .join('');
  const ticker = ['Керамика', 'Свечи', 'Вязание', 'Дерево', 'Кожа', 'Украшения']
    .map((t) => t + ' <span>✦</span>')
    .join('');

  app.innerHTML =
    '<section class="hero"><div>' +
    '<p class="eyebrow">Маркетплейс ручной работы</p>' +
    '<h1>Вещи, в которых есть <em>душа</em></h1>' +
    '<p class="lead">Покупайте изделия напрямую у мастеров: каждая вещь сделана руками и в единственном экземпляре.</p>' +
    '<div class="hero-actions"><a class="btn" href="#/catalog">Смотреть каталог</a><a class="btn ghost" href="#/register">Открыть мастерскую</a></div>' +
    '<ul class="hero-stats"><li><strong>' + products.length + '</strong><span>изделий</span></li>' +
    '<li><strong>' + new Set(products.map((p) => p.seller_id)).size + '</strong><span>мастера</span></li>' +
    '<li><strong>' + state.categories.length + '</strong><span>категории</span></li></ul></div>' +
    '<div class="hero-art"><img class="a" src="' + heroImages[0] + '" alt=""><img class="b" src="' + heroImages[1] + '" alt=""><img class="c" src="' + heroImages[2] + '" alt=""></div></section>' +
    '<div class="marquee"><div>' + ticker + ticker + '</div></div>' +
    '<section class="section wrap"><div class="head"><h2>Категории</h2></div><div class="cat-grid">' + cats + '</div></section>' +
    '<section class="section wrap" style="padding-top:20px"><div class="head"><div><p class="eyebrow">Новое</p><h2>Свежие изделия</h2></div>' +
    '<a class="link-arrow" href="#/catalog">Весь каталог →</a></div><div class="grid">' +
    products.slice(0, 8).map(card).join('') + '</div></section>' +
    '<section class="section wrap"><div class="head"><h2>Как это работает</h2></div><div class="steps">' +
    '<div class="step"><b>01</b><h3>Выберите вещь</h3><p>Листайте каталог, сравнивайте мастеров и читайте описания изделий.</p></div>' +
    '<div class="step"><b>02</b><h3>Оформите заказ</h3><p>Положите товары в корзину и укажите адрес. Оплата при получении.</p></div>' +
    '<div class="step"><b>03</b><h3>Получите подарок</h3><p>Мастер подтвердит заказ, упакует его и отправит вам.</p></div></div></section>' +
    '<section class="wrap"><div class="banner"><div><h2>Вы делаете вещи руками?</h2><p>Откройте свою мастерскую на платформе, добавьте изделия и принимайте заказы.</p></div>' +
    '<a class="btn" href="#/register">Стать мастером</a></div></section>';
}

async function catalog(params) {
  const query = new URLSearchParams();
  ['category', 'q', 'sort'].forEach((key) => {
    if (params.get(key)) query.set(key, params.get(key));
  });
  const products = remember(await api('/products?' + query.toString()));
  const current = params.get('category') || '';

  function link(extra) {
    const next = new URLSearchParams(params);
    Object.keys(extra).forEach((key) => (extra[key] ? next.set(key, extra[key]) : next.delete(key)));
    return '#/catalog?' + next.toString();
  }

  const chips =
    '<a class="chip' + (current ? '' : ' on') + '" href="' + link({ category: '' }) + '">Все</a>' +
    state.categories
      .map((c) => '<a class="chip' + (current === c.slug ? ' on' : '') + '" href="' + link({ category: c.slug }) + '">' + esc(c.name) + '</a>')
      .join('');
  const sort = params.get('sort') || 'new';

  app.innerHTML =
    '<div class="wrap"><div class="page-title"><p class="eyebrow">Каталог</p><h1>Всё, что <em>сделано</em> руками</h1></div>' +
    '<div class="filters"><div class="chips">' + chips + '</div>' +
    '<form class="search" data-form="search"><input name="q" placeholder="Поиск по названию" value="' + esc(params.get('q') || '') + '"><button class="btn small">Найти</button></form>' +
    '<select data-sort><option value="new"' + (sort === 'new' ? ' selected' : '') + '>Сначала новые</option>' +
    '<option value="cheap"' + (sort === 'cheap' ? ' selected' : '') + '>Сначала дешёвые</option>' +
    '<option value="expensive"' + (sort === 'expensive' ? ' selected' : '') + '>Сначала дорогие</option></select></div>' +
    '<p class="count">Найдено: ' + products.length + '</p>' +
    (products.length ? '<div class="grid">' + products.map(card).join('') + '</div>' : emptyBlock('Ничего не нашлось', 'Попробуйте изменить запрос или выбрать другую категорию.')) +
    '</div>';
}

async function product(id) {
  const p = await api('/products/' + id);
  remember([p]);
  const similar = remember(await api('/products?category=' + p.category_slug)).filter((x) => x.id !== p.id).slice(0, 4);
  const canBuy = p.stock > 0 && p.status === 'published' && (!state.user || state.user.role === 'buyer');

  app.innerHTML =
    '<div class="wrap"><div class="product"><div class="product-img"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '"></div><div>' +
    '<div class="meta"><a class="pill" href="#/catalog?category=' + p.category_slug + '">' + esc(p.category_name) + '</a>' +
    '<span class="pill">Мастер: ' + esc(p.shop) + '</span></div>' +
    '<h1>' + esc(p.name) + '</h1><div class="price">' + money(p.price) + '</div>' +
    '<p class="product-text">' + esc(p.description) + '</p>' +
    '<div class="meta"><span class="pill ' + (p.stock > 0 ? 'ok' : 'bad') + '">' + (p.stock > 0 ? 'В наличии: ' + p.stock + ' шт.' : 'Нет в наличии') + '</span></div><br>' +
    (canBuy
      ? '<div class="buy-row"><div class="qty"><button data-qty="-1">−</button><span id="qty">1</span><button data-qty="1">+</button></div>' +
        '<button class="btn" data-add-many="' + p.id + '">В корзину</button></div>'
      : '') +
    '</div></div>' +
    (similar.length ? '<section class="section"><div class="head"><h2>Похожие изделия</h2></div><div class="grid">' + similar.map(card).join('') + '</div></section>' : '') +
    '</div>';
}

function cartPage() {
  if (state.cart.length === 0) {
    app.innerHTML = emptyBlock('Корзина пуста', 'Загляните в каталог и выберите что-нибудь красивое.', ['#/catalog', 'Перейти в каталог']);
    return;
  }
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const rows = state.cart
    .map(
      (item) =>
        '<div class="cart-item"><a class="thumb" href="#/product/' + item.id + '"><img src="' + esc(item.image) + '" alt=""></a>' +
        '<div><p class="shop">' + esc(item.shop) + '</p><h3>' + esc(item.name) + '</h3><p>' + money(item.price) + '</p>' +
        '<button class="x" data-remove="' + item.id + '">Удалить</button></div>' +
        '<div class="qty"><button data-cart-qty="' + item.id + ':-1">−</button><span>' + item.qty + '</span><button data-cart-qty="' + item.id + ':1">+</button></div></div>'
    )
    .join('');
  app.innerHTML =
    '<div class="wrap"><div class="page-title"><h1>Корзина</h1></div><div class="cart-layout"><div>' + rows + '</div>' +
    '<aside class="summary"><div class="row"><span>Товаров</span><span>' + cartCount() + '</span></div>' +
    '<div class="row"><span>Доставка</span><span>по договорённости</span></div>' +
    '<div class="total">' + money(total) + '</div><a class="btn" href="#/checkout">Оформить заказ</a></aside></div></div>';
}

function checkout() {
  if (state.cart.length === 0) return (location.hash = '#/cart');
  if (!state.user) {
    toast('Сначала войдите в аккаунт', true);
    return (location.hash = '#/login');
  }
  if (state.user.role !== 'buyer') {
    app.innerHTML = emptyBlock('Заказы доступны покупателям', 'Войдите как покупатель, чтобы оформить заказ.');
    return;
  }
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  app.innerHTML =
    '<div class="wrap"><form class="form-card wide" data-form="checkout"><h1>Оформление</h1><p>Сумма заказа: <b>' + money(total) + '</b>. Оплата при получении.</p>' +
    '<div class="row2"><div class="field"><label>Имя получателя</label><input name="name" value="' + esc(state.user.name) + '" required></div>' +
    '<div class="field"><label>Телефон</label><input name="phone" placeholder="+7 700 000 00 00" required></div></div>' +
    '<div class="field"><label>Адрес доставки</label><input name="address" placeholder="Город, улица, дом, квартира" required></div>' +
    '<div class="field"><label>Комментарий</label><textarea name="comment"></textarea></div>' +
    '<div class="error" data-error></div><button class="btn">Подтвердить заказ</button></form></div>';
}

function loginPage() {
  app.innerHTML =
    '<div class="wrap"><form class="form-card" data-form="login"><h1>Вход</h1><p>Рады видеть вас снова.</p>' +
    '<div class="field"><label>Email</label><input type="email" name="email" required></div>' +
    '<div class="field"><label>Пароль</label><input type="password" name="password" required></div>' +
    '<div class="error" data-error></div><button class="btn">Войти</button>' +
    '<p class="alt">Нет аккаунта? <a href="#/register">Зарегистрироваться</a></p></form></div>';
}

function registerPage() {
  app.innerHTML =
    '<div class="wrap"><form class="form-card" data-form="register"><h1>Регистрация</h1><p>Создайте аккаунт покупателя или откройте мастерскую.</p>' +
    '<div class="switch"><label><input type="radio" name="role" value="buyer" checked>Я покупатель</label><label><input type="radio" name="role" value="seller">Я мастер</label></div>' +
    '<div class="field"><label>Ваше имя</label><input name="name" required></div>' +
    '<div class="field" id="shop-field" hidden><label>Название мастерской</label><input name="shop"></div>' +
    '<div class="field"><label>Email</label><input type="email" name="email" required></div>' +
    '<div class="field"><label>Пароль</label><input type="password" name="password" minlength="6" required></div>' +
    '<div class="error" data-error></div><button class="btn">Создать аккаунт</button>' +
    '<p class="alt">Уже есть аккаунт? <a href="#/login">Войти</a></p></form></div>';
}

function orderBlock(o) {
  const user = state.user;
  const items = o.items.map((i) => '<div><span>' + esc(i.title) + ' × ' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></div>').join('');
  const closed = o.status === 'completed' || o.status === 'cancelled';
  let action = '';
  if (user.role === 'buyer' && o.status === 'new') {
    action = '<button class="btn small danger" data-cancel="' + o.id + '">Отменить заказ</button>';
  } else if (user.role !== 'buyer' && !closed) {
    action =
      '<select data-status="' + o.id + '">' +
      Object.keys(statusNames).map((s) => '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' + statusNames[s] + '</option>').join('') +
      '</select>';
  }
  return (
    '<div class="order"><div class="order-top"><div><h3>Заказ №' + o.id + '</h3><small>' + formatDate(o.created_at) + ' · ' + esc(o.shop) + '</small></div>' +
    '<span class="badge ' + o.status + '">' + statusNames[o.status] + '</span></div>' +
    '<div class="order-items">' + items + '</div>' +
    '<p class="order-info">' + esc(o.name) + ', ' + esc(o.phone) + '<br>' + esc(o.address) + (o.comment ? '<br>«' + esc(o.comment) + '»' : '') + '</p>' +
    '<div class="order-foot"><strong>' + money(o.total) + '</strong>' + action + '</div></div>'
  );
}

async function ordersPage() {
  if (!state.user) return (location.hash = '#/login');
  const orders = await api('/orders');
  app.innerHTML =
    '<div class="wrap"><div class="page-title"><h1>' + (state.user.role === 'buyer' ? 'Мои заказы' : 'Заказы') + '</h1></div>' +
    (orders.length ? orders.map(orderBlock).join('') : emptyBlock('Заказов пока нет', 'Здесь появятся ваши заказы.', state.user.role === 'buyer' ? ['#/catalog', 'В каталог'] : null)) +
    '</div>';
}

function productForm(p) {
  const item = p || { name: '', description: '', price: '', stock: 1, image: '', category_id: '', status: 'published' };
  const options = state.categories
    .map((c) => '<option value="' + c.id + '"' + (c.id === item.category_id ? ' selected' : '') + '>' + esc(c.name) + '</option>')
    .join('');
  dialog.innerHTML =
    '<form data-form="product" data-id="' + (p ? p.id : '') + '"><h2>' + (p ? 'Редактировать товар' : 'Новый товар') + '</h2>' +
    '<div class="field"><label>Название</label><input name="name" value="' + esc(item.name) + '" required></div>' +
    '<div class="row2"><div class="field"><label>Категория</label><select name="categoryId" required><option value="">Выберите</option>' + options + '</select></div>' +
    '<div class="field"><label>Цена, ₸</label><input type="number" min="0" name="price" value="' + item.price + '" required></div></div>' +
    '<div class="row2"><div class="field"><label>Количество</label><input type="number" min="0" name="stock" value="' + item.stock + '" required></div>' +
    '<div class="field"><label>Статус</label><select name="status"><option value="published"' + (item.status === 'published' ? ' selected' : '') + '>Опубликован</option><option value="hidden"' + (item.status === 'hidden' ? ' selected' : '') + '>Скрыт</option></select></div></div>' +
    '<div class="field"><label>Ссылка на фото</label><input name="image" placeholder="https://..." value="' + esc(item.image) + '" required></div>' +
    '<div class="field"><label>Описание</label><textarea name="description" required>' + esc(item.description) + '</textarea></div>' +
    '<div class="error" data-error></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Сохранить</button></div></form>';
  dialog.showModal();
}

function productTable(list, admin) {
  const rows = list
    .map(
      (p) =>
        '<tr><td><div class="thumb"><img src="' + esc(p.image) + '" alt=""></div></td><td><b>' + esc(p.name) + '</b><br><small>' + esc(p.shop) + '</small></td>' +
        '<td>' + money(p.price) + '</td><td>' + p.stock + '</td><td><span class="badge ' + (p.status === 'published' ? 'completed' : '') + '">' + (p.status === 'published' ? 'Опубликован' : 'Скрыт') + '</span></td>' +
        '<td><div class="actions">' +
        (admin ? '' : '<button class="btn small ghost" data-edit="' + p.id + '">Изменить</button>') +
        '<button class="btn small ghost" data-toggle="' + p.id + ':' + (p.status === 'published' ? 'hidden' : 'published') + '">' + (p.status === 'published' ? 'Скрыть' : 'Показать') + '</button>' +
        '<button class="btn small danger" data-delete="' + p.id + '">Удалить</button></div></td></tr>'
    )
    .join('');
  return '<div class="table-wrap"><table><tr><th></th><th>Товар</th><th>Цена</th><th>Склад</th><th>Статус</th><th></th></tr>' + rows + '</table></div>';
}

async function sellerPage() {
  if (!state.user || state.user.role !== 'seller') return (location.hash = '#/login');
  const [list, orders] = await Promise.all([api('/my/products'), api('/orders')]);
  state.mine = list;
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const fresh = orders.filter((o) => o.status === 'new').length;
  app.innerHTML =
    '<div class="wrap"><div class="page-title"><p class="eyebrow">Кабинет мастера</p><h1>' + esc(state.user.shop) + '</h1></div>' +
    '<div class="tiles"><div class="tile"><strong>' + list.length + '</strong><span>товаров</span></div>' +
    '<div class="tile"><strong>' + orders.length + '</strong><span>заказов</span></div>' +
    '<div class="tile"><strong>' + fresh + '</strong><span>новых заказов</span></div>' +
    '<div class="tile"><strong>' + money(revenue) + '</strong><span>выручка</span></div></div>' +
    '<div class="head"><h2>Мои товары</h2><div class="actions"><a class="btn ghost" href="#/orders">Заказы</a><button class="btn" data-new-product>Добавить товар</button></div></div>' +
    (list.length ? productTable(list, false) : emptyBlock('Пока нет товаров', 'Добавьте первое изделие своей мастерской.')) +
    '</div>';
}

async function adminPage(params) {
  if (!state.user || state.user.role !== 'admin') return (location.hash = '#/login');
  const tab = params.get('tab') || 'stats';
  const names = { stats: 'Обзор', users: 'Пользователи', products: 'Товары', categories: 'Категории', orders: 'Заказы' };
  const tabs = Object.keys(names)
    .map((t) => '<a class="chip' + (t === tab ? ' on' : '') + '" href="#/admin?tab=' + t + '">' + names[t] + '</a>')
    .join('');
  let body = '';

  if (tab === 'stats') {
    const s = await api('/admin/stats');
    body =
      '<div class="tiles"><div class="tile"><strong>' + s.buyers + '</strong><span>покупателей</span></div>' +
      '<div class="tile"><strong>' + s.sellers + '</strong><span>мастеров</span></div>' +
      '<div class="tile"><strong>' + s.products + '</strong><span>товаров</span></div>' +
      '<div class="tile"><strong>' + s.orders + '</strong><span>заказов</span></div>' +
      '<div class="tile"><strong>' + money(s.revenue) + '</strong><span>оборот</span></div></div>';
  }
  if (tab === 'users') {
    const users = await api('/admin/users');
    const roles = { buyer: 'Покупатель', seller: 'Мастер', admin: 'Админ' };
    body =
      '<div class="table-wrap"><table><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Дата</th><th></th></tr>' +
      users
        .map(
          (u) =>
            '<tr><td><b>' + esc(u.name) + '</b>' + (u.shop ? '<br><small>' + esc(u.shop) + '</small>' : '') + '</td><td>' + esc(u.email) + '</td><td>' + roles[u.role] + '</td><td>' + formatDate(u.created_at) + '</td><td>' +
            (u.role === 'admin' ? '' : '<button class="btn small ' + (u.blocked ? '' : 'danger') + '" data-block="' + u.id + ':' + (u.blocked ? 0 : 1) + '">' + (u.blocked ? 'Разблокировать' : 'Заблокировать') + '</button>') +
            '</td></tr>'
        )
        .join('') +
      '</table></div>';
  }
  if (tab === 'products') body = productTable(await api('/admin/products'), true);
  if (tab === 'categories') {
    const rows = state.categories
      .map((c) => '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.slug) + '</td><td>' + c.total + '</td><td><button class="btn small danger" data-del-cat="' + c.id + '">Удалить</button></td></tr>')
      .join('');
    body =
      '<form class="search" data-form="category" style="margin-bottom:24px"><input name="name" placeholder="Название" required><input name="slug" placeholder="slug-latin" required><button class="btn small">Добавить</button></form>' +
      '<div class="table-wrap"><table><tr><th>Название</th><th>Slug</th><th>Товаров</th><th></th></tr>' + rows + '</table></div>';
  }
  if (tab === 'orders') {
    const orders = await api('/orders');
    body = orders.length ? orders.map(orderBlock).join('') : emptyBlock('Заказов нет', '');
  }

  app.innerHTML = '<div class="wrap"><div class="page-title"><p class="eyebrow">Администратор</p><h1>Управление</h1></div><div class="tabs">' + tabs + '</div>' + body + '</div>';
}

const routes = [
  [/^\/$/, home],
  [/^\/catalog$/, catalog],
  [/^\/product\/(\d+)$/, product],
  [/^\/cart$/, cartPage],
  [/^\/checkout$/, checkout],
  [/^\/login$/, loginPage],
  [/^\/register$/, registerPage],
  [/^\/orders$/, ordersPage],
  [/^\/seller$/, sellerPage],
  [/^\/admin$/, adminPage]
];

async function render() {
  const full = location.hash.slice(1) || '/';
  const parts = full.split('?');
  const params = new URLSearchParams(parts[1] || '');
  for (const route of routes) {
    const match = parts[0].match(route[0]);
    if (match) {
      try {
        await route[1](match[1] ? match[1] : params, params);
      } catch (e) {
        app.innerHTML = emptyBlock('Что-то пошло не так', esc(e.message), ['#/', 'На главную']);
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  app.innerHTML = emptyBlock('Страница не найдена', 'Такой страницы нет.', ['#/', 'На главную']);
}

async function refresh() {
  state.categories = await api('/categories');
  await render();
}

const forms = {
  search(form) {
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const q = form.q.value.trim();
    q ? params.set('q', q) : params.delete('q');
    location.hash = '#/catalog?' + params.toString();
  },

  async login(form) {
    const data = await api('/login', 'POST', { email: form.email.value, password: form.password.value });
    state.user = data.user;
    renderNav();
    toast('Добро пожаловать, ' + data.user.name.split(' ')[0]);
    location.hash = data.user.role === 'seller' ? '#/seller' : data.user.role === 'admin' ? '#/admin' : '#/';
  },

  async register(form) {
    const role = form.role.value;
    const data = await api('/register', 'POST', {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: role,
      shop: form.shop.value
    });
    state.user = data.user;
    renderNav();
    toast('Аккаунт создан');
    location.hash = role === 'seller' ? '#/seller' : '#/';
  },

  async checkout(form) {
    const items = state.cart.map((i) => ({ id: i.id, qty: i.qty }));
    await api('/orders', 'POST', {
      items: items,
      name: form.name.value,
      phone: form.phone.value,
      address: form.address.value,
      comment: form.comment.value
    });
    state.cart = [];
    saveCart();
    toast('Заказ оформлен');
    location.hash = '#/orders';
  },

  async product(form) {
    const body = {
      name: form.name.value,
      categoryId: form.categoryId.value,
      price: form.price.value,
      stock: form.stock.value,
      status: form.status.value,
      image: form.image.value,
      description: form.description.value
    };
    const id = form.dataset.id;
    await (id ? api('/products/' + id, 'PUT', body) : api('/products', 'POST', body));
    dialog.close();
    toast('Товар сохранён');
    render();
  },

  async category(form) {
    await api('/categories', 'POST', { name: form.name.value, slug: form.slug.value });
    toast('Категория добавлена');
    refresh();
  }
};

document.addEventListener('submit', async (e) => {
  const form = e.target;
  const handler = forms[form.dataset.form];
  if (!handler) return;
  e.preventDefault();
  const errorBox = form.querySelector('[data-error]');
  if (errorBox) errorBox.textContent = '';
  try {
    await handler(form);
  } catch (err) {
    if (errorBox) errorBox.textContent = err.message;
    else toast(err.message, true);
  }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.matches('[data-sort]')) {
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    params.set('sort', t.value);
    location.hash = '#/catalog?' + params.toString();
  }
  if (t.matches('[data-status]')) {
    try {
      await api('/orders/' + t.dataset.status, 'PATCH', { status: t.value });
      toast('Статус обновлён');
      render();
    } catch (err) {
      toast(err.message, true);
    }
  }
  if (t.name === 'role' && document.getElementById('shop-field')) {
    document.getElementById('shop-field').hidden = t.value !== 'seller';
  }
});

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;
  const d = t.dataset;

  try {
    if (t.hasAttribute('data-theme-toggle')) {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
      renderNav();
    }

    if (d.add) addToCart(Number(d.add), 1);

    if (d.addMany) {
      addToCart(Number(d.addMany), Number(document.getElementById('qty').textContent));
    }

    if (d.qty) {
      const el = document.getElementById('qty');
      el.textContent = Math.max(1, Number(el.textContent) + Number(d.qty));
    }

    if (d.cartQty) {
      const pair = d.cartQty.split(':');
      const line = state.cart.find((i) => i.id === Number(pair[0]));
      const next = line.qty + Number(pair[1]);
      if (next < 1) return;
      if (next > line.stock) return toast('В наличии только ' + line.stock + ' шт.', true);
      line.qty = next;
      saveCart();
      cartPage();
    }

    if (d.remove) {
      state.cart = state.cart.filter((i) => i.id !== Number(d.remove));
      saveCart();
      cartPage();
    }

    if (t.hasAttribute('data-logout')) {
      e.preventDefault();
      await api('/logout', 'POST');
      state.user = null;
      renderNav();
      toast('Вы вышли из аккаунта');
      location.hash = '#/';
      render();
    }

    if (d.cancel && confirm('Отменить заказ?')) {
      await api('/orders/' + d.cancel, 'PATCH', { status: 'cancelled' });
      toast('Заказ отменён');
      render();
    }

    if (t.hasAttribute('data-new-product')) productForm(null);

    if (d.edit) productForm(state.mine.find((p) => p.id === Number(d.edit)));

    if (t.hasAttribute('data-close')) dialog.close();

    if (d.toggle) {
      const pair = d.toggle.split(':');
      await api('/products/' + pair[0] + '/status', 'PATCH', { status: pair[1] });
      render();
    }

    if (d.delete && confirm('Удалить товар навсегда?')) {
      await api('/products/' + d.delete, 'DELETE');
      toast('Товар удалён');
      render();
    }

    if (d.block) {
      const pair = d.block.split(':');
      await api('/admin/users/' + pair[0], 'PATCH', { blocked: pair[1] === '1' });
      render();
    }

    if (d.delCat && confirm('Удалить категорию?')) {
      await api('/categories/' + d.delCat, 'DELETE');
      refresh();
    }
  } catch (err) {
    toast(err.message, true);
  }
});

window.addEventListener('hashchange', render);

(async function start() {
  const me = await api('/me');
  state.user = me.user;
  renderNav();
  await refresh();
})();