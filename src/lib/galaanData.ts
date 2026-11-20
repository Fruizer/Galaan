import type { SupabaseClient } from '@supabase/supabase-js'
import type { Circle, Expense, Gala, GalaRecap, NewGalaInput, RSVPStatus } from '../types'

type Row = Record<string, unknown>

const avatarColors = ['#cf785a', '#d9a54a', '#6c8f8b', '#8c705e', '#ad6f79', '#7786a4', '#bc8053', '#7d9270']

function colorFor(value: string) {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return avatarColors[hash % avatarColors.length]
}

function initialsFor(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'Y'
}

function timeFromDatabase(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  const [hour, minute] = value.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

function timeToDatabase(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${match[2]}:00`
}

function errorOrThrow(error: { message?: string } | null) {
  if (error) throw new Error(error.message || 'Supabase request failed')
}

export async function loadCircles(client: SupabaseClient, userId: string): Promise<Circle[]> {
  const membershipResult = await client.from('circle_memberships').select('circle_id, user_id, role').eq('user_id', userId)
  errorOrThrow(membershipResult.error)
  const memberships = (membershipResult.data ?? []) as unknown as Row[]
  const circleIds = memberships.map((row) => String(row.circle_id))
  if (!circleIds.length) return []

  const [circleResult, memberResult, galaResult] = await Promise.all([
    client.from('circles').select('id, name, created_by').in('id', circleIds),
    client.from('circle_memberships').select('circle_id, user_id, role').in('circle_id', circleIds),
    client.from('galas').select('*').in('circle_id', circleIds).order('event_date', { ascending: true }),
  ])
  errorOrThrow(circleResult.error)
  errorOrThrow(memberResult.error)
  errorOrThrow(galaResult.error)

  const circles = (circleResult.data ?? []) as unknown as Row[]
  const allMemberships = (memberResult.data ?? []) as unknown as Row[]
  const memberIds = [...new Set(allMemberships.map((row) => String(row.user_id)))]
  const profileResult = memberIds.length
    ? await client.from('profiles').select('id, display_name, avatar_url').in('id', memberIds)
    : { data: [], error: null }
  errorOrThrow(profileResult.error)
  const profiles = (profileResult.data ?? []) as unknown as Row[]
  const avatarPaths = [...new Set(profiles.map((row) => row.avatar_url).filter((value): value is string => typeof value === 'string' && /^[0-9a-f-]{36}\/avatar\.webp$/.test(value)))]
  const avatarResult = avatarPaths.length
    ? await client.storage.from('profile-avatars').createSignedUrls(avatarPaths, 3600)
    : { data: [], error: null }
  errorOrThrow(avatarResult.error)
  const avatarByPath = new Map((avatarResult.data ?? []).map((avatar) => [avatar.path, avatar.signedUrl]))
  const galas = (galaResult.data ?? []) as unknown as Row[]
  const galaIds = galas.map((row) => String(row.id))

  const [rsvpResult, expenseResult, albumResult] = galaIds.length ? await Promise.all([
    client.from('rsvps').select('*').in('gala_id', galaIds),
    client.from('expenses').select('*').in('gala_id', galaIds),
    client.from('gala_albums').select('*').in('gala_id', galaIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
  errorOrThrow(rsvpResult.error)
  errorOrThrow(expenseResult.error)
  errorOrThrow(albumResult.error)

  const rsvps = (rsvpResult.data ?? []) as unknown as Row[]
  const expenses = (expenseResult.data ?? []) as unknown as Row[]
  const albums = (albumResult.data ?? []) as unknown as Row[]
  const expenseIds = expenses.map((row) => String(row.id))
  const paymentResult = expenseIds.length
    ? await client.from('expense_payments').select('expense_id, user_id, is_paid').in('expense_id', expenseIds)
    : { data: [], error: null }
  errorOrThrow(paymentResult.error)
  const payments = (paymentResult.data ?? []) as unknown as Row[]
  const profileById = new Map(profiles.map((row) => [String(row.id), row]))
  const membersByCircle = new Map<string, Row[]>()
  for (const membership of allMemberships) {
    const circleId = String(membership.circle_id)
    membersByCircle.set(circleId, [...(membersByCircle.get(circleId) ?? []), membership])
  }

  return circles.map((circleRow) => {
    const circleId = String(circleRow.id)
    const members = (membersByCircle.get(circleId) ?? []).map((membership) => {
      const userIdValue = String(membership.user_id)
      const profile = profileById.get(userIdValue)
      const name = String(profile?.display_name ?? 'Barkada member')
      return {
        id: userIdValue,
        name,
        initials: initialsFor(name),
        color: colorFor(userIdValue),
        ...(typeof profile?.avatar_url === 'string' && avatarByPath.get(profile.avatar_url) ? { avatarUrl: avatarByPath.get(profile.avatar_url) } : {}),
        isYou: userIdValue === userId,
        role: membership.role === 'organizer' ? 'organizer' : 'member',
      }
    })
    const circleGalas = galas.filter((gala) => String(gala.circle_id) === circleId).map((gala): Gala => {
      const galaId = String(gala.id)
      const galaRsvps = rsvps.filter((rsvp) => String(rsvp.gala_id) === galaId)
      const galaExpenses = expenses.filter((expense) => String(expense.gala_id) === galaId).map((expense): Expense => ({
        id: String(expense.id),
        label: String(expense.label),
        category: expense.category as Expense['category'],
        amount: Number(expense.amount),
        paidMemberIds: payments.filter((payment) => String(payment.expense_id) === String(expense.id) && payment.is_paid === true).map((payment) => String(payment.user_id)),
      }))
      const recapAlbums = albums.filter((album) => String(album.gala_id) === galaId).map((album) => ({
        id: String(album.id), label: String(album.label), url: String(album.url),
      }))
      const recapNote = String(gala.recap_note ?? '')
      const recap: GalaRecap | undefined = recapNote || recapAlbums.length ? { note: recapNote, albums: recapAlbums } : undefined
      return {
        id: galaId,
        title: String(gala.title),
        vibe: gala.vibe as Gala['vibe'],
        date: String(gala.event_date),
        callTime: timeFromDatabase(gala.call_time),
        gcTime: timeFromDatabase(gala.gc_time),
        venue: String(gala.venue ?? ''),
        address: String(gala.address ?? ''),
        notes: String(gala.notes ?? ''),
        quorum: Number(gala.quorum),
        createdBy: String(gala.created_by),
        rsvps: galaRsvps.map((rsvp) => ({
          memberId: String(rsvp.user_id),
          status: rsvp.status as RSVPStatus,
          ...(typeof rsvp.signature_payload === 'string' ? { signature: rsvp.signature_payload } : {}),
        })),
        expenses: galaExpenses,
        ...(recap ? { recap } : {}),
      }
    })
    const myMembership = memberships.find((membership) => String(membership.circle_id) === circleId)
    return {
      id: circleId,
      name: String(circleRow.name),
      subtitle: `${members.length} ${members.length === 1 ? 'friend' : 'friends'}`,
      color: colorFor(circleId),
      role: myMembership?.role === 'organizer' ? 'organizer' : 'member',
      members,
      galas: circleGalas,
    } as Circle
  })
}

export async function createCircle(client: SupabaseClient, name: string) {
  const { data, error } = await client.rpc('create_circle', { p_name: name.trim() })
  errorOrThrow(error)
  return String(data)
}

export async function createCircleInvite(client: SupabaseClient, circleId: string) {
  const random = crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await client.rpc('create_circle_invite', {
    p_circle_id: circleId,
    p_token: token,
    p_expires_at: expiresAt,
    p_max_uses: 100,
  })
  errorOrThrow(error)
  return `${window.location.origin}/?invite=${token}`
}

export async function redeemCircleInvite(client: SupabaseClient, token: string) {
  const { data, error } = await client.rpc('redeem_circle_invite', { p_token: token })
  errorOrThrow(error)
  return String(data)
}

export async function leaveCircle(client: SupabaseClient, circleId: string) {
  const { error } = await client.rpc('leave_circle', { p_circle_id: circleId })
  errorOrThrow(error)
}

export async function updateProfile(client: SupabaseClient, userId: string, displayName: string) {
  const { error } = await client.from('profiles').update({ display_name: displayName.trim() }).eq('id', userId)
  errorOrThrow(error)
}

export async function updateProfileAvatar(client: SupabaseClient, userId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file to use as your profile picture.')
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose an image smaller than 8 MB.')
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = sourceUrl
    await image.decode()
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This image could not be processed. Try another one.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    let blob: Blob | null = null
    for (const quality of [0.84, 0.72, 0.6, 0.48]) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
      if (blob && blob.size <= 480 * 1024) break
    }
    if (!blob || blob.size > 480 * 1024) throw new Error('This image is too detailed to save. Choose another photo.')
    const path = `${userId}/avatar.webp`
    const { error: uploadError } = await client.storage.from('profile-avatars').upload(path, blob, {
      cacheControl: '3600', contentType: 'image/webp', upsert: true,
    })
    errorOrThrow(uploadError)
    const { error: profileError } = await client.from('profiles').update({ avatar_url: path }).eq('id', userId)
    errorOrThrow(profileError)
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

function galaValues(circleId: string, userId: string, input: NewGalaInput, includeCreator = true) {
  return {
    circle_id: circleId,
    title: input.title.trim(),
    vibe: input.vibe,
    event_date: input.date,
    call_time: timeToDatabase(input.callTime),
    gc_time: timeToDatabase(input.gcTime),
    venue: input.venue.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    quorum: input.quorum,
    ...(includeCreator ? { created_by: userId } : {}),
  }
}

async function syncExpenses(client: SupabaseClient, galaId: string, userId: string, drafts: NewGalaInput['expenses'], current: Expense[] = []) {
  const remaining = [...current]
  const retainedIds: string[] = []
  for (const draft of drafts) {
    const matchIndex = remaining.findIndex((expense) => expense.label.toLowerCase() === draft.label.toLowerCase() && expense.category === draft.category)
    const match = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : undefined
    if (match) {
      const { error } = await client.from('expenses').update({ label: draft.label.trim(), category: draft.category, amount: draft.amount }).eq('id', match.id)
      errorOrThrow(error)
      retainedIds.push(match.id)
    } else {
      const { data, error } = await client.from('expenses').insert({ gala_id: galaId, created_by: userId, label: draft.label.trim(), category: draft.category, amount: draft.amount }).select('id').single()
      errorOrThrow(error)
      retainedIds.push(String((data as unknown as Row).id))
    }
  }
  for (const expense of remaining) {
    const { error } = await client.from('expenses').delete().eq('id', expense.id)
    errorOrThrow(error)
  }
  return retainedIds
}

export async function saveGala(client: SupabaseClient, circleId: string, userId: string, input: NewGalaInput, current?: Gala) {
  if (current) {
    const { error } = await client.from('galas').update(galaValues(circleId, userId, input, false)).eq('id', current.id)
    errorOrThrow(error)
    await syncExpenses(client, current.id, userId, input.expenses, current.expenses)
    return current.id
  }
  const { data, error } = await client.from('galas').insert(galaValues(circleId, userId, input)).select('id').single()
  errorOrThrow(error)
  const galaId = String((data as unknown as Row).id)
  await syncExpenses(client, galaId, userId, input.expenses)
  return galaId
}

export async function deleteGala(client: SupabaseClient, galaId: string) {
  const { error } = await client.from('galas').delete().eq('id', galaId)
  errorOrThrow(error)
}

export async function upsertRsvp(client: SupabaseClient, galaId: string, userId: string, status: RSVPStatus, signature?: string) {
  const { error } = await client.from('rsvps').upsert({
    gala_id: galaId, user_id: userId, status,
    signature_payload: status === 'going' ? signature ?? null : null,
  }, { onConflict: 'gala_id,user_id' })
  errorOrThrow(error)
}

export async function saveExpense(client: SupabaseClient, galaId: string, userId: string, expense: Omit<Expense, 'id' | 'paidMemberIds'>, expenseId?: string) {
  const values = { label: expense.label.trim(), category: expense.category, amount: expense.amount }
  const { error } = expenseId
    ? await client.from('expenses').update(values).eq('id', expenseId)
    : await client.from('expenses').insert({ ...values, gala_id: galaId, created_by: userId })
  errorOrThrow(error)
}

export async function deleteExpense(client: SupabaseClient, expenseId: string) {
  const { error } = await client.from('expenses').delete().eq('id', expenseId)
  errorOrThrow(error)
}

export async function setPayment(client: SupabaseClient, expenseId: string, userId: string, isPaid: boolean) {
  const { error } = await client.from('expense_payments').upsert({
    expense_id: expenseId, user_id: userId, is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null,
  }, { onConflict: 'expense_id,user_id' })
  errorOrThrow(error)
}

export async function saveRecap(client: SupabaseClient, galaId: string, userId: string, recap: GalaRecap) {
  const { error } = await client.from('galas').update({ recap_note: recap.note.trim() }).eq('id', galaId)
  errorOrThrow(error)
  const { error: deleteError } = await client.from('gala_albums').delete().eq('gala_id', galaId)
  errorOrThrow(deleteError)
  if (recap.albums.length) {
    const { error: insertError } = await client.from('gala_albums').insert(recap.albums.map((album) => ({
      gala_id: galaId, created_by: userId, label: album.label.trim(), url: album.url,
    })))
    errorOrThrow(insertError)
  }
}
