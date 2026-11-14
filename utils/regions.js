export const REGION_NAME_MAX_LENGTH = 100

export const REGION_TYPES = [
  { value: 'Statewide', label: 'Statewide' },
  { value: 'Multistate', label: 'Multistate' },
  { value: 'WithinState', label: 'Within a state' },
]

// The 50 states and the District of Columbia, matching the API's list.
export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }))

const STATE_NAMES = new Map(US_STATES.map((state) => [state.code, state.name]))

export function stateName(code) {
  return STATE_NAMES.get(String(code || '').toUpperCase()) || String(code || '')
}

// Statewide regions and regions within a state cover exactly one state; a multistate region covers two or more.
export function isSingleStateType(type) {
  return type === 'Statewide' || type === 'WithinState'
}

// When the type changes, keep the states that still make sense: one state for the single-state types.
export function statesForType(type, states) {
  const list = Array.isArray(states) ? states : []
  return isSingleStateType(type) ? list.slice(0, 1) : list
}

// Same rules the API enforces, so staff get the message before the request is sent. Returns '' when the form is fine.
export function validateRegionForm({ name, type, states }) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return 'Enter a region name.'
  if (trimmed.length > REGION_NAME_MAX_LENGTH) return `Region names can be at most ${REGION_NAME_MAX_LENGTH} characters.`
  if (/[<>\u0000-\u001f\u007f]/.test(trimmed)) return "Region names can't contain < or > or control characters."
  if (!REGION_TYPES.some((option) => option.value === type)) return 'Choose a region type.'

  const unique = [...new Set((Array.isArray(states) ? states : []).map((code) => String(code).toUpperCase()))]
  if (unique.some((code) => !STATE_NAMES.has(code))) return 'Choose states from the list.'
  if (type === 'Multistate') return unique.length >= 2 ? '' : 'A multistate region must cover at least two states.'
  if (unique.length !== 1) return type === 'Statewide' ? 'A statewide region must cover exactly one state.' : 'Choose the one state this region is in.'
  return ''
}

export function sortRegions(regions) {
  return [...(Array.isArray(regions) ? regions : [])].sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')))
}

// Adds a region, or replaces the one with the same id, and keeps the list in name order.
export function withRegionSaved(regions, region) {
  const others = (Array.isArray(regions) ? regions : []).filter((item) => item.regionID !== region.regionID)
  return sortRegions([...others, region])
}

export function describeRegion(region) {
  const states = Array.isArray(region?.states) ? region.states : []
  if (region?.type === 'Statewide') return `Statewide · ${stateName(states[0])}`
  if (region?.type === 'WithinState') return `Within ${stateName(states[0])}`
  return `Multistate · ${states.join(', ')}`
}

export function regionUsageLabel(venueCount, artistCount) {
  const venues = Number(venueCount) || 0
  const artists = Number(artistCount) || 0
  if (venues === 0 && artists === 0) return 'Not used yet'
  const part = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`
  return [venues ? part(venues, 'venue') : '', artists ? part(artists, 'artist') : ''].filter(Boolean).join(', ')
}

// The options for a picker: the active regions, plus any region the record already has (even a deactivated one),
// so an existing choice stays visible and can be kept or removed.
export function mergeRegionOptions(activeRegions, existingRegions) {
  const byId = new Map()
  for (const region of [...(Array.isArray(activeRegions) ? activeRegions : []), ...(Array.isArray(existingRegions) ? existingRegions : [])]) {
    if (region && !byId.has(region.regionID)) byId.set(region.regionID, region)
  }
  return sortRegions([...byId.values()])
}

export function filterRegionOptions(options, query) {
  const needle = String(query ?? '').trim().toLowerCase()
  if (!needle) return Array.isArray(options) ? options : []
  return (Array.isArray(options) ? options : []).filter((region) => (
    String(region.name || '').toLowerCase().includes(needle)
    || (region.states || []).some((code) => code.toLowerCase() === needle || stateName(code).toLowerCase().includes(needle))
  ))
}

export function toggleRegionId(ids, id) {
  const current = Array.isArray(ids) ? ids : []
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

// Regions as they come back on a venue, tolerating missing data.
export function getVenueRegions(venue) {
  const raw = venue?.regions ?? venue?.Regions
  return Array.isArray(raw) ? raw.filter((region) => region && Number.isInteger(region.regionID)) : []
}
