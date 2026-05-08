export type Source = {
  name: string;
  url: string;
  lang: 'de' | 'en';
  hint: string;
};

export const SOURCES: Source[] = [
  { name: 'Heise',          url: 'https://www.heise.de/rss/heise-atom.xml',                lang: 'de', hint: 'Allgemeine Tech-News' },
  { name: 'Golem',          url: 'https://rss.golem.de/rss.php?feed=ATOM1.0',              lang: 'de', hint: 'IT, Gaming, Telekommunikation' },
  { name: 't3n',            url: 'https://t3n.de/rss.xml',                                 lang: 'de', hint: 'Digital Business, KI, Web' },
  { name: "Caschys Blog",   url: 'https://stadt-bremerhaven.de/feed/',                     lang: 'de', hint: 'Consumer-Tech, Gadgets' },
  { name: 'The Verge',      url: 'https://www.theverge.com/rss/index.xml',                 lang: 'en', hint: 'Tech, Mobile, Culture' },
  { name: 'TechCrunch',     url: 'https://techcrunch.com/feed/',                           lang: 'en', hint: 'Startups, KI, Big Tech' },
  { name: 'Ars Technica',   url: 'https://feeds.arstechnica.com/arstechnica/index',        lang: 'en', hint: 'Tiefgehende Tech-Stories' },
  { name: 'Engadget',       url: 'https://www.engadget.com/rss.xml',                       lang: 'en', hint: 'Consumer-Electronics' },
  { name: 'Polygon',        url: 'https://www.polygon.com/rss/index.xml',                  lang: 'en', hint: 'Gaming' },
  { name: 'IGN',            url: 'https://feeds.feedburner.com/ign/all',                   lang: 'en', hint: 'Gaming-News & Reviews' },
  { name: '9to5Mac',        url: 'https://9to5mac.com/feed/',                              lang: 'en', hint: 'Apple-Ökosystem' },
  { name: 'Android Police', url: 'https://www.androidpolice.com/feed/',                    lang: 'en', hint: 'Android' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/',               lang: 'en', hint: 'Cybersecurity, Leaks' },
];
