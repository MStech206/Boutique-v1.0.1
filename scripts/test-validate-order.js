const DataFlowService = require('../services/dataFlowService');

function shouldThrow(fn, expected) {
  try {
    fn();
    console.error('❌ Expected throw but did not');
    process.exit(1);
  } catch (err) {
    if (expected && !err.message.includes(expected)) {
      console.error(`❌ Threw but message mismatch. Expected to include: "${expected}", got: "${err.message}"`);
      process.exit(1);
    }
    console.log(`✅ Threw as expected: ${err.message}`);
  }
}

(function run() {
  console.log('\n🧪 Running order payload validation tests...');

  // Valid payload
  const valid = {
    customer: { name: 'Test', phone: '+919876543210' },
    garmentType: 'Kurta',
    pricing: { total: 1500, advance: 500 },
    workflow: ['dyeing']
  };

  try {
    const ok = DataFlowService.validateOrderPayload(valid);
    if (!ok || !ok.valid) throw new Error('Validation did not return valid');
    console.log('✅ Valid payload passed validation');
  } catch (err) {
    console.error('❌ Valid payload failed validation:', err.message);
    process.exit(1);
  }

  // Missing customerName
  shouldThrow(() => DataFlowService.validateOrderPayload({ ...valid, customer: { phone: '+919876543210' } }), 'customerName is required');

  // Invalid phone
  shouldThrow(() => DataFlowService.validateOrderPayload({ ...valid, customer: { name: 'A', phone: '123' } }), 'customerPhone');

  // Missing garmentType
  const noGarment = { ...valid, garmentType: '' };
  shouldThrow(() => DataFlowService.validateOrderPayload(noGarment), 'garmentType is required');

  // Zero total
  const zeroTotal = { ...valid, pricing: { total: 0, advance: 0 } };
  shouldThrow(() => DataFlowService.validateOrderPayload(zeroTotal), 'totalAmount');

  // No workflow
  const noWorkflow = { ...valid, workflow: [] };
  shouldThrow(() => DataFlowService.validateOrderPayload(noWorkflow), 'At least one workflow');

  // Advance greater than total
  const badAdvance = { ...valid, pricing: { total: 1000, advance: 1500 } };
  shouldThrow(() => DataFlowService.validateOrderPayload(badAdvance), 'advance cannot be greater than total');

  console.log('\n🎉 All validation tests passed');
  process.exit(0);
})();