const assert = require('assert');
const NotificationService = require('../services/notificationService');

(async function run() {
  console.log('🧪 unit-test: NotificationService');

  // Test: generateCustomerMessage should not contain 'undefined' or 'NaN' and should include key fields
  const order = {
    orderId: 'ORD-1234',
    customerName: 'Anita',
    garmentType: 'Saree',
    totalAmount: '2500',
    advanceAmount: '500',
    deliveryDate: new Date().toISOString()
  };

  const msg = NotificationService.generateCustomerMessage(order, 'diwali');
  assert.strictEqual(typeof msg, 'string');
  assert(msg.includes('Anita'), 'message should include customer name');
  assert(msg.includes('₹2,500') || msg.includes('2500'), 'message should include total amount');
  assert(!/undefined/.test(msg), 'message must not contain "undefined"');
  assert(!/NaN/.test(msg), 'message must not contain "NaN"');

  console.log('  ✅ generateCustomerMessage: basic sanitization checks passed');

  // Test: sendWhatsAppToCustomer should return wa.me url when called
  const waResult = await NotificationService.sendWhatsAppToCustomer('+919876543210', 'Test message', 'https://example.com/invoice.pdf');
  assert.strictEqual(waResult.success, true, 'sendWhatsAppToCustomer should succeed');
  assert(waResult.whatsappUrl && waResult.whatsappUrl.includes('wa.me'), 'whatsappUrl should contain wa.me');

  console.log('  ✅ sendWhatsAppToCustomer: wa.me link generation passed');

  console.log('\n🎯 NotificationService unit tests passed');
})();