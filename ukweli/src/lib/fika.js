// ── Hebu Fika — "Show up!" Access to SRHR services, rated by young people.
// Facilities below are real, publicly-known service points (county referral
// hospitals + established NGO/youth providers) used as starting seeds. Ratings
// are NEVER fabricated — they start empty and are built only from young people's
// submitted experiences. Always verify details locally before you go.

export const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu',
  'Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru',
  'Migori','Mombasa','Murang’a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua',
  'Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
]

export const FACILITY_TYPES = {
  public: { label: 'Public', color: '#3FE0A0' },
  ngo:    { label: 'NGO / Youth', color: '#2FD0C4' },
  private:{ label: 'Private', color: '#F2C75C' },
}

// Uber-style "what was good" attributes — what young people praise a facility for.
export const ATTRIBUTES = [
  ['private',       '🔒 Private & confidential'],
  ['friendly',      '😊 Friendly staff'],
  ['affordable',    '💰 Affordable'],
  ['fast',          '⏱️ Short wait'],
  ['nonjudgmental', '🤝 Non-judgmental'],
  ['stocked',       '📦 Well stocked'],
]
export const ATTR_LABEL = Object.fromEntries(ATTRIBUTES)

// Fallback seed — used only if the live fika_facilities table is unreachable.
export const FACILITIES_FALLBACK = [
  { id:'f-nbo-1', name:'Kenyatta National Hospital — Youth Centre', county:'Nairobi', area:'Upper Hill', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-nbo-2', name:'Marie Stopes Kenya — Nairobi', county:'Nairobi', area:'Multiple branches', kind:'ngo', services:['Family planning','Safe care','HIV testing','GBV support'], verified:true },
  { id:'f-nbo-3', name:'NAYA Kenya (youth SRHR)', county:'Nairobi', area:'Nairobi', kind:'ngo', services:['Information','Referrals','Peer support'], verified:true },
  { id:'f-msa-1', name:'Coast General Teaching & Referral Hospital', county:'Mombasa', area:'Mombasa Island', kind:'public', services:['Family planning','HIV testing','Antenatal care','GBV care'], verified:true },
  { id:'f-ksm-1', name:'Jaramogi Oginga Odinga Teaching & Referral Hospital', county:'Kisumu', area:'Kisumu Central', kind:'public', services:['Family planning','HIV testing','Counselling','GBV care'], verified:true },
  { id:'f-nku-1', name:'Nakuru Level 5 Hospital (PGH)', county:'Nakuru', area:'Nakuru Town', kind:'public', services:['Family planning','HIV testing','Antenatal care'], verified:true },
  { id:'f-ug-1',  name:'Moi Teaching & Referral Hospital — Rafiki Centre', county:'Uasin Gishu', area:'Eldoret', kind:'public', services:['Youth-friendly services','HIV testing','Family planning','Counselling'], verified:true },
  { id:'f-baringo-1', name:'Kabarnet County Referral Hospital', county:'Baringo', area:'Kabarnet', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-bomet-1', name:'Longisa County Referral Hospital', county:'Bomet', area:'Longisa', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-bungoma-1', name:'Bungoma County Referral Hospital', county:'Bungoma', area:'Bungoma', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-busia-1', name:'Busia County Referral Hospital', county:'Busia', area:'Busia', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-elgeyo-1', name:'Iten County Referral Hospital', county:'Elgeyo-Marakwet', area:'Iten', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-embu-1', name:'Embu Level 5 Hospital', county:'Embu', area:'Embu', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-garissa-1', name:'Garissa County Referral Hospital', county:'Garissa', area:'Garissa', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-homabay-1', name:'Homa Bay County Teaching & Referral Hospital', county:'Homa Bay', area:'Homa Bay', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-isiolo-1', name:'Isiolo County Referral Hospital', county:'Isiolo', area:'Isiolo', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kajiado-1', name:'Kajiado County Referral Hospital', county:'Kajiado', area:'Kajiado', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kakamega-1', name:'Kakamega County General Teaching & Referral Hospital', county:'Kakamega', area:'Kakamega', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kericho-1', name:'Kericho County Referral Hospital', county:'Kericho', area:'Kericho', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kiambu-1', name:'Thika Level 5 Hospital', county:'Kiambu', area:'Thika', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kilifi-1', name:'Kilifi County Referral Hospital', county:'Kilifi', area:'Kilifi', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kirinyaga-1', name:'Kerugoya County Referral Hospital', county:'Kirinyaga', area:'Kerugoya', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kisii-1', name:'Kisii Teaching & Referral Hospital', county:'Kisii', area:'Kisii', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kitui-1', name:'Kitui County Referral Hospital', county:'Kitui', area:'Kitui', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-kwale-1', name:'Kwale County Referral Hospital', county:'Kwale', area:'Kwale', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-laikipia-1', name:'Nanyuki Teaching & Referral Hospital', county:'Laikipia', area:'Nanyuki', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-lamu-1', name:'King Fahad County Referral Hospital', county:'Lamu', area:'Lamu', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-machakos-1', name:'Machakos Level 5 Hospital', county:'Machakos', area:'Machakos', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-makueni-1', name:'Makueni County Referral Hospital', county:'Makueni', area:'Wote', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-mandera-1', name:'Mandera County Referral Hospital', county:'Mandera', area:'Mandera', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-marsabit-1', name:'Marsabit County Referral Hospital', county:'Marsabit', area:'Marsabit', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-meru-1', name:'Meru Teaching & Referral Hospital', county:'Meru', area:'Meru', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-migori-1', name:'Migori County Referral Hospital', county:'Migori', area:'Migori', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-muranga-1', name:'Murang’a County Referral Hospital', county:'Murang’a', area:'Murang’a', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-nandi-1', name:'Kapsabet County Referral Hospital', county:'Nandi', area:'Kapsabet', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-narok-1', name:'Narok County Referral Hospital', county:'Narok', area:'Narok', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-nyamira-1', name:'Nyamira County Referral Hospital', county:'Nyamira', area:'Nyamira', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-nyandarua-1', name:'J.M. Kariuki Memorial County Referral Hospital', county:'Nyandarua', area:'Ol Kalou', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-nyeri-1', name:'Nyeri County Referral Hospital', county:'Nyeri', area:'Nyeri', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-samburu-1', name:'Maralal County Referral Hospital', county:'Samburu', area:'Maralal', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-siaya-1', name:'Siaya County Referral Hospital', county:'Siaya', area:'Siaya', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-taita-1', name:'Moi County Referral Hospital, Voi', county:'Taita-Taveta', area:'Voi', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-tanariver-1', name:'Hola County Referral Hospital', county:'Tana River', area:'Hola', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-tharaka-1', name:'Chuka County Referral Hospital', county:'Tharaka-Nithi', area:'Chuka', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-transnzoia-1', name:'Kitale County Referral Hospital', county:'Trans Nzoia', area:'Kitale', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-turkana-1', name:'Lodwar County Referral Hospital', county:'Turkana', area:'Lodwar', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-vihiga-1', name:'Vihiga County Referral Hospital', county:'Vihiga', area:'Vihiga', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-wajir-1', name:'Wajir County Referral Hospital', county:'Wajir', area:'Wajir', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
  { id:'f-westpokot-1', name:'Kapenguria County Referral Hospital', county:'West Pokot', area:'Kapenguria', kind:'public', services:['Family planning','HIV testing','Counselling','Antenatal care'], verified:true },
]
