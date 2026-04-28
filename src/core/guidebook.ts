import { DEFAULT_ROUTE } from './landmarks';
import type { Landmark } from './types';

export interface GuidebookEntry {
  nodeId: string;
  title: string;
  body: string;
}

export const GUIDEBOOK: Record<string, GuidebookEntry> = {
  'independence': {
    nodeId: 'independence',
    title: 'Independence, Missouri',
    body:
      'The "jumping-off" town for emigrants bound for Oregon, California, and Santa Fe. ' +
      'In the 1840s the streets bustled each spring with parties outfitting wagons, hiring guides, ' +
      'and waiting for the prairie grass to grow tall enough to feed the oxen.',
  },
  'kansas-river': {
    nodeId: 'kansas-river',
    title: 'Kansas River Crossing',
    body:
      'Also called the Kaw, the Kansas River was the first significant crossing on the trail. ' +
      'Most parties paid the Shawnee or Kanza ferrymen, but in low water some forded their wagons.',
  },
  'big-blue': {
    nodeId: 'big-blue',
    title: 'Big Blue River',
    body:
      'A stout, muddy river in present-day Kansas. After heavy rains it could trap a wagon train ' +
      'on its banks for days. Many parties built rafts of green cottonwood to float wagons across.',
  },
  'fort-kearney': {
    nodeId: 'fort-kearney',
    title: 'Fort Kearney',
    body:
      'Established 1848 on the south bank of the Platte River. Soldiers protected emigrants ' +
      'and offered the last real chance to mail letters home before the long road across the plains.',
  },
  'chimney-rock': {
    nodeId: 'chimney-rock',
    title: 'Chimney Rock',
    body:
      'A spire of soft sandstone and Brule clay that rises nearly 300 feet above the North Platte ' +
      'valley. Mentioned in more emigrant diaries than any other landmark — a sign that the plains ' +
      'were ending and the high country lay ahead.',
  },
  'fort-laramie': {
    nodeId: 'fort-laramie',
    title: 'Fort Laramie',
    body:
      'Originally a fur-trading post called Fort William, sold to the U.S. Army in 1849. ' +
      'Emigrants overhauled wagons, traded with Sioux and Cheyenne, and rested before the climb ' +
      'to South Pass.',
  },
  'register-cliff': {
    nodeId: 'register-cliff',
    title: 'Register Cliff',
    body:
      'A soft sandstone bluff just past Fort Laramie. Thousands of emigrants carved their names, ' +
      'dates, and hometowns into its face. Many of those signatures are still legible today.',
  },
  'independence-rock': {
    nodeId: 'independence-rock',
    title: 'Independence Rock',
    body:
      'A massive granite dome on the Sweetwater River. Wagons that reached it by July 4th were ' +
      'said to be "on schedule" for crossing the Cascades before the snows. Hundreds of emigrants ' +
      'painted or carved their names on its sides.',
  },
  'devils-gate': {
    nodeId: 'devils-gate',
    title: "Devil's Gate",
    body:
      'A dramatic 370-foot cleft cut through a granite ridge by the Sweetwater River. ' +
      'Wagons could not pass through the gorge itself; the trail detoured around it to the south.',
  },
  'south-pass': {
    nodeId: 'south-pass',
    title: 'South Pass',
    body:
      'The gentlest crossing of the Continental Divide — a broad, sage-covered saddle 7,550 feet up. ' +
      'Many emigrants rolled across the divide without realizing they had crested the Rockies. ' +
      'Beyond it, the rivers run west.',
  },
  'fort-bridger': {
    nodeId: 'fort-bridger',
    title: 'Fort Bridger',
    body:
      'Built in 1843 by Jim Bridger and Louis Vasquez. A mountain-man trading post with a small ' +
      'palisade where emigrants traded for fresh oxen and stocked up before the Bear River country.',
  },
  'green-river': {
    nodeId: 'green-river',
    title: 'Green River',
    body:
      'A swift, deep river of cold mountain water. Several ferries operated near the Greenwood ' +
      'Cutoff crossing — a Mormon ferry, then later commercial outfits. Fording was risky in June.',
  },
  'soda-springs': {
    nodeId: 'soda-springs',
    title: 'Soda Springs',
    body:
      'A field of bubbling carbonated springs in southeastern Idaho. Emigrants flavored the water ' +
      'with sugar and lemon to drink it like soda. Steamboat Spring would erupt every few minutes.',
  },
  'fort-hall': {
    nodeId: 'fort-hall',
    title: 'Fort Hall',
    body:
      'A Hudson\'s Bay Company post on the Snake River plain. Traders here often urged emigrants to ' +
      'turn south to California. Those who held to Oregon faced the worst stretch of the trail next.',
  },
  'snake-river': {
    nodeId: 'snake-river',
    title: 'Snake River',
    body:
      'A wide, swift river running through deep basalt canyons. Crossings demanded careful work — ' +
      'wagons were sometimes floated as their own rafts, oxen swimming alongside.',
  },
  'salmon-falls': {
    nodeId: 'salmon-falls',
    title: 'Salmon Falls',
    body:
      'Cascading rapids where Shoshone and Bannock people netted salmon from wooden platforms. ' +
      'Hungry emigrants traded shirts, knives, and lead for dried fish.',
  },
  'three-island': {
    nodeId: 'three-island',
    title: 'Three Island Crossing',
    body:
      'The hardest decision on the Snake. Cross north to better forage and water — or stay south ' +
      'on a dry, dusty trail. Many parties lost wagons attempting the islands in high water.',
  },
  'fort-boise': {
    nodeId: 'fort-boise',
    title: 'Fort Boise',
    body:
      'A small whitewashed Hudson\'s Bay Company fort in the Boise River bottoms. Emigrants rested ' +
      'in the cottonwood shade before the long climb into the Blue Mountains.',
  },
  'blue-mountains': {
    nodeId: 'blue-mountains',
    title: 'Blue Mountains',
    body:
      'A steep, forested range in northeastern Oregon. Wagons had to be lowered by ropes down the ' +
      'worst grades. Snow could close the route as early as October.',
  },
  'fort-walla-walla': {
    nodeId: 'fort-walla-walla',
    title: 'Fort Walla Walla',
    body:
      'An HBC post on the Columbia near the Whitman mission. After the mission was destroyed in ' +
      '1847, many emigrants pushed straight on to The Dalles without lingering.',
  },
  'the-dalles': {
    nodeId: 'the-dalles',
    title: 'The Dalles',
    body:
      'A stretch of basalt rapids on the Columbia. Until 1846 it was the end of the wagon road — ' +
      'parties broke their wagons down and rafted the last leg. The Barlow Toll Road around Mt. Hood ' +
      'opened a slower but drier alternative.',
  },
  'raft-columbia': {
    nodeId: 'raft-columbia',
    title: 'Columbia River Rapids',
    body:
      'The fast, dangerous water of the lower Columbia. Many wagons and not a few lives were lost ' +
      'in the rapids between The Dalles and the Cascades.',
  },
  'barlow-road': {
    nodeId: 'barlow-road',
    title: 'Barlow Toll Road',
    body:
      'Sam Barlow\'s 1846 cut around the south flank of Mt. Hood. The Laurel Hill descent was so ' +
      'steep that wagons were lowered by ropes around tree trunks. The toll was $5 per wagon.',
  },
  'fort-vancouver': {
    nodeId: 'fort-vancouver',
    title: 'Fort Vancouver',
    body:
      'The Hudson\'s Bay Company headquarters on the lower Columbia. Chief Factor John McLoughlin ' +
      'was famous for extending credit and food to American emigrants — to the irritation of his ' +
      'British employers.',
  },
  'oregon-city': {
    nodeId: 'oregon-city',
    title: 'Oregon City',
    body:
      'A muddy frontier town at Willamette Falls. The end of the trail for most emigrants — they ' +
      'filed land claims here and walked or rafted on to their new farms.',
  },
  'willamette': {
    nodeId: 'willamette',
    title: 'Willamette Valley',
    body:
      'Mild, well-watered, and immense. The promised land that drew thousands across two thousand ' +
      'miles of plain, mountain, and desert. Welcome home.',
  },
};

export function guidebookEntry(nodeId: string): GuidebookEntry | undefined {
  return GUIDEBOOK[nodeId];
}

export function allGuidebookEntries(): GuidebookEntry[] {
  return Object.values(DEFAULT_ROUTE.nodes)
    .map((n: Landmark) => GUIDEBOOK[n.id])
    .filter((e): e is GuidebookEntry => e !== undefined);
}
