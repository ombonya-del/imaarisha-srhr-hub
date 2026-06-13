// ── Hebu Fika — "Show up!" Access to SRHR services, rated by young people.
// Facilities below are real, publicly-known service points used as starting
// seeds. Ratings are NEVER fabricated — they start empty and are built only
// from young people's submitted experiences. Always verify details locally.

export const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu',
  'Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru',
  'Migori','Mombasa','Murang’a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua',
  'Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
]

// service tags shown as chips
export const FACILITY_TYPES = {
  public: { label: 'Public', color: '#3FE0A0' },
  ngo:    { label: 'NGO / Youth', color: '#2FD0C4' },
  private:{ label: 'Private', color: '#F2C75C' },
}

// Fallback seed — real public/NGO SRHR providers. verified = a known, established
// service point. rating fields intentionally absent (built from reviews).
export const FACILITIES_FALLBACK = [
  { id:'f-nbo-1', name:'Kenyatta National Hospital — Youth Centre', county:'Nairobi', area:'Upper Hill', kind:'public',
    services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-nbo-2', name:'Marie Stopes Kenya — Nairobi', county:'Nairobi', area:'Multiple branches', kind:'ngo',
    services:['Family planning','Safe care','HIV testing','GBV support'], verified:true },
  { id:'f-nbo-3', name:'NAYA Kenya (youth SRHR)', county:'Nairobi', area:'Nairobi', kind:'ngo',
    services:['Information','Referrals','Peer support'], verified:true },
  { id:'f-msa-1', name:'Coast General Teaching & Referral Hospital', county:'Mombasa', area:'Mombasa Island', kind:'public',
    services:['Family planning','HIV testing','Antenatal care','GBV care'], verified:true },
  { id:'f-ksm-1', name:'Jaramogi Oginga Odinga Teaching & Referral Hospital', county:'Kisumu', area:'Kisumu Central', kind:'public',
    services:['Family planning','HIV testing','Counselling','GBV care'], verified:true },
  { id:'f-nku-1', name:'Nakuru Level 5 Hospital (PGH)', county:'Nakuru', area:'Nakuru Town', kind:'public',
    services:['Family planning','HIV testing','Antenatal care'], verified:true },
  { id:'f-ug-1',  name:'Moi Teaching & Referral Hospital — Rafiki Centre', county:'Uasin Gishu', area:'Eldoret', kind:'public',
    services:['Youth-friendly services','HIV testing','Family planning','Counselling'], verified:true },
]
