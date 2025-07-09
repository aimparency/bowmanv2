import { humanizeAmount } from './tools'
import { assert } from 'chai'
import { test } from 'vitest'


test('tools', () => {
  assert.equal(humanizeAmount(1323102830912809384100000000000n), "1323102830912.8093841") 
  assert.equal(humanizeAmount(1323102830912809384010000000000n), "1323102830912.80938401") 
  assert.equal(humanizeAmount(1323102830912809384001000000000n), "~1323102830912.80938400") 
  assert.equal(humanizeAmount(1323102830912809384000100000000n), "~1323102830912.80938400") 
  assert.equal(humanizeAmount(21030943000000000000000000n), "21030943") 
  assert.equal(humanizeAmount(21030943100000000000000000n), "21030943.1") 
  assert.equal(humanizeAmount(21030943110000000000000000n), "21030943.11") 
  assert.equal(humanizeAmount(21030943111112340000000000n), "21030943.11111234") 
  assert.equal(humanizeAmount(21030943111112345678000000n), "~21030943.11111234") 
  assert.equal(humanizeAmount(123456789123n), "~0.00000012") 
  assert.equal(humanizeAmount(12345678912n), "~0.00000001") 
  assert.equal(humanizeAmount(1234567891n), "~0.00000000") 
  assert.equal(humanizeAmount(123456789n), "~0.00000000") 
  assert.equal(humanizeAmount(123456789000n), "~0.00000012") 
  assert.equal(humanizeAmount(100023456789000n), "~0.00010002") 
})
