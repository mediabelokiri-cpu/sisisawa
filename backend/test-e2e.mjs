import http from 'http';

const BASE_URL = 'http://localhost:5050/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING KASIRKU POS END-TO-END VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Health Check
  console.log('1. Testing Health Endpoint:');
  const health = await request('/health');
  assert(health.status === 200 && health.data?.status === 'ok', 'GET /health returns 200 OK');

  // 2. Authentication & JWT
  console.log('\n2. Testing Authentication & Role Guard:');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  assert(adminLogin.status === 200 && adminLogin.data?.data?.token, 'Admin Login returns JWT Token');
  assert(adminLogin.data?.data?.user?.role === 'ADMIN', 'Admin user role is ADMIN');
  const adminToken = adminLogin.data?.data?.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const kasirLogin = await request('/auth/login', {
    method: 'POST',
    body: { username: 'kasir', password: 'kasir123' }
  });
  assert(kasirLogin.status === 200 && kasirLogin.data?.data?.user?.role === 'KASIR', 'Kasir Login returns role KASIR');
  const kasirToken = kasirLogin.data?.data?.token;
  const kasirHeaders = { Authorization: `Bearer ${kasirToken}` };

  // Kasir accessing Admin route must be 403 Forbidden
  const kasirForbidden = await request('/dashboard/stats', { headers: kasirHeaders });
  assert(kasirForbidden.status === 403, 'Kasir is blocked from Admin Dashboard with 403 Forbidden');

  // 3. Dashboard Stats
  console.log('\n3. Testing Dashboard Stats:');
  const stats = await request('/dashboard/stats?range=30d', { headers: adminHeaders });
  assert(stats.status === 200, 'GET /dashboard/stats returns 200 OK');
  assert(stats.data?.data?.summary?.totalSales !== undefined, 'Dashboard summary has totalSales');
  assert(stats.data?.data?.summary?.totalTransactions !== undefined, 'Dashboard summary has totalTransactions');
  assert(stats.data?.data?.summary?.totalItemsSold !== undefined, 'Dashboard summary has totalItemsSold');
  assert(stats.data?.data?.summary?.averageTransaction !== undefined, 'Dashboard summary has averageTransaction');
  assert(Array.isArray(stats.data?.data?.chartData), 'Dashboard has chartData array');
  assert(Array.isArray(stats.data?.data?.topProducts), 'Dashboard has topProducts array');

  // 4. Categories CRUD & Constraints
  console.log('\n4. Testing Categories Module:');
  const cats = await request('/categories', { headers: adminHeaders });
  assert(cats.status === 200 && Array.isArray(cats.data?.data), 'GET /categories returns category list');

  const newCat = await request('/categories', {
    method: 'POST',
    headers: adminHeaders,
    body: { name: 'Kategori Uji Coba E2E' }
  });
  assert(newCat.status === 201 && newCat.data?.data?.id, 'POST /categories creates new category');
  const createdCatId = newCat.data?.data?.id;

  const editCat = await request(`/categories/${createdCatId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: { name: 'Kategori Uji Coba E2E Updated' }
  });
  assert(editCat.status === 200 && editCat.data?.data?.name === 'Kategori Uji Coba E2E Updated', 'PUT /categories/:id updates category name');

  // 5. Products CRUD, Profit & Status Toggle
  console.log('\n5. Testing Products Module:');
  const newProd = await request('/products', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      name: 'Produk Uji Coba E2E',
      categoryId: createdCatId,
      buyPrice: 10000,
      sellPrice: 18000,
      sku: 'SKU-TEST-001',
      status: 'AVAILABLE'
    }
  });
  assert(newProd.status === 201 && newProd.data?.data?.id, 'POST /products creates new product');
  assert(newProd.data?.data?.profit === 8000, 'Product calculates profit margin correctly (18000 - 10000 = 8000)');
  const createdProdId = newProd.data?.data?.id;

  // Toggle status
  const toggleProd = await request(`/products/${createdProdId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { status: 'UNAVAILABLE' }
  });
  assert(toggleProd.status === 200 && toggleProd.data?.data?.status === 'UNAVAILABLE', 'PATCH /products/:id/status toggles status to UNAVAILABLE');

  // Delete category with product must fail
  const delCatFail = await request(`/categories/${createdCatId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(delCatFail.status === 400, 'DELETE /categories/:id protected when category has associated products (400 Bad Request)');

  // 6. Transactions, Cancellation, and Deletion
  console.log('\n6. Testing Transactions Module:');
  const txs = await request('/transactions', { headers: adminHeaders });
  assert(txs.status === 200 && Array.isArray(txs.data?.data?.transactions), 'GET /transactions returns paginated list');

  const createTx = await request('/transactions', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      items: [{ productId: createdProdId, quantity: 2 }],
      paymentMethod: 'QRIS',
      discount: 2000,
      tax: 0
    }
  });
  assert(createTx.status === 201 && createTx.data?.data?.invoice_number, 'POST /transactions creates transaction with invoice number');
  const newTxId = createTx.data?.data?.id;

  const txDetail = await request(`/transactions/${newTxId}`, { headers: adminHeaders });
  assert(txDetail.status === 200 && txDetail.data?.data?.items?.length > 0, 'GET /transactions/:id returns detail items & receipt data');

  const cancelTx = await request(`/transactions/${newTxId}/cancel`, {
    method: 'PATCH',
    headers: adminHeaders
  });
  assert(cancelTx.status === 200 && cancelTx.data?.data?.status === 'Cancelled', 'PATCH /transactions/:id/cancel cancels transaction safely');

  // Test single delete transaction
  const delTx = await request(`/transactions/${newTxId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(delTx.status === 200, 'DELETE /transactions/:id deletes transaction permanently');

  // Test clear-all transactions
  const clearAllTx = await request('/transactions/clear-all', {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(clearAllTx.status === 200, 'DELETE /transactions/clear-all resets all transactions');

  // Clean up test product
  const delProd = await request(`/products/${createdProdId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(delProd.status === 200, 'DELETE /products/:id deletes unused test product');

  // Clean up test category
  const delCatSuccess = await request(`/categories/${createdCatId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(delCatSuccess.status === 200, 'DELETE /categories/:id succeeds when category is empty');

  // 7. Monthly Reports
  console.log('\n7. Testing Monthly Reports Module:');
  const report = await request('/reports/monthly?year=2026&month=9', { headers: adminHeaders });
  assert(report.status === 200 && report.data?.data?.summary, 'GET /reports/monthly returns summary and comparisons');
  assert(Array.isArray(report.data?.data?.dailyChart), 'Monthly report has continuous dailyChart');
  assert(Array.isArray(report.data?.data?.topProducts), 'Monthly report has topProducts');

  // 8. User Management
  console.log('\n8. Testing User Management:');
  const users = await request('/users', { headers: adminHeaders });
  assert(users.status === 200 && Array.isArray(users.data?.data), 'GET /users returns user list');

  const testUser = await request('/users', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      name: 'User E2E Test',
      username: `testuser_${Date.now()}`,
      password: 'password123',
      role: 'KASIR',
      status: 'Active'
    }
  });
  assert(testUser.status === 201 && testUser.data?.data?.id, 'POST /users creates cashier user');
  const testUserId = testUser.data?.data?.id;

  const resetPw = await request(`/users/${testUserId}/reset-password`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { newPassword: 'newpassword123' }
  });
  assert(resetPw.status === 200, 'PATCH /users/:id/reset-password resets password');

  const toggleUser = await request(`/users/${testUserId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { status: 'Inactive' }
  });
  assert(toggleUser.status === 200 && toggleUser.data?.data?.status === 'Inactive', 'PATCH /users/:id/status toggles status to Inactive');

  const delUser = await request(`/users/${testUserId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert(delUser.status === 200, 'DELETE /users/:id deletes unused test user');

  // 9. Settings
  console.log('\n9. Testing Settings Module:');
  const settings = await request('/settings', { headers: adminHeaders });
  assert(settings.status === 200 && settings.data?.data?.store_profile, 'GET /settings returns store profile & configs');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
