import type { Localised } from '../type';

export type SpeciesInfoEntry = {
  description: Localised;
  origin: Localised;
};

// Keyed by lowercase genus (matches the list's genus facet). Anything absent has no
// bio — we never invent a story we have not curated.
export const PLANT_SPECIES_INFO_CATALOG: Record<string, SpeciesInfoEntry> = {
  // Aroids — the bulk of trendy foliage plants.
  monstera: {
    description: {
      fr: 'Liane géante des forêts tropicales, la Monstera se hisse sur les arbres grâce à ses racines aériennes. On l’adore pour ses grandes feuilles qui se percent et se découpent en grandissant — d’où son surnom de « plante gruyère ».',
      en: 'A giant rainforest vine that hauls itself up trees on aerial roots. It is loved for its huge leaves, which split and punch holes as they mature — hence the nickname “Swiss cheese plant”.',
    },
    origin: {
      fr: 'Forêts humides du sud du Mexique et d’Amérique centrale.',
      en: 'Humid forests of southern Mexico and Central America.',
    },
  },
  philodendron: {
    description: {
      fr: 'Vaste famille de plantes grimpantes ou retombantes au feuillage souple et brillant. Son nom grec signifie « qui aime les arbres » : increvable et indulgent, c’est l’un des premiers compagnons de tout amateur de plantes.',
      en: 'A vast family of climbing or trailing plants with soft, glossy leaves. Its Greek name means “tree-loving”: tough and forgiving, it is one of the first companions for any plant lover.',
    },
    origin: {
      fr: 'Forêts tropicales d’Amérique centrale et du Sud.',
      en: 'Tropical forests of Central and South America.',
    },
  },
  epipremnum: {
    description: {
      fr: 'Le pothos doré est une liane retombante quasi indestructible, si résistante qu’on la surnomme « lierre du diable ». Elle pardonne l’oubli, pousse vite et se bouture d’un simple verre d’eau.',
      en: 'Golden pothos is a trailing vine so hard to kill it is nicknamed “devil’s ivy”. It shrugs off neglect, grows fast and roots from a simple glass of water.',
    },
    origin: {
      fr: 'Îles du Pacifique Sud, notamment la Polynésie française.',
      en: 'South Pacific islands, notably French Polynesia.',
    },
  },
  scindapsus: {
    description: {
      fr: 'Le pothos satiné séduit par ses feuilles mates, cœur vert profond éclaboussé d’argent. Grimpante ou retombante, elle garde un port élégant même dans les coins peu lumineux.',
      en: 'Satin pothos charms with matte leaves — deep green hearts splashed with silver. Climbing or trailing, it keeps an elegant shape even in dim corners.',
    },
    origin: {
      fr: 'Forêts d’Asie du Sud-Est.',
      en: 'Forests of Southeast Asia.',
    },
  },
  pothos: {
    description: {
      fr: 'Star des débutants, le pothos enchaîne les cascades de feuilles en cœur sur des tiges qui n’en finissent pas. Il tolère la pénombre, oublie les arrosages ratés et se drape volontiers autour d’une étagère.',
      en: 'A beginner’s favourite, pothos spills cascades of heart-shaped leaves down endless stems. It tolerates low light, forgives a missed watering and happily drapes around a shelf.',
    },
    origin: {
      fr: 'Îles Salomon, dans le Pacifique.',
      en: 'The Solomon Islands, in the Pacific.',
    },
  },
  dieffenbachia: {
    description: {
      fr: 'Grand feuillage panaché de crème et de vert, la dieffenbachia apporte une touche tropicale généreuse. Sa sève engourdit la bouche si on la mâche, ce qui lui a valu le surnom de « canne des muets ».',
      en: 'With big leaves marbled in cream and green, dieffenbachia brings a generous tropical touch. Its sap numbs the mouth if chewed, earning it the name “dumb cane”.',
    },
    origin: {
      fr: 'Caraïbes et Amérique du Sud.',
      en: 'The Caribbean and South America.',
    },
  },
  aglaonema: {
    description: {
      fr: 'L’aglaonème, ou « feuille de Chine », est l’une des rares plantes qui prospère loin des fenêtres. Ses cultivars modernes déclinent des roses et des rouges spectaculaires sur un feuillage robuste et facile.',
      en: 'The Chinese evergreen is one of the few plants that thrives far from a window. Its modern cultivars splash spectacular pinks and reds across tough, easy-going foliage.',
    },
    origin: {
      fr: 'Forêts tropicales d’Asie du Sud-Est.',
      en: 'Tropical forests of Southeast Asia.',
    },
  },
  alocasia: {
    description: {
      fr: 'L’alocasia dresse de grandes feuilles en pointe de flèche, nervures claires sur fond sombre, dignes d’un masque africain. Théâtrale et exigeante, elle récompense l’air humide par une croissance rapide.',
      en: 'Alocasia holds up big arrow-shaped leaves with pale veins on a dark ground, like an African mask. Dramatic and demanding, it rewards humid air with fast growth.',
    },
    origin: {
      fr: 'Forêts tropicales d’Asie et de l’est de l’Australie.',
      en: 'Tropical forests of Asia and eastern Australia.',
    },
  },
  colocasia: {
    description: {
      fr: 'Le taro déploie d’immenses feuilles en oreille d’éléphant qui semblent capter la pluie. Cultivé depuis des millénaires pour son tubercule comestible, il donne un air de jungle dès qu’il a chaud et soif.',
      en: 'Taro unfurls enormous elephant-ear leaves that seem to catch the rain. Grown for millennia for its edible corm, it turns any warm, well-watered spot into a jungle.',
    },
    origin: {
      fr: 'Asie du Sud-Est et sous-continent indien.',
      en: 'Southeast Asia and the Indian subcontinent.',
    },
  },
  caladium: {
    description: {
      fr: 'Les « ailes d’ange » offrent des feuilles fines comme du papier, peintes de rose, de blanc et de rouge. Elles s’endorment en hiver puis renaissent au printemps, plus vives que jamais.',
      en: 'Angel wings bear paper-thin leaves painted in pink, white and red. They go to sleep in winter, then return in spring more vivid than ever.',
    },
    origin: {
      fr: 'Bassin amazonien, en Amérique du Sud.',
      en: 'The Amazon basin, in South America.',
    },
  },
  syngonium: {
    description: {
      fr: 'La plante flèche change de visage en grandissant : ses feuilles passent de la simple pointe de flèche à des formes lobées. Grimpante et vigoureuse, elle se décline du vert tendre au rose poudré.',
      en: 'The arrowhead plant changes face as it grows: its leaves shift from a simple arrow to lobed shapes. Vigorous and climbing, it ranges from soft green to powdery pink.',
    },
    origin: {
      fr: 'Forêts tropicales d’Amérique centrale et du Sud.',
      en: 'Tropical forests of Central and South America.',
    },
  },
  spathiphyllum: {
    description: {
      fr: 'Le spathiphyllum, ou « fleur de lune », déploie une élégante spathe blanche au-dessus d’un feuillage vert profond. Il baisse ses feuilles pour dire qu’il a soif puis se redresse aussitôt arrosé — et purifie l’air au passage.',
      en: 'The peace lily raises an elegant white spathe above deep green leaves. It droops to say it is thirsty, then perks up the moment it is watered — cleaning the air as it goes.',
    },
    origin: {
      fr: 'Amériques tropicales et Asie du Sud-Est.',
      en: 'The tropical Americas and Southeast Asia.',
    },
  },
  anthurium: {
    description: {
      fr: 'L’anthurium, ou « fleur flamant », arbore des spathes laquées, cireuses et durables, du rouge vif au rose tendre. Sous une lumière vive indirecte, il fleurit presque toute l’année.',
      en: 'Anthurium, the flamingo flower, wears lacquered, waxy, long-lasting spathes from bright red to soft pink. In bright, indirect light it blooms almost year-round.',
    },
    origin: {
      fr: 'Forêts tropicales d’Amérique centrale et du Sud.',
      en: 'Tropical forests of Central and South America.',
    },
  },
  zamioculcas: {
    description: {
      fr: 'La plante ZZ aligne des folioles vernissées sur des tiges arquées d’un vert profond. Ses rhizomes stockent l’eau : quasi increvable, elle traverse sans broncher les oublis et les pièces sombres.',
      en: 'The ZZ plant lines glossy leaflets along arching, deep-green stems. Its rhizomes store water, so it is nearly indestructible — it sails through neglect and dark rooms.',
    },
    origin: {
      fr: 'Afrique de l’Est, de Zanzibar au Kenya.',
      en: 'East Africa, from Zanzibar to Kenya.',
    },
  },
  schefflera: {
    description: {
      fr: 'Le « parapluie » doit son nom à ses folioles qui rayonnent en cercle comme les baleines d’un parapluie. Vigoureux et facile à tailler, il prend vite du volume pour occuper un coin lumineux.',
      en: 'The umbrella tree is named for leaflets that radiate in a circle like umbrella spokes. Vigorous and easy to prune, it quickly gains volume to fill a bright corner.',
    },
    origin: {
      fr: 'Taïwan et régions tropicales d’Asie et du Pacifique.',
      en: 'Taiwan and the tropics of Asia and the Pacific.',
    },
  },
  // Other well-known foliage & flowering plants.
  dracaena: {
    description: {
      fr: 'Le dragonnier dresse des rosettes de feuilles rubanées au sommet de troncs graphiques. Son nom évoque le « sang du dragon », la résine rouge de certaines espèces, prisée depuis l’Antiquité.',
      en: 'The dragon tree lifts rosettes of ribbon-like leaves atop graphic trunks. Its name recalls “dragon’s blood”, the red resin of some species, prized since antiquity.',
    },
    origin: {
      fr: 'Afrique et Madagascar.',
      en: 'Africa and Madagascar.',
    },
  },
  sansevieria: {
    description: {
      fr: 'La « langue de belle-mère » dresse des feuilles rigides et graphiques, souvent bordées de jaune. Increvable, elle supporte l’ombre, la sécheresse et l’oubli, tout en assainissant l’air la nuit.',
      en: 'The snake plant stands stiff, graphic leaves, often edged in yellow. Indestructible, it copes with shade, drought and neglect while cleaning the air at night.',
    },
    origin: {
      fr: 'Afrique de l’Ouest tropicale.',
      en: 'Tropical West Africa.',
    },
  },
  aloe: {
    description: {
      fr: 'L’aloe vera aligne des feuilles charnues et dentelées gorgées d’un gel apaisant, utilisé depuis des millénaires. Succulente robuste, elle ne demande qu’un peu de soleil et très peu d’eau.',
      en: 'Aloe vera fans out fleshy, toothed leaves full of a soothing gel used for millennia. A tough succulent, it asks only for a little sun and very little water.',
    },
    origin: {
      fr: 'Péninsule arabique.',
      en: 'The Arabian Peninsula.',
    },
  },
  ficus: {
    description: {
      fr: 'Le genre des figuiers réunit le caoutchouc aux feuilles vernissées et le figuier lyre à la silhouette de star. Attaché à ses habitudes, il déteste être déplacé et peut bouder en perdant quelques feuilles.',
      en: 'The fig genus spans the glossy-leaved rubber plant and the statuesque fiddle-leaf fig. A creature of habit, it hates being moved and may sulk by dropping a few leaves.',
    },
    origin: {
      fr: 'Régions tropicales du monde entier, surtout d’Asie.',
      en: 'The tropics worldwide, especially Asia.',
    },
  },
  euphorbia: {
    description: {
      fr: 'Immense genre aux allures de cactus — couronne d’épines, euphorbe crayon — mais sans lien avec les vrais cactus. Toutes partagent un latex laiteux et une passion pour le soleil et la sécheresse.',
      en: 'A huge genus with cactus looks — crown of thorns, pencil cactus — yet unrelated to true cacti. All share a milky latex and a love of sun and dry soil.',
    },
    origin: {
      fr: 'Afrique et Madagascar, surtout les régions arides.',
      en: 'Africa and Madagascar, mostly arid regions.',
    },
  },
  kalanchoe: {
    description: {
      fr: 'Cette petite succulente offre des bouquets serrés de fleurs vives qui durent des semaines. Elle refleurit après une série de longues nuits sombres, ce qui la rend idéale pour égayer l’hiver.',
      en: 'This small succulent offers tight clusters of bright flowers that last for weeks. It reblooms after a run of long, dark nights, making it perfect for brightening winter.',
    },
    origin: {
      fr: 'Madagascar.',
      en: 'Madagascar.',
    },
  },
  hedera: {
    description: {
      fr: 'Le lierre grimpant, classique des jardins européens, s’invite aussi en intérieur en cascade ou palissé. Il aime la fraîcheur et une douche de temps en temps pour garder son feuillage net.',
      en: 'English ivy, a classic of European gardens, moves indoors too — cascading or trained on a support. It likes cool air and an occasional rinse to keep its foliage clean.',
    },
    origin: {
      fr: 'Europe et Asie occidentale.',
      en: 'Europe and western Asia.',
    },
  },
  cyclamen: {
    description: {
      fr: 'Le cyclamen fleurit à contre-saison, dressant des pétales relevés comme des papillons au-dessus d’un feuillage marbré. Il pousse d’un tubercule et préfère la fraîcheur pour prolonger sa floraison.',
      en: 'Cyclamen flowers out of season, lifting swept-back petals like butterflies above marbled leaves. It grows from a tuber and prefers cool air to stretch out its bloom.',
    },
    origin: {
      fr: 'Pourtour méditerranéen.',
      en: 'The Mediterranean region.',
    },
  },
  lilium: {
    description: {
      fr: 'Le vrai lis déploie de grandes fleurs souvent parfumées, symboles de pureté depuis l’Antiquité. Cultivé en pot, il demande beaucoup de lumière pendant la floraison puis un repos une fois le feuillage jauni.',
      en: 'The true lily opens large, often fragrant flowers, a symbol of purity since antiquity. Grown in a pot, it wants plenty of light while blooming, then a rest once the foliage yellows.',
    },
    origin: {
      fr: 'Régions tempérées de l’hémisphère nord.',
      en: 'Temperate regions of the northern hemisphere.',
    },
  },
  crassula: {
    description: {
      fr: 'L’arbre de jade forme un petit arbuste succulent aux feuilles rondes et charnues. Symbole de chance et de prospérité, il vit très longtemps et se transmet volontiers d’une génération à l’autre.',
      en: 'The jade plant forms a small succulent shrub with round, fleshy leaves. A symbol of luck and prosperity, it lives for decades and is often passed down through a family.',
    },
    origin: {
      fr: 'Afrique du Sud et Mozambique.',
      en: 'South Africa and Mozambique.',
    },
  },
  begonia: {
    description: {
      fr: 'Les bégonias jouent sur des feuilles asymétriques aux motifs spiralés et des floraisons délicates. Nommés d’après Michel Bégon, ils forment un genre immense où chacun trouve sa favorite.',
      en: 'Begonias play on asymmetric leaves with spiralled patterns and delicate blooms. Named after Michel Bégon, they form a huge genus in which everyone finds a favourite.',
    },
    origin: {
      fr: 'Régions tropicales et subtropicales du monde entier.',
      en: 'Tropical and subtropical regions worldwide.',
    },
  },
  // Pet-safe common houseplants.
  chlorophytum: {
    description: {
      fr: 'La plante araignée envoie de longues hampes arquées portant des plantules toutes prêtes à raciner. Généreuse et indulgente, elle se multiplie à l’infini dans un simple verre d’eau.',
      en: 'The spider plant sends out long, arching stems bearing plantlets ready to root. Generous and forgiving, it multiplies endlessly in a simple glass of water.',
    },
    origin: {
      fr: 'Afrique australe et de l’Ouest.',
      en: 'Southern and western Africa.',
    },
  },
  calathea: {
    description: {
      fr: 'La calathéa fascine par ses feuilles peintes de motifs graphiques, pourpres au revers. Chaque soir, elles se replient comme des mains jointes — un ballet qui lui vaut le nom de « plante qui prie ».',
      en: 'Calathea dazzles with leaves painted in graphic patterns and purple undersides. Each evening they fold up like praying hands — a nightly dance that earns it the name “prayer plant”.',
    },
    origin: {
      fr: 'Forêts amazoniennes d’Amérique du Sud.',
      en: 'The Amazon rainforests of South America.',
    },
  },
  goeppertia: {
    description: {
      fr: 'Nouveau nom botanique de nombreuses calathéas, la goeppertia partage leurs feuilles ornées et leur mouvement nocturne. Elle aime l’air humide et l’eau douce, non calcaire.',
      en: 'The current botanical name for many calatheas, goeppertia shares their patterned leaves and nightly movement. It likes humid air and soft, non-chalky water.',
    },
    origin: {
      fr: 'Forêts tropicales d’Amérique du Sud.',
      en: 'Tropical forests of South America.',
    },
  },
  maranta: {
    description: {
      fr: 'La maranta, ou « plante qui prie », relève ses feuilles chaque nuit comme deux mains jointes. Ses nervures rouges dessinées sur le vert lui donnent des airs de plumage.',
      en: 'The prayer plant raises its leaves each night like two joined hands. Red veins drawn across the green give it an almost feathered look.',
    },
    origin: {
      fr: 'Forêts tropicales du Brésil.',
      en: 'The tropical forests of Brazil.',
    },
  },
  peperomia: {
    description: {
      fr: 'Les pépéromias, ou « plantes radiateur », rassemblent des centaines de petites plantes aux feuilles charnues et variées. Compactes et faciles, elles se contentent d’un rebord de fenêtre.',
      en: 'Peperomias, the radiator plants, gather hundreds of small species with fleshy, varied leaves. Compact and easy, they are happy on a windowsill.',
    },
    origin: {
      fr: 'Régions tropicales des Amériques.',
      en: 'The tropical Americas.',
    },
  },
  pilea: {
    description: {
      fr: 'La « plante à monnaie chinoise » aligne des feuilles rondes comme des pièces sur de fines tiges. On se la transmet entre amis grâce à ses nombreux rejets, d’où son surnom de « plante de l’amitié ».',
      en: 'The Chinese money plant lines round, coin-like leaves along slender stems. Its many pups are passed from friend to friend, earning it the name “friendship plant”.',
    },
    origin: {
      fr: 'Sud-ouest de la Chine, dans le Yunnan.',
      en: 'Southwestern China, in Yunnan.',
    },
  },
  fittonia: {
    description: {
      fr: 'La plante mosaïque tisse un réseau de nervures blanches ou roses sur de petites feuilles vertes. Dramatique, elle s’effondre dès qu’elle a soif puis revit en quelques minutes après l’arrosage.',
      en: 'The nerve plant weaves a web of white or pink veins across small green leaves. A drama queen, it collapses when thirsty then revives within minutes of a drink.',
    },
    origin: {
      fr: 'Forêts tropicales du Pérou et d’Amérique du Sud.',
      en: 'The rainforests of Peru and South America.',
    },
  },
  hoya: {
    description: {
      fr: 'La fleur de porcelaine porte des feuilles épaisses et cireuses et, en été, des ombelles d’étoiles au parfum sucré. Patiente, elle refleurit chaque année sur les mêmes hampes, qu’il ne faut pas couper.',
      en: 'The wax plant carries thick, waxy leaves and, in summer, sweetly scented clusters of star flowers. Patient, it reblooms each year on the same stalks, which should never be cut off.',
    },
    origin: {
      fr: 'Asie et Australie.',
      en: 'Asia and Australia.',
    },
  },
  howea: {
    description: {
      fr: 'Le palmier Kentia incarne l’élégance des salons victoriens avec ses frondes souples et arquées. Tolérant à la pénombre, il apporte une verticalité paisible dans les grands espaces.',
      en: 'The Kentia palm embodies Victorian parlour elegance with its soft, arching fronds. Shade-tolerant, it brings a calm verticality to larger rooms.',
    },
    origin: {
      fr: 'Île Lord Howe, au large de l’Australie.',
      en: 'Lord Howe Island, off the coast of Australia.',
    },
  },
  chamaedorea: {
    description: {
      fr: 'Le palmier nain, ou « palmier de salon », séduit depuis l’époque victorienne par sa taille modeste. Il se plaît loin du soleil direct et redoute surtout l’excès d’eau.',
      en: 'The parlour palm has charmed homes since Victorian times with its modest size. It thrives away from direct sun and fears mostly overwatering.',
    },
    origin: {
      fr: 'Forêts du Mexique et d’Amérique centrale.',
      en: 'The forests of Mexico and Central America.',
    },
  },
  nephrolepis: {
    description: {
      fr: 'La fougère de Boston déploie des frondes plumeuses et retombantes qui adorent l’air humide. Suspendue, elle forme un nuage de verdure fraîche et sauvage.',
      en: 'The Boston fern spreads feathery, cascading fronds that adore humid air. Hung up, it forms a cloud of fresh, wild greenery.',
    },
    origin: {
      fr: 'Régions tropicales du monde entier.',
      en: 'The tropics worldwide.',
    },
  },
  phalaenopsis: {
    description: {
      fr: 'L’orchidée papillon est la plus populaire des orchidées d’intérieur, avec ses longues hampes de fleurs qui tiennent des mois. Épiphyte, elle vit accrochée aux arbres et aime qu’on trempe ses racines une fois par semaine.',
      en: 'The moth orchid is the most popular indoor orchid, its arching sprays of blooms lasting for months. An epiphyte, it lives clinging to trees and likes its roots soaked once a week.',
    },
    origin: {
      fr: 'Asie du Sud-Est et nord de l’Australie.',
      en: 'Southeast Asia and northern Australia.',
    },
  },
  saintpaulia: {
    description: {
      fr: 'La violette africaine forme une rosette de feuilles duveteuses couronnée de fleurs presque toute l’année. Nommée d’après le baron von Saint Paul, elle s’arrose par le bas pour épargner son feuillage.',
      en: 'The African violet forms a rosette of downy leaves crowned with flowers almost year-round. Named after Baron von Saint Paul, it is watered from below to spare its foliage.',
    },
    origin: {
      fr: 'Monts Usambara, en Tanzanie.',
      en: 'The Usambara Mountains of Tanzania.',
    },
  },
  schlumbergera: {
    description: {
      fr: 'Le cactus de Noël fleurit en plein hiver, offrant des cascades de fleurs roses ou rouges. C’est un cactus de forêt : il vit accroché aux arbres et boit bien plus qu’un cactus du désert.',
      en: 'The Christmas cactus blooms in midwinter, offering cascades of pink or red flowers. It is a forest cactus: it lives on tree branches and drinks far more than a desert one.',
    },
    origin: {
      fr: 'Montagnes côtières du sud-est du Brésil.',
      en: 'The coastal mountains of southeastern Brazil.',
    },
  },
  echeveria: {
    description: {
      fr: 'L’echeveria forme des rosettes parfaites de feuilles charnues, souvent nuancées de bleu, de rose ou de pourpre. Amoureuse du soleil, elle est nommée d’après Atanasio Echeverría, dessinateur botaniste.',
      en: 'Echeveria forms perfect rosettes of fleshy leaves, often tinged with blue, pink or purple. A sun-lover, it is named after the botanical illustrator Atanasio Echeverría.',
    },
    origin: {
      fr: 'Régions semi-désertiques du Mexique.',
      en: 'The semi-desert regions of Mexico.',
    },
  },
  haworthia: {
    description: {
      fr: 'Ces petites succulentes en rosette rappellent l’aloès en miniature ; certaines ouvrent des « fenêtres » translucides pour capter la lumière. Compactes et patientes, elles supportent la mi-ombre.',
      en: 'These small rosette succulents look like miniature aloes; some open translucent “windows” to catch the light. Compact and patient, they tolerate part shade.',
    },
    origin: {
      fr: 'Afrique du Sud.',
      en: 'South Africa.',
    },
  },
  beaucarnea: {
    description: {
      fr: 'Le pied d’éléphant renfle la base de son tronc pour y stocker l’eau, coiffé d’une cascade de fines feuilles retombantes. Malgré son surnom de « palmier à queue de cheval », ce n’en est pas un — et il s’arrose très rarement.',
      en: 'The ponytail palm swells the base of its trunk to store water, topped by a cascade of thin, drooping leaves. Despite the name, it is not a true palm — and it needs watering only rarely.',
    },
    origin: {
      fr: 'Est du Mexique.',
      en: 'Eastern Mexico.',
    },
  },
};
