import type { DialogueGraph } from './types';

export const STOREKEEPER_INDEPENDENCE: DialogueGraph = {
  id: 'storekeeper-independence',
  portraitId: 'portrait-storekeeper',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Matt the Storekeeper',
      text: 'Howdy, friend. Outfittin\u2019 for Oregon? I\u2019ve seen too many wagons leave here too light. What can I tell you?',
      choices: [
        { id: 'q-food', text: 'How much food should we bring?', next: 'food' },
        { id: 'q-oxen', text: 'What about oxen?', next: 'oxen' },
        { id: 'q-spares', text: 'Are spare parts worth the weight?', next: 'spares' },
        { id: 'q-leave', text: 'Thank you. I\u2019ll be on my way.' },
      ],
    },
    food: {
      id: 'food',
      speaker: 'Matt the Storekeeper',
      text: 'A grown body needs two pounds of meal a day. Five mouths, five months \u2014 best leave with no less than 600 pounds.',
      choices: [
        { id: 'back', text: 'I\u2019ll remember that.', next: 'open' },
      ],
    },
    oxen: {
      id: 'oxen',
      speaker: 'Matt the Storekeeper',
      text: 'Three yokes \u2014 six head \u2014 is the going minimum. Less and you\u2019ll crawl. More, and you\u2019ll feed \u2018em through the snow.',
      choices: [
        { id: 'back', text: 'Understood.', next: 'open' },
      ],
    },
    spares: {
      id: 'spares',
      speaker: 'Matt the Storekeeper',
      text: 'A man without a spare wheel out past Laramie is a man on foot. Buy one of each. Trust me on this.',
      choices: [
        { id: 'back', text: 'Sound advice.', next: 'open' },
      ],
    },
  },
};

export const TRADER_FORT_HALL: DialogueGraph = {
  id: 'trader-fort-hall',
  portraitId: 'portrait-trader',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Mr. Grant, Trader',
      text: 'Welcome to Fort Hall. Long road behind, longer one ahead. Care to deal?',
      choices: [
        { id: 'q-trail', text: 'What lies between here and Oregon?', next: 'trail' },
        {
          id: 'q-trade-food-ammo',
          text: 'Trade 50 lb of food for 30 rounds of ammunition.',
          next: 'open',
          visibleIf: (s) => s.inventory.food >= 50,
          effects: [
            { kind: 'removeItem', item: 'food', qty: 50 },
            { kind: 'addItem', item: 'ammunition', qty: 30 },
            { kind: 'log', text: 'Traded 50 lb of food for 30 rounds at Fort Hall.' },
          ],
        },
        {
          id: 'q-trade-clothes-food',
          text: 'Trade 1 set of clothing for 20 lb of food.',
          next: 'open',
          visibleIf: (s) => s.inventory.clothing >= 2,
          effects: [
            { kind: 'removeItem', item: 'clothing', qty: 1 },
            { kind: 'addItem', item: 'food', qty: 20 },
            { kind: 'log', text: 'Traded a set of clothing for 20 lb of food.' },
          ],
        },
        { id: 'q-leave', text: 'Be on my way.' },
      ],
    },
    trail: {
      id: 'trail',
      speaker: 'Mr. Grant, Trader',
      text: 'The Snake is wide and the rapids past The Dalles will swallow a wagon whole. Take Barlow Toll Road if your purse can spare $5.',
      choices: [
        { id: 'back', text: 'Thanks.', next: 'open', effects: [{ kind: 'rumor', key: 'columbia-rapids' }] },
      ],
    },
  },
};

export const MOUNTAIN_MAN_BRIDGER: DialogueGraph = {
  id: 'mountain-man-bridger',
  portraitId: 'portrait-mountain-man',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Jim, Mountain Man',
      text: 'You\u2019re smart to detour through Bridger \u2014 most who push the Greenwood lose oxen to thirst. What you wantin\u2019?',
      choices: [
        { id: 'q-route', text: 'Tell me about the road ahead.', next: 'route' },
        { id: 'q-oxen', text: 'My oxen look tired.', next: 'oxen' },
        {
          id: 'q-gift-jerky',
          text: 'Buy 30 lb of pemmican for $5.',
          next: 'open',
          visibleIf: (s) => s.money >= 5,
          effects: [
            { kind: 'removeMoney', amount: 5 },
            { kind: 'addItem', item: 'food', qty: 30 },
            { kind: 'log', text: 'Bought 30 lb of pemmican from a mountain man.' },
          ],
        },
        { id: 'q-leave', text: 'Move along.' },
      ],
    },
    route: {
      id: 'route',
      speaker: 'Jim, Mountain Man',
      text: 'Soda Springs water tastes like the devil but it ain\u2019t poison. Past Fort Hall, the desert eats wagons. Travel cool, rest your stock.',
      choices: [
        { id: 'back', text: 'Obliged.', next: 'open', effects: [{ kind: 'rumor', key: 'soda-springs-safe' }] },
      ],
    },
    oxen: {
      id: 'oxen',
      speaker: 'Jim, Mountain Man',
      text: 'A day\u2019s rest works wonders. Don\u2019t push them grueling pace through the mountains \u2014 you\u2019ll lose two before you save one.',
      choices: [
        { id: 'back', text: 'Good to know.', next: 'open' },
      ],
    },
  },
};

export const PIONEER_WOMAN: DialogueGraph = {
  id: 'pioneer-woman',
  portraitId: 'portrait-pioneer-woman',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Hannah, Pioneer Woman',
      text: 'Saw your wagon comin\u2019. We lost our oldest at the last river. The road has its way of askin\u2019 a price. Anything you need?',
      choices: [
        {
          id: 'q-remedy',
          text: 'A member of my party is sick \u2014 do you have a remedy?',
          next: 'remedy',
          visibleIf: (s) => s.party.some((m) => m.alive && (m.illness !== 'none' || m.health < 70)) && !s.flags['pioneer-remedy-given'],
          effects: [
            { kind: 'health', delta: 20 },
            { kind: 'flag', key: 'pioneer-remedy-given', value: true },
            { kind: 'log', text: 'A pioneer woman shared a healing tea. Your party feels better.' },
          ],
        },
        { id: 'q-news', text: 'Any news from up the trail?', next: 'news' },
        { id: 'q-leave', text: 'Best of luck to you.' },
      ],
    },
    remedy: {
      id: 'remedy',
      speaker: 'Hannah, Pioneer Woman',
      text: 'A bit of yarrow tea and an honest day\u2019s rest. Take these leaves \u2014 boil them with water you trust.',
      choices: [
        { id: 'back', text: 'Bless you.', next: 'open' },
      ],
    },
    news: {
      id: 'news',
      speaker: 'Hannah, Pioneer Woman',
      text: 'A wagon ahead lost a wheel at Devil\u2019s Gate. Carry a spare or two if you can. And boil any water that ain\u2019t running fast.',
      choices: [
        { id: 'back', text: 'Thank you.', next: 'open', effects: [{ kind: 'rumor', key: 'boil-water' }] },
      ],
    },
  },
};

export const CAYUSE_HUNTER: DialogueGraph = {
  id: 'cayuse-hunter',
  portraitId: 'portrait-cayuse-hunter',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Tamástslikt, Cayuse Hunter',
      text: 'You travel hungry. The river is full. With patience you may eat well here.',
      choices: [
        {
          id: 'q-fish',
          text: 'Will you show us how to fish the falls?',
          next: 'fish',
          visibleIf: (s) => !s.flags['cayuse-fish-gift'],
          effects: [
            { kind: 'addItem', item: 'food', qty: 30 },
            { kind: 'flag', key: 'cayuse-fish-gift', value: true },
            { kind: 'log', text: 'Tamástslikt taught you to fish the falls. You preserved 30 lb of salmon.' },
          ],
        },
        {
          id: 'q-fish-already',
          text: 'You have given enough already.',
          visibleIf: (s) => !!s.flags['cayuse-fish-gift'],
        },
        { id: 'q-trail', text: 'What lies west of here?', next: 'trail' },
        { id: 'q-leave', text: 'Walk in peace.' },
      ],
    },
    fish: {
      id: 'fish',
      speaker: 'Tamástslikt, Cayuse Hunter',
      text: 'Drying racks above the spray. Patience. The salmon are generous if you are.',
      choices: [
        { id: 'back', text: 'Thank you.', next: 'open' },
      ],
    },
    trail: {
      id: 'trail',
      speaker: 'Tamástslikt, Cayuse Hunter',
      text: 'The Blue Mountains in autumn are cold. The river beyond runs hard between basalt walls \u2014 take the road over the mountain if you doubt your wagon.',
      choices: [
        { id: 'back', text: 'I will.', next: 'open', effects: [{ kind: 'rumor', key: 'barlow-safer' }] },
      ],
    },
  },
};

export const MISSIONARY_DALLES: DialogueGraph = {
  id: 'missionary-dalles',
  portraitId: 'portrait-missionary',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Reverend Spalding, Missionary',
      text: 'Two roads from this place \u2014 the river and the mountain. Both have taken families I knew. What weighs on you, friend?',
      choices: [
        { id: 'q-river', text: 'What of rafting the Columbia?', next: 'river' },
        { id: 'q-road', text: 'And the Barlow Toll Road?', next: 'road' },
        {
          id: 'q-blessing',
          text: 'A blessing for the journey.',
          next: 'open',
          visibleIf: (s) => !s.flags['missionary-blessing'],
          effects: [
            { kind: 'health', delta: 5 },
            { kind: 'flag', key: 'missionary-blessing', value: true },
            { kind: 'log', text: 'The reverend prayed over your party. Spirits lift.' },
          ],
        },
        { id: 'q-leave', text: 'Go in peace.' },
      ],
    },
    river: {
      id: 'river',
      speaker: 'Reverend Spalding, Missionary',
      text: 'Faster, yes. But the rapids do not forgive the unprepared. I have buried good men who tried it.',
      choices: [
        { id: 'back', text: 'Sobering.', next: 'open', effects: [{ kind: 'rumor', key: 'columbia-rapids' }] },
      ],
    },
    road: {
      id: 'road',
      speaker: 'Reverend Spalding, Missionary',
      text: 'A toll of $5 \u2014 a small price for a known way. Slow, hard on oxen at Laurel Hill, but the families come through whole.',
      choices: [
        { id: 'back', text: 'Worth the toll, then.', next: 'open', effects: [{ kind: 'rumor', key: 'barlow-safer' }] },
      ],
    },
  },
};

export const ALL_DIALOGUES: Record<string, DialogueGraph> = {
  [STOREKEEPER_INDEPENDENCE.id]: STOREKEEPER_INDEPENDENCE,
  [TRADER_FORT_HALL.id]: TRADER_FORT_HALL,
  [MOUNTAIN_MAN_BRIDGER.id]: MOUNTAIN_MAN_BRIDGER,
  [PIONEER_WOMAN.id]: PIONEER_WOMAN,
  [CAYUSE_HUNTER.id]: CAYUSE_HUNTER,
  [MISSIONARY_DALLES.id]: MISSIONARY_DALLES,
};

export const DIALOGUES_BY_NODE: Record<string, string> = {
  'independence': STOREKEEPER_INDEPENDENCE.id,
  'fort-hall': TRADER_FORT_HALL.id,
  'fort-bridger': MOUNTAIN_MAN_BRIDGER.id,
  'salmon-falls': CAYUSE_HUNTER.id,
  'the-dalles': MISSIONARY_DALLES.id,
};

export function dialogueForNode(nodeId: string): string | null {
  return DIALOGUES_BY_NODE[nodeId] ?? null;
}
