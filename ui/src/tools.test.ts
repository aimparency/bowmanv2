import { humanizeAmount } from './tools'
import { assert } from 'chai'
import { test } from 'vitest'


test('tools', () => {
  assert.equal(humanizeAmount(1323102830912), "1.3M") 
  assert.equal(humanizeAmount(21030943), "21.0M") 
  assert.equal(humanizeAmount(1234), "1.2K") 
  assert.equal(humanizeAmount(100), "100") 
  assert.equal(humanizeAmount(50), "50") 
  assert.equal(humanizeAmount(0), "0") 
})
