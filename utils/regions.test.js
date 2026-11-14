import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  REGION_NAME_MAX_LENGTH,
  US_STATES,
  stateName,
  isSingleStateType,
  statesForType,
  validateRegionForm,
  sortRegions,
  withRegionSaved,
  describeRegion,
  regionUsageLabel,
  mergeRegionOptions,
  filterRegionOptions,
  toggleRegionId,
  getVenueRegions,
} from './regions.js'

const georgia = { regionID: 1, name: 'Georgia', type: 'Statewide', states: ['GA'], isActive: true }
const atlanta = { regionID: 2, name: 'Atlanta Metro', type: 'WithinState', states: ['GA'], isActive: true }
const southeast = { regionID: 3, name: 'Southeast', type: 'Multistate', states: ['AL', 'GA', 'TN'], isActive: true }

test('there are fifty states and the District of Columbia, and names are looked up by code', () => {
  assert.equal(US_STATES.length, 51)
  assert.equal(stateName('ga'), 'Georgia')
  assert.equal(stateName('DC'), 'District of Columbia')
  assert.equal(stateName('ZZ'), 'ZZ')
  assert.equal(stateName(undefined), '')
})

test('statewide and within-state regions are single-state; multistate is not', () => {
  assert.equal(isSingleStateType('Statewide'), true)
  assert.equal(isSingleStateType('WithinState'), true)
  assert.equal(isSingleStateType('Multistate'), false)
  assert.deepEqual(statesForType('Statewide', ['GA', 'AL']), ['GA'])
  assert.deepEqual(statesForType('Multistate', ['GA', 'AL']), ['GA', 'AL'])
  assert.deepEqual(statesForType('Statewide', undefined), [])
})

test('a valid region of each type passes', () => {
  assert.equal(validateRegionForm({ name: ' Georgia ', type: 'Statewide', states: ['GA'] }), '')
  assert.equal(validateRegionForm({ name: 'Atlanta Metro', type: 'WithinState', states: ['ga'] }), '')
  assert.equal(validateRegionForm({ name: 'Southeast', type: 'Multistate', states: ['AL', 'GA', 'TN'] }), '')
})

test('the name is required, limited and free of markup', () => {
  assert.match(validateRegionForm({ name: '', type: 'Statewide', states: ['GA'] }), /Enter a region name/)
  assert.match(validateRegionForm({ name: '   ', type: 'Statewide', states: ['GA'] }), /Enter a region name/)
  assert.match(validateRegionForm({ name: 'a'.repeat(REGION_NAME_MAX_LENGTH + 1), type: 'Statewide', states: ['GA'] }), /at most 100 characters/)
  for (const name of ['<b>x</b>', 'a > b', 'tab\there']) {
    assert.match(validateRegionForm({ name, type: 'Statewide', states: ['GA'] }), /can't contain/)
  }
})

test('the type must be one of the three', () => {
  for (const type of [undefined, '', 'Province', 'statewide']) {
    assert.match(validateRegionForm({ name: 'X', type, states: ['GA'] }), /Choose a region type/)
  }
})

test('states must match the type', () => {
  assert.match(validateRegionForm({ name: 'X', type: 'Statewide', states: [] }), /exactly one state/)
  assert.match(validateRegionForm({ name: 'X', type: 'Statewide', states: ['GA', 'AL'] }), /exactly one state/)
  assert.match(validateRegionForm({ name: 'X', type: 'WithinState', states: [] }), /one state this region is in/)
  assert.match(validateRegionForm({ name: 'X', type: 'WithinState', states: ['GA', 'AL'] }), /one state this region is in/)
  assert.match(validateRegionForm({ name: 'X', type: 'Multistate', states: ['GA'] }), /at least two states/)
  assert.match(validateRegionForm({ name: 'X', type: 'Multistate', states: ['GA', 'ga'] }), /at least two states/)
  assert.match(validateRegionForm({ name: 'X', type: 'Statewide', states: ['XX'] }), /from the list/)
  assert.equal(validateRegionForm({ name: 'X', type: 'Statewide', states: ['GA', 'ga'] }), '')
})

test('regions are listed by name and saving replaces by id without changing the given list', () => {
  const list = [southeast, georgia]
  assert.deepEqual(sortRegions(list).map((item) => item.name), ['Georgia', 'Southeast'])
  assert.deepEqual(list.map((item) => item.name), ['Southeast', 'Georgia'])

  assert.deepEqual(withRegionSaved(list, atlanta).map((item) => item.name), ['Atlanta Metro', 'Georgia', 'Southeast'])

  const renamed = withRegionSaved(list, { ...georgia, name: 'State of Georgia', isActive: false })
  assert.equal(renamed.length, 2)
  assert.deepEqual(renamed.map((item) => item.name), ['Southeast', 'State of Georgia'])
  assert.deepEqual(withRegionSaved(undefined, georgia).map((item) => item.name), ['Georgia'])
})

test('a region is described by its type and states', () => {
  assert.equal(describeRegion(georgia), 'Statewide · Georgia')
  assert.equal(describeRegion(atlanta), 'Within Georgia')
  assert.equal(describeRegion(southeast), 'Multistate · AL, GA, TN')
})

test('usage is described in words', () => {
  assert.equal(regionUsageLabel(0, 0), 'Not used yet')
  assert.equal(regionUsageLabel(undefined, undefined), 'Not used yet')
  assert.equal(regionUsageLabel(1, 0), '1 venue')
  assert.equal(regionUsageLabel(3, 1), '3 venues, 1 artist')
  assert.equal(regionUsageLabel(0, 2), '2 artists')
})

test('picker options are the active regions plus the ones the record already has, once each', () => {
  const retired = { regionID: 9, name: 'Old Area', type: 'WithinState', states: ['AL'], isActive: false }
  const options = mergeRegionOptions([southeast, georgia], [retired, { ...georgia }])
  assert.deepEqual(options.map((item) => item.name), ['Georgia', 'Old Area', 'Southeast'])
  assert.deepEqual(mergeRegionOptions(undefined, undefined), [])
})

test('options are filtered by name or by state, ignoring case', () => {
  const options = [georgia, atlanta, southeast]
  assert.deepEqual(filterRegionOptions(options, '').map((item) => item.name), ['Georgia', 'Atlanta Metro', 'Southeast'])
  assert.deepEqual(filterRegionOptions(options, 'ATL').map((item) => item.name), ['Atlanta Metro'])
  assert.deepEqual(filterRegionOptions(options, 'tn').map((item) => item.name), ['Southeast'])
  assert.deepEqual(filterRegionOptions(options, 'tennessee').map((item) => item.name), ['Southeast'])
  assert.deepEqual(filterRegionOptions(options, 'zzz'), [])
})

test('toggling an id adds it or removes it without changing the given list', () => {
  const ids = [1, 2]
  assert.deepEqual(toggleRegionId(ids, 3), [1, 2, 3])
  assert.deepEqual(toggleRegionId(ids, 1), [2])
  assert.deepEqual(ids, [1, 2])
  assert.deepEqual(toggleRegionId(undefined, 5), [5])
})

test('venue regions are read from the venue, tolerating missing or odd data', () => {
  assert.deepEqual(getVenueRegions({ regions: [georgia] }), [georgia])
  assert.deepEqual(getVenueRegions({ Regions: [georgia] }), [georgia])
  assert.deepEqual(getVenueRegions({ regions: [georgia, null, { name: 'no id' }] }), [georgia])
  assert.deepEqual(getVenueRegions({}), [])
  assert.deepEqual(getVenueRegions(null), [])
})
