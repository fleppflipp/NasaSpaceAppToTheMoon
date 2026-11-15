import modisImage from '../assets/sensors/modis.jpg'
import viirsImage from '../assets/sensors/viirs.jpg'
import type { HotspotSensor } from '../services/hotspot'

/** English copy is kept here until localization is requested. */
export const HOTSPOT_COPY = {
  title: 'Hotspot details',
  point: 'Daily fire event',
  area: 'Merged fire area',
  close: 'Close hotspot details',
  backToCalendar: 'Back to calendar',
  eventFrp: 'Event FRP',
  maximumFrp: 'Largest event FRP',
  power: 'Fire radiative power',
  pointExplanation: 'Average of per-pass FRP totals.',
  areaExplanation: 'Highest event FRP in this area.',
  day: 'Event day',
  firstDay: 'First event day',
  lastDay: 'Last event day',
  centre: 'Event centre',
  latitude: 'Latitude',
  longitude: 'Longitude',
  radius: 'Bounding radius',
  count: 'Merged events',
  sensors: 'Detected by',
  unavailable: 'Not available',
  dates: 'Event days use local solar dates.',
  imageCredit: 'Image:',
} as const

export const HOTSPOT_SENSORS = {
  MODIS: {
    name: 'MODIS',
    fullName: 'Moderate Resolution Imaging Spectroradiometer',
    image: modisImage,
    alt: 'The MODIS instrument during assembly',
    credit: 'NASA',
    source: 'https://atmosphere-imager.gsfc.nasa.gov/links/modis-instrument',
  },
  VIIRS: {
    name: 'VIIRS',
    fullName: 'Visible Infrared Imaging Radiometer Suite',
    image: viirsImage,
    alt: 'The VIIRS instrument before integration with a satellite',
    credit: 'NOAA / NASA',
    source:
      'https://www.nesdis.noaa.gov/our-satellites/currently-flying/joint-polar-satellite-system/visible-infrared-imaging-radiometer-suite-viirs',
  },
} as const satisfies Record<
  HotspotSensor,
  {
    name: string
    fullName: string
    image: string
    alt: string
    credit: string
    source: string
  }
>
