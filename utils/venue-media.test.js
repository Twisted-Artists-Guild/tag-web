import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  VENUE_IMAGE_MAX_BYTES,
  VENUE_LOGO_MAX_BYTES,
  authorizeVenueMediaChange,
  blobNameFromUrl,
  getFileExtension,
  getVenueImageMaxBytes,
  getVenueMediaTarget,
  hasUnsafeBlobPath,
  isAllowedVenueImageName,
  sniffImageType,
  validateVenueImage,
} from './venue-media.js'

const MB = 1024 * 1024
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]
const GIF = [...Buffer.from('GIF89a'), 0, 0]
const WEBP = [...Buffer.from('RIFF'), 1, 2, 3, 4, ...Buffer.from('WEBP')]

test('a blob inside a venue folder is recognized, with its venue and folder', () => {
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/12/profile/photo.jpg'), { venueId: 12, folder: 'profile' })
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/12/cover/2026-01-01T00-00-00-000Z/old.jpg'), { venueId: 12, folder: 'cover' })
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/7/gallery/'), { venueId: 7, folder: 'gallery' })
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/7/logo/l.png'), { venueId: 7, folder: 'logo' })
})

test('upper case, leading slashes, repeated slashes and backslashes do not hide a venue path', () => {
  for (const name of ['/platformpics/venue/5/cover/a.jpg', 'Platformpics/Venue/5/Cover/a.jpg', 'platformpics//venue//5//cover/a.jpg', 'platformpics\\venue\\5\\cover\\a.jpg']) {
    assert.deepEqual(getVenueMediaTarget(name), { venueId: 5, folder: 'cover' }, name)
  }
})

test('a path directly under the venue, or a folder that is not a media folder, still belongs to the venue', () => {
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/5/readme.txt'), { venueId: 5, folder: null })
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/5/other/readme.txt'), { venueId: 5, folder: null })
  assert.deepEqual(getVenueMediaTarget('platformpics/venue/5'), { venueId: 5, folder: null })
})

test('the same files reached through the platformpics container are recognized too', () => {
  assert.deepEqual(getVenueMediaTarget('venue/9/profile/a.jpg', 'platformpics'), { venueId: 9, folder: 'profile' })
  assert.equal(getVenueMediaTarget('venue/9/profile/a.jpg', 'tagpictures'), null)
})

test('paths that are not a venue folder are left alone', () => {
  for (const name of ['', undefined, null, 'platformpics/artist/5/profile/a.jpg', 'platformpics/user/5/profile/a.jpg', 'platformpics/venue/abc/profile/a.jpg', 'platformpics/venue/12abc/profile/a.jpg', 'platformpics/venues/5/profile/a.jpg', 'platformpics/venue/0/profile/a.jpg', 'platformpics/', 'other/platformpics/venue/5/a.jpg', 'platformpics/artist/3/gallery/venue/5/a.jpg']) {
    assert.equal(getVenueMediaTarget(name), null, String(name))
  }
})

test('the blob name is taken from a full blob URL, decoded, without the query', () => {
  assert.equal(blobNameFromUrl('https://acct.blob.core.windows.net/tagpictures/platformpics/venue/5/cover/a%20b.jpg?sv=1'), 'platformpics/venue/5/cover/a b.jpg')
  assert.equal(blobNameFromUrl('https://acct.blob.core.windows.net/other/platformpics/venue/5/a.jpg'), '')
  assert.equal(blobNameFromUrl(undefined), '')
  assert.equal(blobNameFromUrl('https://acct.blob.core.windows.net/tagpictures/a%zz.jpg'), 'a%zz.jpg')
})

test('file extensions are read from the last dot, in lower case', () => {
  assert.equal(getFileExtension('Photo.JPG'), 'jpg')
  assert.equal(getFileExtension('a.b.PNG'), 'png')
  assert.equal(getFileExtension('C:\\pics\\a.webp'), 'webp')
  assert.equal(getFileExtension('noextension'), '')
  assert.equal(getFileExtension('.hidden'), '')
  assert.equal(getFileExtension(undefined), '')
})

test('only common web image types are allowed by name', () => {
  for (const name of ['a.jpg', 'a.JPEG', 'a.png', 'a.gif', 'a.webp']) assert.equal(isAllowedVenueImageName(name), true, name)
  for (const name of ['a.svg', 'a.html', 'a.exe', 'a.bmp', 'a.tiff', 'a.jpg.exe', 'a', '']) assert.equal(isAllowedVenueImageName(name), false, name)
})

test('logos are limited to 5 MB and other pictures to 10 MB', () => {
  assert.equal(VENUE_LOGO_MAX_BYTES, 5 * MB)
  assert.equal(VENUE_IMAGE_MAX_BYTES, 10 * MB)
  assert.equal(getVenueImageMaxBytes('logo'), 5 * MB)
  for (const folder of ['profile', 'cover', 'gallery', undefined]) assert.equal(getVenueImageMaxBytes(folder), 10 * MB)
})

test('a good image passes', () => {
  assert.equal(validateVenueImage({ name: 'a.jpg', type: 'image/jpeg', size: 2 * MB, folder: 'profile' }), null)
  assert.equal(validateVenueImage({ name: 'a.PNG', type: 'image/png', size: 100, folder: 'gallery' }), null)
  assert.equal(validateVenueImage({ name: 'a.jpg', type: 'image/jpg', size: 100, folder: 'cover' }), null)
  assert.equal(validateVenueImage({ name: 'a.webp', size: 100, folder: 'cover' }), null)
})

test('the size limit is checked, with the limit for the folder in the message', () => {
  assert.match(validateVenueImage({ name: 'big.jpg', type: 'image/jpeg', size: 10 * MB + 1, folder: 'cover' }), /too large \(10 MB\)\. Images can be up to 10 MB/)
  assert.equal(validateVenueImage({ name: 'ok.jpg', type: 'image/jpeg', size: 10 * MB, folder: 'cover' }), null)
  assert.match(validateVenueImage({ name: 'logo.png', type: 'image/png', size: 6 * MB, folder: 'logo' }), /Logos can be up to 5 MB/)
  assert.equal(validateVenueImage({ name: 'logo.png', type: 'image/png', size: 5 * MB, folder: 'logo' }), null)
})

test('an unsupported or mismatched file is rejected with a clear message', () => {
  assert.match(validateVenueImage({ name: 'a.svg', type: 'image/svg+xml', size: 100 }), /not a supported image type/)
  assert.match(validateVenueImage({ name: 'a.exe', type: 'application/octet-stream', size: 100 }), /JPG, PNG, GIF or WebP/)
  assert.match(validateVenueImage({ name: 'a.jpg', type: 'text/html', size: 100 }), /does not look like a JPG/)
  assert.match(validateVenueImage({ name: 'a.png', type: 'image/jpeg', size: 100 }), /does not look like a PNG/)
  assert.match(validateVenueImage({ name: 'a', type: 'image/png', size: 100 }), /not a supported image type/)
  assert.match(validateVenueImage({ name: 'a.jpg', type: 'image/jpeg', size: 0 }), /empty/)
  assert.match(validateVenueImage({ name: 'a.jpg', type: 'image/jpeg', size: Number.NaN }), /empty/)
  assert.match(validateVenueImage({}), /not a supported image type/)
})

test('image types are told apart by their first bytes', () => {
  assert.equal(sniffImageType(JPEG), 'image/jpeg')
  assert.equal(sniffImageType(PNG), 'image/png')
  assert.equal(sniffImageType(GIF), 'image/gif')
  assert.equal(sniffImageType(WEBP), 'image/webp')
  assert.equal(sniffImageType([...Buffer.from('<html><script>')]), '')
  assert.equal(sniffImageType([...Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')]), '')
  assert.equal(sniffImageType([0xff, 0xd8]), '')
  assert.equal(sniffImageType([]), '')
  assert.equal(sniffImageType(undefined), '')
})

test('the first bytes must match the file name, so a renamed file is caught', () => {
  assert.equal(validateVenueImage({ name: 'a.jpg', type: 'image/jpeg', size: 100, header: JPEG }), null)
  assert.equal(validateVenueImage({ name: 'a.png', type: 'image/png', size: 100, header: PNG }), null)
  assert.match(validateVenueImage({ name: 'a.jpg', type: 'image/jpeg', size: 100, header: [...Buffer.from('<html>')] }), /not a valid JPG image/)
  assert.match(validateVenueImage({ name: 'a.png', type: 'image/png', size: 100, header: JPEG }), /not a valid PNG image/)
  assert.match(validateVenueImage({ name: 'a.gif', size: 100, header: [] }), /not a valid GIF image/)
})

const reqWithCookie = () => ({ cookies: { 'next-auth.session-token': 'tok123' } })
const answer = (data, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => data })

test('media that is not in a venue folder needs no venue decision', async () => {
  let called = false
  const result = await authorizeVenueMediaChange({ req: {}, blobNames: ['platformpics/artist/5/profile/a.jpg'], fetchApi: async () => { called = true; return answer({}) } })
  assert.deepEqual(result, { ok: true, venueIds: [] })
  assert.equal(called, false)
})

test('an owner or staff member may change venue media', async () => {
  const calls = []
  const fetchApi = async (path) => { calls.push(path); return answer({ canManage: true }) }

  const result = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/venue/12/profile/a.jpg', 'platformpics/venue/12/profile/old/a.jpg'], fetchApi })

  assert.deepEqual(result, { ok: true, venueIds: [12] })
  assert.deepEqual(calls, ['/venue/12/access'])
})

test('someone who cannot manage the venue gets 403, and so does anyone when the API cannot say', async () => {
  const stranger = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/venue/12/cover/a.jpg'], fetchApi: async () => answer({ canManage: false }) })
  assert.equal(stranger.ok, false)
  assert.equal(stranger.status, 403)
  assert.match(stranger.error, /owners and staff/)

  for (const fetchApi of [async () => answer({}, false), async () => { throw new Error('down') }, async () => answer({ canManage: 'yes' })]) {
    const result = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/venue/12/cover/a.jpg'], fetchApi })
    assert.equal(result.status, 403)
  }
})

test('a signed-out caller gets 401 and the API is not asked', async () => {
  let called = false
  const result = await authorizeVenueMediaChange({ req: { cookies: {} }, blobNames: ['platformpics/venue/12/cover/a.jpg'], fetchApi: async () => { called = true; return answer({ canManage: true }) } })
  assert.equal(result.status, 401)
  assert.equal(called, false)
})

test('a move between venues needs permission on both, and a move into a venue from elsewhere needs it on the venue', async () => {
  const fetchApi = async (path) => answer({ canManage: path === '/venue/1/access' })

  const between = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/venue/1/gallery/a.jpg', 'platformpics/venue/2/gallery/a.jpg'], fetchApi })
  assert.equal(between.status, 403)

  const into = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/artist/9/gallery/a.jpg', 'platformpics/venue/2/gallery/a.jpg'], fetchApi })
  assert.equal(into.status, 403)

  const ok = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/artist/9/gallery/a.jpg', 'platformpics/venue/1/gallery/a.jpg'], fetchApi })
  assert.deepEqual(ok, { ok: true, venueIds: [1] })
})

test('the container is taken into account when finding the venue', async () => {
  const result = await authorizeVenueMediaChange({ req: reqWithCookie(), container: 'platformpics', blobNames: ['venue/4/cover/a.jpg'], fetchApi: async () => answer({ canManage: true }) })
  assert.deepEqual(result, { ok: true, venueIds: [4] })
})

test('paths with dot segments, control characters or backslash tricks are unsafe', () => {
  for (const bad of [
    'platformpics/./venue/12/cover/a.jpg',
    'platformpics/venue/./12/cover/a.jpg',
    'platformpics/venue/5/../12/cover/a.jpg',
    'platformpics\\venue\\5\\..\\12\\cover\\a.jpg',
    '../platformpics/venue/12/cover/',
    'platformpics/venue/12/cover/..',
    'platformpics/venue/12/ .. /a.jpg',
    'platformpics/venue/12/cover/a\u0000.jpg',
    'platformpics/venue/12/cover/a\n.jpg',
  ]) {
    assert.equal(hasUnsafeBlobPath(bad), true, bad)
  }

  for (const fine of ['platformpics/venue/12/cover/a.jpg', 'platformpics/venue/12/cover/my.photo..v2.jpg', 'platformpics/venue/12/gallery/', 'platformpics/artist/9/.hidden/a.jpg', '', null, undefined]) {
    assert.equal(hasUnsafeBlobPath(fine), false, String(fine))
  }
})

test('a path that could end up in another venue folder is refused before anyone is asked about it', async () => {
  let called = false
  const fetchApi = async () => { called = true; return answer({ canManage: true }) }

  for (const sneaky of [
    ['platformpics/./venue/12/cover/'],
    ['platformpics/venue/5/../12/cover/a.jpg'],
    ['platformpics/venue/5/cover/a.jpg', 'platformpics/venue/5/../12/cover/a.jpg'],
    ['platformpics/artist/9/../../venue/12/cover/a.jpg'],
  ]) {
    const result = await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: sneaky, fetchApi })
    assert.deepEqual(result, { ok: false, status: 400, error: 'Invalid file path.' }, sneaky.join(' | '))
  }

  assert.equal(called, false)
})

test('a plain path is still decided by the venue API', async () => {
  const fetchApi = async (path) => answer({ canManage: path === '/venue/5/access' })

  assert.deepEqual(await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/venue/5/cover/my.photo..v2.jpg'], fetchApi }), { ok: true, venueIds: [5] })
  assert.equal((await authorizeVenueMediaChange({ req: reqWithCookie(), blobNames: ['platformpics/venue/12/cover/a.jpg'], fetchApi })).status, 403)
})
