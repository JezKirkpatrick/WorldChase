export interface EventTheme {
  id: string
  label: string
  description: string
  regionFocus: string
  avoidRegions: string
}

export const EVENT_THEMES: EventTheme[] = [
  {
    id: 'global',
    label: 'Global Mix',
    description: 'True global variety — all continents represented equally',
    regionFocus: 'All continents. Deliberately spread across Asia, Africa, Americas, Europe, Oceania, Middle East',
    avoidRegions: 'Do not overweight Western Europe or North America. Maximum 3 of 20 locations from France, UK, USA, Germany combined',
  },
  {
    id: 'asia_pacific',
    label: 'Asia & Pacific',
    description: 'East Asia, Southeast Asia, South Asia, Oceania, Pacific Islands',
    regionFocus: 'East Asia (China, Japan, Korea, Mongolia), Southeast Asia (Thailand, Vietnam, Indonesia, Philippines, Myanmar), South Asia (India, Nepal, Sri Lanka, Bangladesh), Oceania (Australia, New Zealand, Papua New Guinea), Pacific Islands (Fiji, Samoa, Tonga, Vanuatu)',
    avoidRegions: 'Avoid Europe, Americas, Africa except for extreme difficulty',
  },
  {
    id: 'americas',
    label: 'The Americas',
    description: 'North, Central, South America and the Caribbean',
    regionFocus: 'South America (Brazil, Peru, Argentina, Bolivia, Colombia, Chile), Central America (Guatemala, Mexico, Costa Rica, Panama), Caribbean (Cuba, Jamaica, Trinidad, Barbados, Haiti), North America beyond USA/Canada clichés',
    avoidRegions: 'Avoid New York, Hollywood, Niagara Falls as easy picks — use other American landmarks',
  },
  {
    id: 'africa_middle',
    label: 'Africa & Middle East',
    description: 'Sub-Saharan Africa, North Africa, Arabian Peninsula, Levant',
    regionFocus: 'Sub-Saharan Africa (Kenya, Ethiopia, Tanzania, South Africa, Zimbabwe, Nigeria, Ghana, Senegal), North Africa (Morocco, Egypt, Tunisia, Libya), Arabian Peninsula (UAE, Saudi Arabia, Oman, Yemen), Levant (Jordan, Lebanon, Israel, Syria)',
    avoidRegions: 'Avoid Europe and Asia entirely for normal difficulties',
  },
  {
    id: 'europe_hidden',
    label: 'Hidden Europe',
    description: 'Lesser-known Europe — Eastern, Balkan, Scandinavian secrets',
    regionFocus: 'Eastern Europe (Poland, Czech Republic, Hungary, Ukraine, Romania, Bulgaria), Balkans (Serbia, Croatia, Albania, Bosnia, North Macedonia, Kosovo), Scandinavia (Norway, Sweden, Iceland, Greenland), Baltic States (Estonia, Latvia, Lithuania), Caucasus (Georgia, Armenia, Azerbaijan)',
    avoidRegions: 'Avoid Paris, London, Rome, Barcelona for easy rounds — use surprising European gems instead',
  },
  {
    id: 'natural_wonders',
    label: 'Natural Wonders',
    description: 'Geological marvels, extreme landscapes, natural phenomena worldwide',
    regionFocus: 'Volcanoes, glaciers, caves, canyons, salt flats, geysers, coral reefs, ancient forests, unusual rock formations, extreme weather locations — from every continent',
    avoidRegions: 'Avoid man-made landmarks except where geology is the attraction (e.g. Cappadocia, Stone Forest)',
  },
  {
    id: 'ancient_worlds',
    label: 'Ancient Civilizations',
    description: 'Archaeological sites, ruins, and ancient wonders across history',
    regionFocus: 'Ancient ruins and archaeological sites worldwide: Mesopotamia, Ancient Egypt, Greco-Roman, Mayan/Aztec/Inca, Indus Valley, Ancient China, Khmer Empire, Norse sites, African kingdoms, Native American sites',
    avoidRegions: 'Avoid obvious picks like Pyramids of Giza or Machu Picchu for easy rounds — go deeper',
  },
  {
    id: 'islands',
    label: 'Island World',
    description: 'Islands and island nations from every ocean',
    regionFocus: 'Pacific Islands, Caribbean Islands, Mediterranean Islands, Indian Ocean Islands (Maldives, Seychelles, Réunion, Mauritius), Atlantic Islands (Azores, Canaries, Cape Verde, St Helena, Tristan da Cunha), Arctic/Antarctic islands',
    avoidRegions: 'Avoid large mainlands entirely',
  },
  {
    id: 'urban_jungle',
    label: 'Urban Jungle',
    description: 'Cities, megacities, and unique urban landmarks worldwide',
    regionFocus: 'Megacities and distinctive urban spaces: Asian megacities (Tokyo, Seoul, Bangkok, Mumbai, Shanghai, Dhaka), African cities (Lagos, Nairobi, Kinshasa, Addis Ababa), South American cities (São Paulo, Medellín, Havana, Buenos Aires), Middle Eastern cities (Dubai, Doha, Jerusalem, Tehran)',
    avoidRegions: 'Avoid London, Paris, New York as easy picks — use unexpected urban gems',
  },
  {
    id: 'extreme_remote',
    label: 'Extreme & Remote',
    description: 'The most isolated, inhospitable, and forgotten places on Earth',
    regionFocus: 'Antarctica, Arctic outposts, Sahara desert towns, Siberian settlements, Himalayan villages, deep jungle communities, mid-ocean islands, underground cities, ghost towns on every continent',
    avoidRegions: 'All famous tourist destinations — the more obscure the better at every difficulty level',
  },
]

// 8 narrative styles — rotate by (roundNumber - 1) % 8
export const NARRATIVE_STYLES = [
  'Spy thriller / intelligence briefing — terse, classified, mission-critical tone',
  'Ancient prophecy / sacred scroll — mystical, archaic, foreboding language',
  'Nature documentary narration — awe-inspiring, David Attenborough-esque, wonder-filled',
  'Shipwrecked explorer\'s journal — desperate, evocative, first-person discovery',
  'Encrypted military field report — coordinates, callsigns, operational language',
  'Lyrical lament — a poet mourning or celebrating a forgotten or magnificent place',
  'Ghost\'s memory — a spirit describing their homeland from beyond, ethereal and haunting',
  'Time traveller\'s field notes — observational, comparing eras, scientific yet awed',
]
