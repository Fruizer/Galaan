export type RSVPStatus = 'going' | 'maybe' | 'not-going'

export type VibeTag =
  | 'Food Trip'
  | 'Roadtrip'
  | 'Tambay'
  | 'Beach Day'
  | 'Coffee Run'
  | 'Birthday'
  | 'Movie Night'
  | 'Karaoke'
  | 'Museum / Arts'
  | 'Photowalk'
  | 'Date'
  | 'Study Session'
  | 'Brunch'
  | 'Hangout'

export interface Member {
  id: string
  name: string
  initials: string
  color: string
  avatarUrl?: string
  isYou?: boolean
  role?: 'organizer' | 'member'
}

export interface RSVP {
  memberId: string
  status: RSVPStatus
  signature?: string
}

export interface Expense {
  id: string
  label: string
  category: 'stay' | 'food' | 'transpo' | 'other'
  amount: number
  paidMemberIds: string[]
}

export interface AlbumLink {
  id: string
  label: string
  url: string
}

export interface GalaRecap {
  note: string
  albums: AlbumLink[]
}

export interface Gala {
  id: string
  title: string
  vibe: VibeTag
  date: string
  callTime: string
  gcTime: string
  venue: string
  address: string
  notes: string
  quorum: number
  createdBy: string
  rsvps: RSVP[]
  expenses: Expense[]
  recap?: GalaRecap
}

export interface Circle {
  id: string
  name: string
  subtitle: string
  color: string
  role?: 'organizer' | 'member'
  members: Member[]
  galas: Gala[]
}

export interface NewGalaInput {
  title: string
  vibe: VibeTag
  date: string
  callTime: string
  gcTime: string
  venue: string
  address: string
  notes: string
  quorum: number
  expenses: Omit<Expense, 'id' | 'paidMemberIds'>[]
}
