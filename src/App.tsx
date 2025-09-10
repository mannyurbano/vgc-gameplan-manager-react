import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import { CloudImportModal } from './CloudImportModal';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthGuard } from './auth/AuthGuard';
import './App.css';

// File System Access API types (for modern browsers)
declare global {
  interface Window {
    showOpenFilePicker?: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: any) => Promise<FileSystemFileHandle>;
  }
}

interface FileSystemFileHandle {
  name: string;
  kind: 'file' | 'directory';
  getFile(): Promise<File>;
  createWritable(options?: any): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface Replay {
  id: string;
  url: string;
  matchup: string;
  gameplanNumber?: number; // 1, 2, 3, etc. for specific gameplans
  dateAdded: string;
  description?: string;
  result?: 'win' | 'loss' | 'draw';
  tags?: string[]; // For additional categorization
}

interface Gameplan {
  id: string;
  title: string;
  content: string;
  dateCreated: string;
  tags: string[];
  season?: string;
  tournament?: string;
  format?: string;
  teamPokemon?: string[];
  rivalTeams?: { [key: string]: string[] };
  analysis?: {
    likelyLeads?: string[];
    unlikelyMons?: string[];
    threatsToRival?: string[];
    rivalPressure?: string[];
    myWincon?: string[];
    theirWincon?: string[];
  };
  // Add tracking for original file information
  originalFile?: {
    name: string;
    type: 'json' | 'markdown';
    lastModified?: number;
    handle?: FileSystemFileHandle; // For File System Access API
  };
  // New structured replay system
  replays?: {
    [matchupKey: string]: {
      [gameplanNumber: string]: Replay[];
    };
  };
}

// Comprehensive Pokemon ID mapping for PokéAPI sprites (Gen 1-9)
const POKEMON_ID_MAP: { [key: string]: number } = {
  // Gen 1 (1-151)
  'Bulbasaur': 1, 'Ivysaur': 2, 'Venusaur': 3, 'Charmander': 4, 'Charmeleon': 5, 'Charizard': 6,
  'Squirtle': 7, 'Wartortle': 8, 'Blastoise': 9, 'Caterpie': 10, 'Metapod': 11, 'Butterfree': 12,
  'Weedle': 13, 'Kakuna': 14, 'Beedrill': 15, 'Pidgey': 16, 'Pidgeotto': 17, 'Pidgeot': 18,
  'Rattata': 19, 'Raticate': 20, 'Spearow': 21, 'Fearow': 22, 'Ekans': 23, 'Arbok': 24,
  'Pikachu': 25, 'Raichu': 26, 'Sandshrew': 27, 'Sandslash': 28, 'Nidoran♀': 29, 'Nidorina': 30,
  'Nidoqueen': 31, 'Nidoran♂': 32, 'Nidorino': 33, 'Nidoking': 34, 'Clefairy': 35, 'Clefable': 36,
  'Vulpix': 37, 'Ninetales': 38, 'Jigglypuff': 39, 'Wigglytuff': 40, 'Zubat': 41, 'Golbat': 42,
  'Oddish': 43, 'Gloom': 44, 'Vileplume': 45, 'Paras': 46, 'Parasect': 47, 'Venonat': 48,
  'Venomoth': 49, 'Diglett': 50, 'Dugtrio': 51, 'Meowth': 52, 'Persian': 53, 'Psyduck': 54,
  'Golduck': 55, 'Mankey': 56, 'Primeape': 57, 'Growlithe': 58, 'Arcanine': 59, 'Poliwag': 60,
  'Poliwhirl': 61, 'Poliwrath': 62, 'Abra': 63, 'Kadabra': 64, 'Alakazam': 65, 'Machop': 66,
  'Machoke': 67, 'Machamp': 68, 'Bellsprout': 69, 'Weepinbell': 70, 'Victreebel': 71, 'Tentacool': 72,
  'Tentacruel': 73, 'Geodude': 74, 'Graveler': 75, 'Golem': 76, 'Ponyta': 77, 'Rapidash': 78,
  'Slowpoke': 79, 'Slowbro': 80, 'Magnemite': 81, 'Magneton': 82, 'Farfetch\'d': 83, 'Doduo': 84,
  'Dodrio': 85, 'Seel': 86, 'Dewgong': 87, 'Grimer': 88, 'Muk': 89, 'Shellder': 90,
  'Cloyster': 91, 'Gastly': 92, 'Haunter': 93, 'Gengar': 94, 'Onix': 95, 'Drowzee': 96,
  'Hypno': 97, 'Krabby': 98, 'Kingler': 99, 'Voltorb': 100, 'Electrode': 101, 'Exeggcute': 102,
  'Exeggutor': 103, 'Cubone': 104, 'Marowak': 105, 'Hitmonlee': 106, 'Hitmonchan': 107, 'Lickitung': 108,
  'Koffing': 109, 'Weezing': 110, 'Rhyhorn': 111, 'Rhydon': 112, 'Chansey': 113, 'Tangela': 114,
  'Kangaskhan': 115, 'Horsea': 116, 'Seadra': 117, 'Goldeen': 118, 'Seaking': 119, 'Staryu': 120,
  'Starmie': 121, 'Mr. Mime': 122, 'Scyther': 123, 'Jynx': 124, 'Electabuzz': 125, 'Magmar': 126,
  'Pinsir': 127, 'Tauros': 128, 'Magikarp': 129, 'Gyarados': 130, 'Lapras': 131, 'Ditto': 132,
  'Eevee': 133, 'Vaporeon': 134, 'Jolteon': 135, 'Flareon': 136, 'Porygon': 137, 'Omanyte': 138,
  'Omastar': 139, 'Kabuto': 140, 'Kabutops': 141, 'Aerodactyl': 142, 'Snorlax': 143, 'Articuno': 144,
  'Zapdos': 145, 'Moltres': 146, 'Dratini': 147, 'Dragonair': 148, 'Dragonite': 149, 'Mewtwo': 150, 'Mew': 151,

  // Gen 2 (152-251)
  'Chikorita': 152, 'Bayleef': 153, 'Meganium': 154, 'Cyndaquil': 155, 'Quilava': 156, 'Typhlosion': 157,
  'Totodile': 158, 'Croconaw': 159, 'Feraligatr': 160, 'Sentret': 161, 'Furret': 162, 'Hoothoot': 163,
  'Noctowl': 164, 'Ledyba': 165, 'Ledian': 166, 'Spinarak': 167, 'Ariados': 168, 'Crobat': 169,
  'Chinchou': 170, 'Lanturn': 171, 'Pichu': 172, 'Cleffa': 173, 'Igglybuff': 174, 'Togepi': 175,
  'Togetic': 176, 'Natu': 177, 'Xatu': 178, 'Mareep': 179, 'Flaaffy': 180, 'Ampharos': 181,
  'Bellossom': 182, 'Marill': 183, 'Azumarill': 184, 'Sudowoodo': 185, 'Politoed': 186, 'Hoppip': 187,
  'Skiploom': 188, 'Jumpluff': 189, 'Aipom': 190, 'Sunkern': 191, 'Sunflora': 192, 'Yanma': 193,
  'Wooper': 194, 'Quagsire': 195, 'Espeon': 196, 'Umbreon': 197, 'Murkrow': 198, 'Slowking': 199,
  'Misdreavus': 200, 'Unown': 201, 'Wobbuffet': 202, 'Girafarig': 203, 'Pineco': 204, 'Forretress': 205,
  'Dunsparce': 206, 'Gligar': 207, 'Steelix': 208, 'Snubbull': 209, 'Granbull': 210, 'Qwilfish': 211,
  'Scizor': 212, 'Shuckle': 213, 'Heracross': 214, 'Sneasel': 215, 'Teddiursa': 216, 'Ursaring': 217,
  'Slugma': 218, 'Magcargo': 219, 'Swinub': 220, 'Piloswine': 221, 'Corsola': 222, 'Remoraid': 223,
  'Octillery': 224, 'Delibird': 225, 'Mantine': 226, 'Skarmory': 227, 'Houndour': 228, 'Houndoom': 229,
  'Kingdra': 230, 'Phanpy': 231, 'Donphan': 232, 'Porygon2': 233, 'Stantler': 234, 'Smeargle': 235,
  'Tyrogue': 236, 'Hitmontop': 237, 'Smoochum': 238, 'Elekid': 239, 'Magby': 240, 'Miltank': 241,
  'Blissey': 242, 'Raikou': 243, 'Entei': 244, 'Suicune': 245, 'Larvitar': 246, 'Pupitar': 247,
  'Tyranitar': 248, 'Lugia': 249, 'Ho-Oh': 250, 'Celebi': 251,

  // Gen 3 (252-386)
  'Treecko': 252, 'Grovyle': 253, 'Sceptile': 254, 'Torchic': 255, 'Combusken': 256, 'Blaziken': 257,
  'Mudkip': 258, 'Marshtomp': 259, 'Swampert': 260, 'Poochyena': 261, 'Mightyena': 262, 'Zigzagoon': 263,
  'Linoone': 264, 'Wurmple': 265, 'Silcoon': 266, 'Beautifly': 267, 'Cascoon': 268, 'Dustox': 269,
  'Lotad': 270, 'Lombre': 271, 'Ludicolo': 272, 'Seedot': 273, 'Nuzleaf': 274, 'Shiftry': 275,
  'Taillow': 276, 'Swellow': 277, 'Wingull': 278, 'Pelipper': 279, 'Ralts': 280, 'Kirlia': 281,
  'Gardevoir': 282, 'Surskit': 283, 'Masquerain': 284, 'Shroomish': 285, 'Breloom': 286, 'Slakoth': 287,
  'Vigoroth': 288, 'Slaking': 289, 'Nincada': 290, 'Ninjask': 291, 'Shedinja': 292, 'Whismur': 293,
  'Loudred': 294, 'Exploud': 295, 'Makuhita': 296, 'Hariyama': 297, 'Azurill': 298, 'Nosepass': 299,
  'Skitty': 300, 'Delcatty': 301, 'Sableye': 302, 'Mawile': 303, 'Aron': 304, 'Lairon': 305,
  'Aggron': 306, 'Meditite': 307, 'Medicham': 308, 'Electrike': 309, 'Manectric': 310, 'Plusle': 311,
  'Minun': 312, 'Volbeat': 313, 'Illumise': 314, 'Roselia': 315, 'Gulpin': 316, 'Swalot': 317,
  'Carvanha': 318, 'Sharpedo': 319, 'Wailmer': 320, 'Wailord': 321, 'Numel': 322, 'Camerupt': 323,
  'Torkoal': 324, 'Spoink': 325, 'Grumpig': 326, 'Spinda': 327, 'Trapinch': 328, 'Vibrava': 329,
  'Flygon': 330, 'Cacnea': 331, 'Cacturne': 332, 'Swablu': 333, 'Altaria': 334, 'Zangoose': 335,
  'Seviper': 336, 'Lunatone': 337, 'Solrock': 338, 'Barboach': 339, 'Whiscash': 340, 'Corphish': 341,
  'Crawdaunt': 342, 'Baltoy': 343, 'Claydol': 344, 'Lileep': 345, 'Cradily': 346, 'Anorith': 347,
  'Armaldo': 348, 'Feebas': 349, 'Milotic': 350, 'Castform': 351, 'Kecleon': 352, 'Shuppet': 353,
  'Banette': 354, 'Duskull': 355, 'Dusclops': 356, 'Tropius': 357, 'Chimecho': 358, 'Absol': 359,
  'Wynaut': 360, 'Snorunt': 361, 'Glalie': 362, 'Spheal': 363, 'Sealeo': 364, 'Walrein': 365,
  'Clamperl': 366, 'Huntail': 367, 'Gorebyss': 368, 'Relicanth': 369, 'Luvdisc': 370, 'Bagon': 371,
  'Shelgon': 372, 'Salamence': 373, 'Beldum': 374, 'Metang': 375, 'Metagross': 376, 'Regirock': 377,
  'Regice': 378, 'Registeel': 379, 'Latias': 380, 'Latios': 381, 'Kyogre': 382, 'Groudon': 383,
  'Rayquaza': 384, 'Jirachi': 385, 'Deoxys': 386,

  // Gen 4 (387-493)
  'Turtwig': 387, 'Grotle': 388, 'Torterra': 389, 'Chimchar': 390, 'Monferno': 391, 'Infernape': 392,
  'Piplup': 393, 'Prinplup': 394, 'Empoleon': 395, 'Starly': 396, 'Staravia': 397, 'Staraptor': 398,
  'Bidoof': 399, 'Bibarel': 400, 'Kricketot': 401, 'Kricketune': 402, 'Shinx': 403, 'Luxio': 404,
  'Luxray': 405, 'Budew': 406, 'Roserade': 407, 'Cranidos': 408, 'Rampardos': 409, 'Shieldon': 410,
  'Bastiodon': 411, 'Burmy': 412, 'Wormadam': 413, 'Mothim': 414, 'Combee': 415, 'Vespiquen': 416,
  'Pachirisu': 417, 'Buizel': 418, 'Floatzel': 419, 'Cherubi': 420, 'Cherrim': 421, 'Shellos': 422,
  'Gastrodon': 423, 'Ambipom': 424, 'Drifloon': 425, 'Drifblim': 426, 'Buneary': 427, 'Lopunny': 428,
  'Mismagius': 429, 'Honchkrow': 430, 'Glameow': 431, 'Purugly': 432, 'Chingling': 433, 'Stunky': 434,
  'Skuntank': 435, 'Bronzor': 436, 'Bronzong': 437, 'Bonsly': 438, 'Mime Jr.': 439, 'Happiny': 440,
  'Chatot': 441, 'Spiritomb': 442, 'Gible': 443, 'Gabite': 444, 'Garchomp': 445, 'Munchlax': 446,
  'Riolu': 447, 'Lucario': 448, 'Hippopotas': 449, 'Hippowdon': 450, 'Skorupi': 451, 'Drapion': 452,
  'Croagunk': 453, 'Toxicroak': 454, 'Carnivine': 455, 'Finneon': 456, 'Lumineon': 457, 'Mantyke': 458,
  'Snover': 459, 'Abomasnow': 460, 'Weavile': 461, 'Magnezone': 462, 'Lickilicky': 463, 'Rhyperior': 464,
  'Tangrowth': 465, 'Electivire': 466, 'Magmortar': 467, 'Togekiss': 468, 'Yanmega': 469, 'Leafeon': 470,
  'Glaceon': 471, 'Gliscor': 472, 'Mamoswine': 473, 'Porygon-Z': 474, 'Gallade': 475, 'Probopass': 476,
  'Dusknoir': 477, 'Froslass': 478, 'Rotom': 479, 'Uxie': 480, 'Mesprit': 481, 'Azelf': 482,
  'Dialga': 483, 'Palkia': 484, 'Heatran': 485, 'Regigigas': 486, 'Giratina': 487, 'Cresselia': 488,
  'Phione': 489, 'Manaphy': 490, 'Darkrai': 491, 'Shaymin': 492, 'Arceus': 493,

  // Gen 5 (494-649)
  'Victini': 494, 'Snivy': 495, 'Servine': 496, 'Serperior': 497, 'Tepig': 498, 'Pignite': 499,
  'Emboar': 500, 'Oshawott': 501, 'Dewott': 502, 'Samurott': 503, 'Patrat': 504, 'Watchog': 505,
  'Lillipup': 506, 'Herdier': 507, 'Stoutland': 508, 'Purrloin': 509, 'Liepard': 510, 'Pansage': 511,
  'Simisage': 512, 'Pansear': 513, 'Simisear': 514, 'Panpour': 515, 'Simipour': 516, 'Munna': 517,
  'Musharna': 518, 'Pidove': 519, 'Tranquill': 520, 'Unfezant': 521, 'Blitzle': 522, 'Zebstrika': 523,
  'Roggenrola': 524, 'Boldore': 525, 'Gigalith': 526, 'Woobat': 527, 'Swoobat': 528, 'Drilbur': 529,
  'Excadrill': 530, 'Audino': 531, 'Timburr': 532, 'Gurdurr': 533, 'Conkeldurr': 534, 'Tympole': 535,
  'Palpitoad': 536, 'Seismitoad': 537, 'Throh': 538, 'Sawk': 539, 'Sewaddle': 540, 'Swadloon': 541,
  'Leavanny': 542, 'Venipede': 543, 'Whirlipede': 544, 'Scolipede': 545, 'Cottonee': 546, 'Whimsicott': 547,
  'Petilil': 548, 'Lilligant': 549, 'Basculin': 550, 'Sandile': 551, 'Krokorok': 552, 'Krookodile': 553,
  'Darumaka': 554, 'Darmanitan': 555, 'Maractus': 556, 'Dwebble': 557, 'Crustle': 558, 'Scraggy': 559,
  'Scrafty': 560, 'Sigilyph': 561, 'Yamask': 562, 'Cofagrigus': 563, 'Tirtouga': 564, 'Carracosta': 565,
  'Archen': 566, 'Archeops': 567, 'Trubbish': 568, 'Garbodor': 569, 'Zorua': 570, 'Zoroark': 571,
  'Minccino': 572, 'Cinccino': 573, 'Gothita': 574, 'Gothorita': 575, 'Gothitelle': 576, 'Solosis': 577,
  'Duosion': 578, 'Reuniclus': 579, 'Ducklett': 580, 'Swanna': 581, 'Vanillite': 582, 'Vanillish': 583,
  'Vanilluxe': 584, 'Deerling': 585, 'Sawsbuck': 586, 'Emolga': 587, 'Karrablast': 588, 'Escavalier': 589,
  'Foongus': 590, 'Amoonguss': 591, 'Frillish': 592, 'Jellicent': 593, 'Alomomola': 594, 'Joltik': 595,
  'Galvantula': 596, 'Ferroseed': 597, 'Ferrothorn': 598, 'Klink': 599, 'Klang': 600, 'Klinklang': 601,
  'Tynamo': 602, 'Eelektrik': 603, 'Eelektross': 604, 'Elgyem': 605, 'Beheeyem': 606, 'Litwick': 607,
  'Lampent': 608, 'Chandelure': 609, 'Axew': 610, 'Fraxure': 611, 'Haxorus': 612, 'Cubchoo': 613,
  'Beartic': 614, 'Cryogonal': 615, 'Shelmet': 616, 'Accelgor': 617, 'Stunfisk': 618, 'Mienfoo': 619,
  'Mienshao': 620, 'Druddigon': 621, 'Golett': 622, 'Golurk': 623, 'Pawniard': 624, 'Bisharp': 625,
  'Bouffalant': 626, 'Rufflet': 627, 'Braviary': 628, 'Vullaby': 629, 'Mandibuzz': 630, 'Heatmor': 631,
  'Durant': 632, 'Deino': 633, 'Zweilous': 634, 'Hydreigon': 635, 'Larvesta': 636, 'Volcarona': 637,
  'Cobalion': 638, 'Terrakion': 639, 'Virizion': 640, 'Tornadus': 641, 'Thundurus': 642, 'Reshiram': 643,
  'Zekrom': 644, 'Landorus': 645, 'Kyurem': 646, 'Keldeo': 647, 'Meloetta': 648, 'Genesect': 649,

  // Gen 6 (650-721)
  'Chespin': 650, 'Quilladin': 651, 'Chesnaught': 652, 'Fennekin': 653, 'Braixen': 654, 'Delphox': 655,
  'Froakie': 656, 'Frogadier': 657, 'Greninja': 658, 'Bunnelby': 659, 'Diggersby': 660, 'Fletchling': 661,
  'Fletchinder': 662, 'Talonflame': 663, 'Scatterbug': 664, 'Spewpa': 665, 'Vivillon': 666, 'Litleo': 667,
  'Pyroar': 668, 'Flabébé': 669, 'Floette': 670, 'Florges': 671, 'Skiddo': 672, 'Gogoat': 673,
  'Pancham': 674, 'Pangoro': 675, 'Furfrou': 676, 'Espurr': 677, 'Meowstic': 678, 'Honedge': 679,
  'Doublade': 680, 'Aegislash': 681, 'Spritzee': 682, 'Aromatisse': 683, 'Swirlix': 684, 'Slurpuff': 685,
  'Inkay': 686, 'Malamar': 687, 'Binacle': 688, 'Barbaracle': 689, 'Skrelp': 690, 'Dragalge': 691,
  'Clauncher': 692, 'Clawitzer': 693, 'Helioptile': 694, 'Heliolisk': 695, 'Tyrunt': 696, 'Tyrantrum': 697,
  'Amaura': 698, 'Aurorus': 699, 'Sylveon': 700, 'Hawlucha': 701, 'Dedenne': 702, 'Carbink': 703,
  'Goomy': 704, 'Sliggoo': 705, 'Goodra': 706, 'Klefki': 707, 'Phantump': 708, 'Trevenant': 709,
  'Pumpkaboo': 710, 'Gourgeist': 711, 'Bergmite': 712, 'Avalugg': 713, 'Noibat': 714, 'Noivern': 715,
  'Xerneas': 716, 'Yveltal': 717, 'Zygarde': 718, 'Diancie': 719, 'Hoopa': 720, 'Volcanion': 721,

  // Gen 7 (722-809)
  'Rowlet': 722, 'Dartrix': 723, 'Decidueye': 724, 'Litten': 725, 'Torracat': 726, 'Incineroar': 727,
  'Popplio': 728, 'Brionne': 729, 'Primarina': 730, 'Pikipek': 731, 'Trumbeak': 732, 'Toucannon': 733,
  'Yungoos': 734, 'Gumshoos': 735, 'Grubbin': 736, 'Charjabug': 737, 'Vikavolt': 738, 'Crabrawler': 739,
  'Crabominable': 740, 'Oricorio': 741, 'Cutiefly': 742, 'Ribombee': 743, 'Rockruff': 744, 'Lycanroc': 745,
  'Wishiwashi': 746, 'Mareanie': 747, 'Toxapex': 748, 'Mudbray': 749, 'Mudsdale': 750, 'Dewpider': 751,
  'Araquanid': 752, 'Fomantis': 753, 'Lurantis': 754, 'Morelull': 755, 'Shiinotic': 756, 'Salandit': 757,
  'Salazzle': 758, 'Stufful': 759, 'Bewear': 760, 'Bounsweet': 761, 'Steenee': 762, 'Tsareena': 763,
  'Comfey': 764, 'Oranguru': 765, 'Passimian': 766, 'Wimpod': 767, 'Golisopod': 768, 'Sandygast': 769,
  'Palossand': 770, 'Pyukumuku': 771, 'Type: Null': 772, 'Silvally': 773, 'Minior': 774, 'Komala': 775,
  'Turtonator': 776, 'Togedemaru': 777, 'Mimikyu': 778, 'Bruxish': 779, 'Drampa': 780, 'Dhelmise': 781,
  'Jangmo-o': 782, 'Hakamo-o': 783, 'Kommo-o': 784, 'Tapu Koko': 785, 'Tapu Lele': 786, 'Tapu Bulu': 787,
  'Tapu Fini': 788, 'Cosmog': 789, 'Cosmoem': 790, 'Solgaleo': 791, 'Lunala': 792, 'Necrozma': 793,
  'Magearna': 794, 'Marshadow': 795, 'Poipole': 796, 'Naganadel': 797, 'Stakataka': 798, 'Blacephalon': 799,
  'Zeraora': 800, 'Meltan': 801, 'Melmetal': 802,

  // Gen 8 (810-905)
  'Grookey': 810, 'Thwackey': 811, 'Rillaboom': 812, 'Scorbunny': 813, 'Raboot': 814, 'Cinderace': 815,
  'Sobble': 816, 'Drizzile': 817, 'Inteleon': 818, 'Skwovet': 819, 'Greedent': 820, 'Rookidee': 821,
  'Corvisquire': 822, 'Corviknight': 823, 'Blipbug': 824, 'Dottler': 825, 'Orbeetle': 826, 'Nickit': 827,
  'Thievul': 828, 'Gossifleur': 829, 'Eldegoss': 830, 'Wooloo': 831, 'Dubwool': 832, 'Chewtle': 833,
  'Drednaw': 834, 'Yamper': 835, 'Boltund': 836, 'Rolycoly': 837, 'Carkol': 838, 'Coalossal': 839,
  'Applin': 840, 'Flapple': 841, 'Appletun': 842, 'Silicobra': 843, 'Sandaconda': 844, 'Cramorant': 845,
  'Arrokuda': 846, 'Barraskewda': 847, 'Toxel': 848, 'Toxtricity': 849, 'Sizzlipede': 850, 'Centiskorch': 851,
  'Clobbopus': 852, 'Grapploct': 853, 'Sinistea': 854, 'Polteageist': 855, 'Hatenna': 856, 'Hattrem': 857,
  'Hatterene': 858, 'Impidimp': 859, 'Morgrem': 860, 'Grimmsnarl': 861, 'Obstagoon': 862, 'Perrserker': 863,
  'Cursola': 864, 'Sirfetch\'d': 865, 'Mr. Rime': 866, 'Runerigus': 867, 'Milcery': 868, 'Alcremie': 869,
  'Falinks': 870, 'Pincurchin': 871, 'Snom': 872, 'Frosmoth': 873, 'Stonjourner': 874, 'Eiscue': 875,
  'Indeedee': 876, 'Morpeko': 877, 'Cufant': 878, 'Copperajah': 879, 'Dracozolt': 880, 'Arctozolt': 881,
  'Dracovish': 882, 'Arctovish': 883, 'Duraludon': 884, 'Dreepy': 885, 'Drakloak': 886, 'Dragapult': 887,
  'Zacian': 888, 'Zamazenta': 889, 'Eternatus': 890, 'Kubfu': 891, 'Urshifu': 892, 'Zarude': 893,
  'Regieleki': 894, 'Regidrago': 895, 'Glastrier': 896, 'Spectrier': 897, 'Calyrex': 898, 'Wyrdeer': 899,
  'Kleavor': 900, 'Ursaluna': 901, 'Basculegion': 902, 'Sneasler': 903, 'Overqwil': 904, 'Enamorus': 905,

  // Gen 9 (906-1010+)
  'Sprigatito': 906, 'Floragato': 907, 'Meowscarada': 908, 'Fuecoco': 909, 'Crocalor': 910, 'Skeledirge': 911,
  'Quaxly': 912, 'Quaxwell': 913, 'Quaquaval': 914, 'Lechonk': 915, 'Oinkologne': 916, 'Tarountula': 917,
  'Spidops': 918, 'Nymble': 919, 'Lokix': 920, 'Pawmi': 921, 'Pawmo': 922, 'Pawmot': 923,
  'Tandemaus': 924, 'Maushold': 925, 'Fidough': 926, 'Dachsbun': 927, 'Smoliv': 928, 'Dolliv': 929,
  'Arboliva': 930, 'Squawkabilly': 931, 'Nacli': 932, 'Naclstack': 933, 'Garganacl': 934, 'Charcadet': 935,
  'Armarouge': 936, 'Ceruledge': 937, 'Tadbulb': 938, 'Bellibolt': 939, 'Wattrel': 940, 'Kilowattrel': 941,
  'Maschiff': 942, 'Mabosstiff': 943, 'Shroodle': 944, 'Grafaiai': 945, 'Bramblin': 946, 'Brambleghast': 947,
  'Toedscool': 948, 'Toedscruel': 949, 'Klawf': 950, 'Capsakid': 951, 'Scovillain': 952, 'Rellor': 953,
  'Rabsca': 954, 'Flittle': 955, 'Espathra': 956, 'Tinkatink': 957, 'Tinkaton': 958, 'Wiglett': 959,
  'Wugtrio': 960, 'Bombirdier': 961, 'Finizen': 962, 'Palafin': 963, 'Varoom': 964, 'Revavroom': 965,
  'Cyclizar': 966, 'Orthworm': 967, 'Glimmet': 968, 'Glimmora': 969, 'Greavard': 970, 'Houndstone': 971,
  'Flamigo': 972, 'Cetoddle': 973, 'Cetitan': 974, 'Veluza': 975, 'Dondozo': 976, 'Tatsugiri': 977,
  'Annihilape': 978, 'Clodsire': 979, 'Farigiraf': 980, 'Dudunsparce': 981, 'Kingambit': 982, 'Great Tusk': 983,
  'Scream Tail': 984, 'Brute Bonnet': 985, 'Flutter Mane': 986, 'Slither Wing': 987, 'Sandy Shocks': 988,
  'Iron Treads': 989, 'Iron Bundle': 990, 'Iron Hands': 991, 'Iron Jugulis': 992, 'Iron Moth': 993,
  'Iron Thorns': 994, 'Frigibax': 995, 'Arctibax': 996, 'Baxcalibur': 997, 'Gimmighoul': 998, 'Gholdengo': 999,
  'Wo-Chien': 1000, 'Chien-Pao': 1001, 'Ting-Lu': 1002, 'Chi-Yu': 1003, 'Roaring Moon': 1005, 'Iron Valiant': 1006,
  'Koraidon': 1007, 'Miraidon': 1008, 'Walking Wake': 1009, 'Iron Leaves': 1010, 'Dipplin': 1011, 'Poltchageist': 1012,
  'Sinistcha': 1013, 'Okidogi': 1014, 'Munkidori': 1015, 'Fezandipiti': 1016, 'Ogerpon': 1017, 'Archaludon': 1018,
  'Hydrapple': 1019, 'Gouging Fire': 1020, 'Raging Bolt': 1021, 'Iron Boulder': 1022, 'Iron Crown': 1023,
  'Terapagos': 1024, 'Pecharunt': 1025,

  // Common alternate forms and names
  'Calyrex-Shadow': 898, 'Calyrex-Ice': 898, 'Urshifu-Single': 892, 'Urshifu-Rapid': 892, 'Urshifu-Rapid-Strike': 892,
  'Tornadus-Incarnate': 641, 'Tornadus-Therian': 641, 'Thundurus-Incarnate': 642, 'Thundurus-Therian': 642,
  'Landorus-Incarnate': 645, 'Landorus-Therian': 645, 'Rotom-Heat': 479, 'Rotom-Wash': 479,
  'Rotom-Frost': 479, 'Rotom-Fan': 479, 'Rotom-Mow': 479, 'Ogerpon-Wellspring': 1016, 'Ogerpon-Hearthflame': 1016,
  'Ogerpon-Cornerstone': 1016
};

// Comprehensive Held Item mapping for sprite URLs and IDs
const HELD_ITEM_MAP: { [key: string]: string } = {
  // Choice Items
  'Choice Band': 'choice-band',
  'Choice Scarf': 'choice-scarf',  
  'Choice Specs': 'choice-specs',
  
  // Assault Vest and Leftovers
  'Assault Vest': 'assault-vest',
  'Leftovers': 'leftovers',
  
  // Life Orb and Expert Belt
  'Life Orb': 'life-orb',
  'Expert Belt': 'expert-belt',
  
  // Focus Items
  'Focus Sash': 'focus-sash',
  'Focus Band': 'focus-band',
  
  // Berries (Common VGC ones)
  'Sitrus Berry': 'sitrus-berry',
  'Figy Berry': 'figy-berry',
  'Wiki Berry': 'wiki-berry',
  'Mago Berry': 'mago-berry',
  'Aguav Berry': 'aguav-berry',
  'Iapapa Berry': 'iapapa-berry',
  'Lum Berry': 'lum-berry',
  'Chesto Berry': 'chesto-berry',
  'Cheri Berry': 'cheri-berry',
  'Pecha Berry': 'pecha-berry',
  'Rawst Berry': 'rawst-berry',
  'Aspear Berry': 'aspear-berry',
  'Persim Berry': 'persim-berry',
  'Mental Herb': 'mental-herb',
  
  // Safety Items
  'Safety Goggles': 'safety-goggles',
  'Clear Amulet': 'clear-amulet',
  'Covert Cloak': 'covert-cloak',
  
  // Rocky Helmet and similar
  'Rocky Helmet': 'rocky-helmet',
  'Flame Orb': 'flame-orb',
  'Toxic Orb': 'toxic-orb',
  
  // Booster Energy and Room Service
  'Booster Energy': 'booster-energy',
  'Room Service': 'room-service',
  
  // Weakness Policy and similar
  'Weakness Policy': 'weakness-policy',
  'Air Balloon': 'air-balloon',
  
  // Seeds and Terrain items
  'Electric Seed': 'electric-seed',
  'Grassy Seed': 'grassy-seed',
  'Misty Seed': 'misty-seed',
  'Psychic Seed': 'psychic-seed',
  
  // Eviolite
  'Eviolite': 'eviolite',
  
  // Mega Stones (if applicable)
  'Charizardite Y': 'charizardite-y',
  'Charizardite X': 'charizardite-x',
  'Venusaurite': 'venusaurite',
  'Blastoisinite': 'blastoisinite',
  
  // Z-Crystals (if applicable)
  'Normalium Z': 'normalium-z',
  'Fightinium Z': 'fightinium-z',
  'Flyinium Z': 'flyinium-z',
  'Poisonium Z': 'poisonium-z',
  'Groundium Z': 'groundium-z',
  'Rockium Z': 'rockium-z',
  'Buginium Z': 'buginium-z',
  'Ghostium Z': 'ghostium-z',
  'Steelium Z': 'steelium-z',
  'Firium Z': 'firium-z',
  'Waterium Z': 'waterium-z',
  'Grassium Z': 'grassium-z',
  'Electrium Z': 'electrium-z',
  'Psychium Z': 'psychium-z',
  'Icium Z': 'icium-z',
  'Dragonium Z': 'dragonium-z',
  'Darkinium Z': 'darkinium-z',
  'Fairium Z': 'fairium-z',
  
  // Type-enhancing items
  'Black Belt': 'black-belt',
  'Black Glasses': 'black-glasses',
  'Charcoal': 'charcoal',
  'Dragon Fang': 'dragon-fang',
  'Hard Stone': 'hard-stone',
  'Magnet': 'magnet',
  'Metal Coat': 'metal-coat',
  'Miracle Seed': 'miracle-seed',
  'Mystic Water': 'mystic-water',
  'Never-Melt Ice': 'never-melt-ice',
  'Pink Bow': 'pink-bow',
  'Poison Barb': 'poison-barb',
  'Sharp Beak': 'sharp-beak',
  'Silk Scarf': 'silk-scarf',
  'Silver Powder': 'silver-powder',
  'Soft Sand': 'soft-sand',
  'Spell Tag': 'spell-tag',
  'Twisted Spoon': 'twisted-spoon',
  
  // Terrain Extender and similar
  'Terrain Extender': 'terrain-extender',
  'Heat Rock': 'heat-rock',
  'Damp Rock': 'damp-rock',
  'Smooth Rock': 'smooth-rock',
  'Icy Rock': 'icy-rock',
  
  // Mirror Herb and other new items
  'Mirror Herb': 'mirror-herb',
  'Loaded Dice': 'loaded-dice',
  
  // Wide Lens and Zoom Lens
  'Wide Lens': 'wide-lens',
  'Zoom Lens': 'zoom-lens',
  
  // King's Rock and similar
  'King\'s Rock': 'kings-rock',
  'Razor Fang': 'razor-fang',
  
  // Muscle Band and Wise Glasses
  'Muscle Band': 'muscle-band',
  'Wise Glasses': 'wise-glasses',
  
  // Additional VGC items
  'Throat Spray': 'throat-spray',
  'Power Herb': 'power-herb',
  'White Herb': 'white-herb',
  'Red Card': 'red-card',
  'Eject Button': 'eject-button',
  'Iron Ball': 'iron-ball',
  'Quick Claw': 'quick-claw',
  'Scope Lens': 'scope-lens',
  'Bright Powder': 'bright-powder',
  'Lax Incense': 'lax-incense',
  
  // Legendary items
  'Rusted Shield': 'rusted-shield',
  'Rusted Sword': 'rusted-sword'
};

// Get item sprite URL using Serebii (most comprehensive item collection)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getItemSpriteUrl = async (itemName: string): Promise<string | null> => {
  const itemSlug = HELD_ITEM_MAP[itemName];
  if (!itemSlug) {
    console.warn(`Item not found in HELD_ITEM_MAP: "${itemName}"`);
    return null;
  }
  
  // Serebii has the most comprehensive item collection including newer items
  return `https://www.serebii.net/itemdex/sprites/${itemSlug.replace(/-/g, '')}.png`;
};

// Synchronous version for backward compatibility
const getItemSpriteUrlSync = (itemName: string): string | null => {
  const itemSlug = HELD_ITEM_MAP[itemName];
  if (!itemSlug) {
    console.warn(`Item not found in HELD_ITEM_MAP: "${itemName}"`);
    return null;
  }
  
  // Use Serebii as primary source (has the most comprehensive item collection)
  return `https://www.serebii.net/itemdex/sprites/${itemSlug.replace(/-/g, '')}.png`;
};

// Get Pokemon sprite URL using PokemonDB as primary source with PokeAPI fallback
const getPokemonSpriteUrl = (pokemonName: string): string | null => {
  // Get the base Pokemon ID for fallback
  let pokemonId = POKEMON_ID_MAP[pokemonName] || POKEMON_ID_MAP[pokemonName.replace(/[-\s]/g, '')] || 0;
  
  // If not found, try common alternate forms
  if (pokemonId === 0) {
    const alternateNames = [
      pokemonName + '-Incarnate',
      pokemonName + '-Therian',
      pokemonName.replace('-Incarnate', ''),
      pokemonName.replace('-Therian', ''),
    ];
    
    for (const altName of alternateNames) {
      if (POKEMON_ID_MAP[altName]) {
        pokemonId = POKEMON_ID_MAP[altName];
        break;
      }
    }
  }
  
  // Create a mapping for Pokemon forms to PokemonDB sprite names
  const pokemonFormMap: { [key: string]: string } = {
    // Calyrex forms
    'Calyrex-Shadow': 'calyrex-shadow-rider',
    'Calyrex-Ice': 'calyrex-ice-rider',
    
    // Urshifu forms
    'Urshifu-Single': 'urshifu-single-strike',
    'Urshifu-Rapid': 'urshifu-rapid-strike',
    'Urshifu-Rapid-Strike': 'urshifu-rapid-strike',
    
    // Therian/Incarnate forms
    'Tornadus-Incarnate': 'tornadus-incarnate',
    'Tornadus-Therian': 'tornadus-therian',
    'Thundurus-Incarnate': 'thundurus-incarnate',
    'Thundurus-Therian': 'thundurus-therian',
    'Landorus-Incarnate': 'landorus-incarnate',
    'Landorus-Therian': 'landorus-therian',
    
    // Rotom forms
    'Rotom-Heat': 'rotom-heat',
    'Rotom-Wash': 'rotom-wash',
    'Rotom-Frost': 'rotom-frost',
    'Rotom-Fan': 'rotom-fan',
    'Rotom-Mow': 'rotom-mow',
    
    // Maushold forms (both forms use the same base sprite)
    'Maushold-Four': 'maushold',
    'Maushold-Three': 'maushold',
    
    // Ursaluna forms
    'Ursaluna-Bloodmoon': 'ursaluna-bloodmoon',
    
    // Add more forms as needed
  };
  
  const formSlug = pokemonFormMap[pokemonName];
  if (formSlug) {
    // Use PokemonDB for specific forms (much better quality)
    return `https://img.pokemondb.net/sprites/home/normal/${formSlug}.png`;
  }
  
  // For base forms, also try PokemonDB first, then fall back to PokeAPI
  if (pokemonId > 0) {
    // Convert Pokemon name to lowercase with hyphens for PokemonDB
    const pokemonSlug = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `https://img.pokemondb.net/sprites/home/normal/${pokemonSlug}.png`;
  }
  
  // Final fallback to PokeAPI
  return null;
};

// Test function to verify Pokemon and item parsing
// Call this from browser console: window.testPokemonItemParsing()
const testPokemonItemParsing = () => {
  console.log('=== Testing Pokemon Form Sprites ===');
  const testForms = [
    'Calyrex-Shadow',
    'Calyrex-Ice',
    'Tornadus-Therian',
    'Landorus-Therian',
    'Urshifu-Rapid',
    'Urshifu-Single',
    'Rotom-Wash',
    'Rotom-Heat'
  ];
  
  testForms.forEach(form => {
    const pokemonDBUrl = getPokemonSpriteUrl(form);
    console.log(`${form}: ${pokemonDBUrl || 'No PokemonDB sprite found'}`);
  });
  
  console.log('=== Testing Pokemon ID Lookup ===');
  const testCases = [
    'Tornadus',
    'Tornadus-Therian',
    'Tornadus-Incarnate', 
    'Zamazenta',
    'Landorus-Therian',
    'Charizard'
  ];
  
  console.log('=== Testing Pokemon ID Lookup ===');
  testCases.forEach(pokemon => {
    const directLookup = POKEMON_ID_MAP[pokemon];
    const fallbackLookup = POKEMON_ID_MAP[pokemon.replace(/[-\s]/g, '')];
    
    let enhancedLookup = directLookup || fallbackLookup || 0;
    if (enhancedLookup === 0) {
      const alternateNames = [
        pokemon + '-Incarnate',
        pokemon + '-Therian',
        pokemon.replace('-Incarnate', ''),
        pokemon.replace('-Therian', ''),
      ];
      for (const altName of alternateNames) {
        if (POKEMON_ID_MAP[altName]) {
          enhancedLookup = POKEMON_ID_MAP[altName];
          break;
        }
      }
    }
    
    console.log(`${pokemon}: direct=${directLookup}, fallback=${fallbackLookup}, enhanced=${enhancedLookup}`);
  });

  const testContent = `
## Team Composition (6 Pokemon)

**Space-Ghost (Calyrex-Shadow)** @ Life Orb  
**Mr.Pickles (Zamazenta)** @ Rusted Shield  
**Pablo (Smeargle)** @ Focus Sash  
**Gust (Tornadus)** @ Covert Cloak  
**Sparky (Raging Bolt)** @ Assault Vest  
**Monke (Rillaboom)** @ Life Orb  
  `;
  
  console.log('=== Testing Item Parsing ===');
  const result = extractTeamPokemonWithItems(testContent);
  console.log('Parsed team with items:', result);
};

// New function to parse pokepaste format
const parsePokepasteFormat = (content: string): Array<{pokemon: string, item: string | null, details?: any}> => {
  const teamData: Array<{pokemon: string, item: string | null, details?: any}> = [];
  const lines = content.split('\n');
  
  let currentPokemon: any = null;
  
  for (let i = 0; i < lines.length && teamData.length < 6; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Look for Pokemon @ Item format (start of new Pokemon)
    // Pokemon names can have letters, numbers, spaces, and hyphens: "Flutter Mane", "Calyrex-Shadow", "Ho-Oh"
    const pokemonMatch = line.match(/^([A-Za-z][A-Za-z0-9]*(?:[-\s][A-Za-z][A-Za-z0-9]*)*)\s*@\s*(.+)$/);
    if (pokemonMatch) {
      // Save previous Pokemon if exists
      if (currentPokemon) {
        teamData.push(currentPokemon);
      }
      
      // Start new Pokemon
      const pokemonName = pokemonMatch[1].trim();
      const itemName = pokemonMatch[2].trim();
      
      // Validate Pokemon name exists in our mapping
      let finalPokemonName = pokemonName;
      if (!POKEMON_ID_MAP[pokemonName]) {
        const found = Object.keys(POKEMON_ID_MAP).find(p => 
          p.toLowerCase() === pokemonName.toLowerCase());
        if (found) {
          finalPokemonName = found;
        }
      }
      
      currentPokemon = {
        pokemon: finalPokemonName,
        item: itemName,
        details: {
          ability: '',
          level: '',
          shiny: false,
          teraType: '',
          evs: '',
          nature: '',
          ivs: '',
          moves: []
        }
      };
      continue;
    }
    
    // If we have a current Pokemon, parse its details
    if (currentPokemon) {
      // Parse Ability
      if (line.startsWith('Ability:')) {
        currentPokemon.details.ability = line.replace('Ability:', '').trim();
      }
      // Skip Level parsing - we don't want to display Level: 50
      else if (line.startsWith('Level:')) {
        // Skip level parsing
        continue;
      }
      // Parse Shiny
      else if (line.startsWith('Shiny:')) {
        currentPokemon.details.shiny = line.replace('Shiny:', '').trim().toLowerCase() === 'yes';
      }
      // Parse Tera Type
      else if (line.startsWith('Tera Type:')) {
        currentPokemon.details.teraType = line.replace('Tera Type:', '').trim();
      }
      // Parse EVs
      else if (line.startsWith('EVs:')) {
        currentPokemon.details.evs = line.replace('EVs:', '').trim();
      }
      // Parse Nature
      else if (line.endsWith(' Nature') || line.includes(' Nature')) {
        currentPokemon.details.nature = line.replace(' Nature', '').trim();
      }
      // Parse IVs
      else if (line.startsWith('IVs:')) {
        currentPokemon.details.ivs = line.replace('IVs:', '').trim();
      }
      // Parse Moves (lines starting with -)
      else if (line.startsWith('-')) {
        const move = line.replace(/^-\s*/, '').trim();
        if (move) {
          currentPokemon.details.moves.push(move);
        }
      }
    }
  }
  
  // Add the last Pokemon if exists
  if (currentPokemon) {
    teamData.push(currentPokemon);
  }
  
  return teamData;
};

// Convert pokepaste format to app's markdown format
const convertPokepasteToMarkdown = (pokepasteContent: string): string => {
  try {
    const pokepasteData = parsePokepasteFormat(pokepasteContent);
    
    if (pokepasteData.length === 0) {
      return pokepasteContent; // Return original if no pokepaste detected
    }
    
    let markdownContent = '## Team Composition (6 Pokemon)\n\n';
    
    pokepasteData.forEach((pokemon, index) => {
      markdownContent += `**${pokemon.pokemon}** @ ${pokemon.item || 'No Item'}\n`;
      
      if (pokemon.details) {
        const parts = [];
        if (pokemon.details.ability) parts.push(`Ability: ${pokemon.details.ability}`);
        if (pokemon.details.teraType) parts.push(`Tera: ${pokemon.details.teraType}`);
        
        if (parts.length > 0) {
          markdownContent += `${parts.join(' | ')}\n`;
        }
        
        if (pokemon.details.evs && pokemon.details.nature) {
          markdownContent += `EVs: ${pokemon.details.evs} | ${pokemon.details.nature}\n`;
        } else if (pokemon.details.evs) {
          markdownContent += `EVs: ${pokemon.details.evs}\n`;
        } else if (pokemon.details.nature) {
          markdownContent += `Nature: ${pokemon.details.nature}\n`;
        }
        
        if (pokemon.details.moves && pokemon.details.moves.length > 0) {
          pokemon.details.moves.forEach((move: string) => {
            markdownContent += `- ${move}\n`;
          });
        }
      }
      
      markdownContent += '\n';
    });
    
    markdownContent += `\n## Gameplan\n\n[Add your strategy here]\n\n`;
    markdownContent += `## Key Matchups\n\n### vs [Opponent]\n\n**Strategy:** [Your strategy]\n\n`;
    
    return markdownContent;
  } catch (error) {
    console.error('Error converting pokepaste to markdown:', error);
    return pokepasteContent;
  }
};

// Detect and auto-convert pokepaste content when pasted
const handleContentPaste = (content: string): string => {
  // Check if content looks like pokepaste format
  const lines = content.split('\n');
  let pokemonLineCount = 0;
  let detailLineCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for pokepaste Pokemon @ Item lines (without markdown **)
    if (line.match(/^[A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)*\s*@\s*.+$/) && !line.startsWith('**')) {
      pokemonLineCount++;
      // Check next few lines for pokepaste format indicators
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('Ability:') || nextLine.startsWith('EVs:') || 
            nextLine.startsWith('Tera Type:') || nextLine.endsWith(' Nature') ||
            nextLine.startsWith('Level:') || nextLine.startsWith('IVs:') ||
            nextLine.startsWith('Shiny:')) {
          detailLineCount++;
          break;
        }
      }
    }
  }
  
  // Consider it pokepaste format if we have at least 1 Pokemon line with details (more lenient for paste)
  const hasPokepasteFormat = pokemonLineCount >= 1 && detailLineCount >= 1;
  
  if (hasPokepasteFormat) {
    console.log('Pokepaste format detected, converting to markdown...');
    return convertPokepasteToMarkdown(content);
  }
  
  return content;
};

// Enhanced version that handles both markdown format and pokepaste format
const extractTeamPokemonWithItems = (content: string): Array<{pokemon: string, item: string | null}> => {
  try {
    // First try to detect if this is pokepaste format
    const lines = content.split('\n');
    let hasPokepasteFormat = false;
    let hasMarkdownFormat = false;
    
    // Look for pokepaste indicators: Pokemon @ Item without markdown formatting
    // and presence of lines starting with "Ability:", "EVs:", etc.
    let pokemonLineCount = 0;
    let detailLineCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for pokepaste Pokemon @ Item lines (without markdown **)
      if (line.match(/^[A-Za-z][A-Za-z0-9]*(?:[-\s][A-Za-z][A-Za-z0-9]*)*\s*@\s*.+$/) && !line.startsWith('**')) {
        pokemonLineCount++;
        // Check next few lines for pokepaste format indicators
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('Ability:') || nextLine.startsWith('EVs:') || 
              nextLine.startsWith('Tera Type:') || nextLine.endsWith(' Nature') ||
              nextLine.startsWith('Level:') || nextLine.startsWith('IVs:') ||
              nextLine.startsWith('Shiny:')) {
            detailLineCount++;
            break;
          }
        }
      }
      
      // Check for markdown format (but exclude "My Team:" lines)
      if (line.match(/^\*\*([^*]+)\*\*\s*@\s*([^\n\r]+)/) && !line.toLowerCase().includes('my team:')) {
        hasMarkdownFormat = true;
      }
    }
    
    // Consider it pokepaste format if we have at least 1 Pokemon line with details
    hasPokepasteFormat = pokemonLineCount >= 1 && detailLineCount >= 1;
    
    console.log(`Pokemon extraction debug: pokemonLineCount=${pokemonLineCount}, detailLineCount=${detailLineCount}, hasMarkdownFormat=${hasMarkdownFormat}, hasPokepasteFormat=${hasPokepasteFormat}`);
    
    // If we detect pokepaste format, use the new parser
    if (hasPokepasteFormat && !hasMarkdownFormat) {
      console.log('Detected pokepaste format, using pokepaste parser');
      const pokepasteData = parsePokepasteFormat(content);
      console.log('Pokepaste parser result:', pokepasteData);
      return pokepasteData.map(pokemon => ({
        pokemon: pokemon.pokemon,
        item: pokemon.item
      }));
    }
    
    // Original markdown parsing logic (keeping existing functionality intact)
    const teamData: Array<{pokemon: string, item: string | null}> = [];
    
    let inTeamSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('Team Composition') || line.includes('## Team')) {
        inTeamSection = true;
        continue;
      }
      
      if (inTeamSection && line.startsWith('##') && !line.includes('Team')) {
        break; // End of team section
      }
      
      if (inTeamSection) {
        // Look for Pokemon names with held items: **Pokemon Name** @ Item Name or **Nickname** (Pokemon Name) @ Item Name
        // Handle various spacing and formatting variations
        const pokemonWithItemMatch = line.match(/^\*\*([^*]+)\*\*\s*@\s*([^\n\r]+)/);
        if (pokemonWithItemMatch) {
          let pokemonName = pokemonWithItemMatch[1].trim();
          let itemName = pokemonWithItemMatch[2].trim();
          
          // Clean up item name - remove anything after line breaks or extra content
          itemName = itemName.split(/[\n\r]/)[0].trim();
          
          // Handle nickname format: "Nickname (Actual Pokemon Name)"
          const nicknameMatch = pokemonName.match(/^[^(]+\(([^)]+)\)$/);
          if (nicknameMatch) {
            pokemonName = nicknameMatch[1].trim();
          }
          
          // Validate Pokemon name exists in our mapping and find correct form
          let finalPokemonName = pokemonName;
          const pokemonId = POKEMON_ID_MAP[pokemonName] || POKEMON_ID_MAP[pokemonName.replace(/[-\s]/g, '')] || 0;
          if (pokemonId === 0) {
            // Try to find a close match for common forms
            const alternateNames = [
              pokemonName + '-Incarnate',
              pokemonName + '-Therian',
              pokemonName.replace('-Incarnate', ''),
              pokemonName.replace('-Therian', ''),
            ];
            for (const altName of alternateNames) {
              if (POKEMON_ID_MAP[altName]) {
                finalPokemonName = altName;
                break;
              }
            }
          }
          
          if (finalPokemonName && teamData.length < 6) {
            teamData.push({
              pokemon: finalPokemonName,
              item: itemName
            });
          }
        }
        // Handle Pokemon without items: **Pokemon Name** or **Nickname** (Pokemon Name)
        else {
          const pokemonOnlyMatch = line.match(/^\*\*([^*]+)\*\*/);
          if (pokemonOnlyMatch) {
            let pokemonName = pokemonOnlyMatch[1].trim();
            
            // Handle nickname format
            const nicknameMatch = pokemonName.match(/^[^(]+\(([^)]+)\)$/);
            if (nicknameMatch) {
              pokemonName = nicknameMatch[1].trim();
            }
            
            if (pokemonName && teamData.length < 6) {
              teamData.push({
                pokemon: pokemonName,
                item: null
              });
            }
          }
        }
      }
    }
    
    return teamData;
  } catch (error) {
    console.error('Error parsing team with items:', error);
    return [];
  }
};

// Extract opponent team with items from pokepaste content or matchup section
const extractOpponentTeamWithItems = (content: string, matchupName?: string): Array<{pokemon: string, item: string | null}> => {
  try {
    const lines = content.split('\n');
    const opponentData: Array<{pokemon: string, item: string | null}> = [];
    
    // If matchup name is provided, look specifically in that matchup section
    if (matchupName) {
      let inMatchupSection = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Find the specific main matchup section
        if ((line.startsWith('### vs ') || line.startsWith('## vs ')) && 
            line.toLowerCase().includes(matchupName.toLowerCase())) {
          inMatchupSection = true;
          console.log(`Found matchup section: "${line}"`);
          continue;
        }
        
        // Stop if we hit another main matchup section or major section
        if (inMatchupSection && (
            (line.startsWith('### vs ') || line.startsWith('## vs ')) ||
            (line.startsWith('## ') && !line.includes('vs ') && !line.includes('Gameplan'))
        )) {
          break;
        }
        
        if (inMatchupSection) {
          // Look for opponent team section - handle both bold and regular formatting
          if (line.toLowerCase().includes('opponent team:') || 
              line.toLowerCase().includes("opponent's team:") ||
              line.includes('**Opponent Team:**') ||
              line.includes("**Opponent's Team:**")) {
            
            console.log(`Found opponent team section: "${line}"`);
            
            // Parse team members in the following lines
            for (let j = i + 1; j < lines.length && j < i + 20; j++) {
              const teamLine = lines[j].trim();
              
              // Stop if we hit another section or empty lines
              if (teamLine.startsWith('**') && !teamLine.includes('@') && !teamLine.includes('(')) {
                break;
              }
              if (teamLine === '' && j > i + 3) {
                break;
              }
              
              if (teamLine.startsWith('-') || teamLine.startsWith('*')) {
                let teamText = teamLine.replace(/^[-*]\s*/, '');
                console.log(`Processing team line: "${teamLine}" -> "${teamText}"`);
                
                // Look for Pokemon with items: "Pokemon @ Item" or "Pokemon-Form @ Item"
                // Updated regex to better handle the format: "Miraidon @ Choice Scarf (Hadron Engine, Tera Electric)"
                const pokemonWithItemMatch = teamText.match(/^([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)?)\s*@\s*([^(]+?)(?:\s*\([^)]+\))?$/);
                if (pokemonWithItemMatch) {
                  const pokemonName = pokemonWithItemMatch[1].trim();
                  const itemName = pokemonWithItemMatch[2].trim();
                  
                  console.log(`Parsed Pokemon: ${pokemonName}, Item: ${itemName}`);
                  
                  // Validate Pokemon name exists in our map
                  if (POKEMON_ID_MAP[pokemonName] || 
                      Object.keys(POKEMON_ID_MAP).some(p => p.toLowerCase() === pokemonName.toLowerCase())) {
                    
                    // Find the correct case-sensitive Pokemon name
                    const correctPokemonName = Object.keys(POKEMON_ID_MAP).find(p => 
                      p.toLowerCase() === pokemonName.toLowerCase()) || pokemonName;
                    
                    opponentData.push({
                      pokemon: correctPokemonName,
                      item: itemName
                    });
                    
                    console.log(`Added to opponent data: ${correctPokemonName} @ ${itemName}`);
                  } else {
                    console.log(`Pokemon not found in map: ${pokemonName}`);
                  }
                }
                // Look for Pokemon without items
                else {
                  const pokemonMatch = teamText.match(/^([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)?)/);
                  if (pokemonMatch) {
                    const pokemonName = pokemonMatch[1].trim();
                    
                    // Validate Pokemon name exists in our map
                    if (POKEMON_ID_MAP[pokemonName] || 
                        Object.keys(POKEMON_ID_MAP).some(p => p.toLowerCase() === pokemonName.toLowerCase())) {
                      
                      // Find the correct case-sensitive Pokemon name
                      const correctPokemonName = Object.keys(POKEMON_ID_MAP).find(p => 
                        p.toLowerCase() === pokemonName.toLowerCase()) || pokemonName;
                      
                      opponentData.push({
                        pokemon: correctPokemonName,
                        item: null
                      });
                    }
                  }
                }
              }
            }
            break;
          }
        }
      }
    }
    
    return opponentData;
  } catch (error) {
    console.error('Error parsing opponent team with items:', error);
    return [];
  }
};

// Detect if we're running on GitHub Pages or similar static hosting
const isStaticHosting = (): boolean => {
  const hostname = window.location.hostname;
  return (
    hostname.includes('github.io') || 
    hostname.includes('netlify.app') || 
    hostname.includes('vercel.app') ||
    hostname.includes('surge.sh') ||
    // Add other static hosting domains as needed
    (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.local'))
  );
};

// Utility function to load gameplans from API or localStorage
const loadGameplansFromAPI = async (): Promise<Gameplan[]> => {
  // If on static hosting (GitHub Pages, etc.), skip API and use localStorage only
  if (isStaticHosting()) {
    console.log('Running on static hosting - using localStorage only');
    return [];
  }

  try {
    console.log('Loading gameplans from API...');
    
    const response = await fetch('/api/gameplans', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch from API: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const gameplans = await response.json();
    console.log(`Successfully loaded ${gameplans.length} gameplan(s) from API`);
    
    // Validate and normalize the data
    return gameplans.map((gameplan: any) => ({
      ...gameplan,
      dateCreated: gameplan.dateCreated || new Date().toISOString().split('T')[0],
      tags: gameplan.tags || [],
      season: gameplan.season,
      tournament: gameplan.tournament,
      format: gameplan.format || 'VGC'
    }));
    
  } catch (error) {
    console.log('Failed to load from API:', error);
    return [];
  }
};

// Extract Pokemon names from gameplan content (auto-infer from team composition)
const extractPokemonFromContent = (gameplan: Gameplan): string[] => {
  try {
    // Always extract from content to ensure consistency and avoid redundancy
    if (!gameplan || !gameplan.content) {
      console.log('extractPokemonFromContent: No gameplan or content');
      return [];
    }
    
    console.log('extractPokemonFromContent: Extracting from content:', gameplan.title);
    
    // Check if there's a "My Team" pokepaste URL
    const hasMyTeamPokepasteUrl = gameplan.content.toLowerCase().includes('my team:') && 
                                  gameplan.content.match(/https:\/\/pokepast\.es\/[a-f0-9]+/i);
    
    if (hasMyTeamPokepasteUrl) {
      console.log('extractPokemonFromContent: Found "My Team" pokepaste URL, cannot fetch synchronously');
      // For pokepaste-only teams, the sprites will show when the CheatSheet loads async data
      // Return empty array so main list doesn't show "?" sprites
      return [];
    }
    
    // Use the same parsing logic as extractTeamPokemonWithItems for consistency
    const teamWithItems = extractTeamPokemonWithItems(gameplan.content);
    console.log('extractPokemonFromContent: teamWithItems result:', teamWithItems);
    
    if (teamWithItems && teamWithItems.length > 0) {
      const pokemonNames = teamWithItems.map(teamMember => teamMember.pokemon).slice(0, 6);
      console.log('extractPokemonFromContent: Final Pokemon names:', pokemonNames);
      return pokemonNames;
    }
    
    // Final fallback: legacy regex matching (for backward compatibility)
    const pokemonNames = Object.keys(POKEMON_ID_MAP);
    const found: string[] = [];
    
    pokemonNames.forEach(pokemon => {
      try {
        // Look for the pokemon name in the content (case-insensitive)
        const regex = new RegExp(`\\b${pokemon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(gameplan.content)) {
          found.push(pokemon);
        }
      } catch (regexError) {
        // Skip problematic Pokemon names
        console.warn(`Regex error for Pokemon ${pokemon}:`, regexError);
      }
    });
    
    // Remove duplicates and return max 6
    return Array.from(new Set(found)).slice(0, 6);
  } catch (error) {
    console.error('Error extracting Pokemon from content:', error);
    return [];
  }
};

// Extract Pokemon details from gameplan content
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const extractPokemonDetails = (content: string, pokemonName: string): {
  nickname?: string;
  item?: string;
  ability?: string;
  tera?: string;
  evs?: string;
  nature?: string;
  moves?: string[];
} | null => {
  try {
    const lines = content.split('\n');
    let inPokemonSection = false;
    let currentPokemon = '';
    let details: any = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for Pokemon section headers (with or without nickname)
      const pokemonMatch = line.match(/^\*\*([^(]+?)(?:\s*\(([^)]+)\))?\*\*\s*@\s*(.+)/);
      if (pokemonMatch) {
        const foundPokemon = pokemonMatch[1].trim();
        const nickname = pokemonMatch[2]?.trim();
        const item = pokemonMatch[3]?.trim();
        
        // Check if this is the Pokemon we're looking for
        if (foundPokemon.toLowerCase() === pokemonName.toLowerCase() || 
            nickname?.toLowerCase() === pokemonName.toLowerCase()) {
          inPokemonSection = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          currentPokemon = foundPokemon;
          details = {
            nickname,
            item,
            moves: []
          };
          continue;
        } else {
          inPokemonSection = false;
        }
      }
      
      // Stop if we hit another Pokemon section or major section
      if (inPokemonSection && (
          (line.startsWith('**') && line.includes('@')) ||
          (line.startsWith('## ') && !line.includes('vs '))
      )) {
        break;
      }
      
      if (inPokemonSection) {
        // Extract ability and tera
        if (line.toLowerCase().includes('ability:') && line.toLowerCase().includes('tera:')) {
          const abilityMatch = line.match(/ability:\s*([^|]+)/i);
          const teraMatch = line.match(/tera:\s*([^|]+)/i);
          if (abilityMatch) details.ability = abilityMatch[1].trim();
          if (teraMatch) details.tera = teraMatch[1].trim();
        }
        
        // Extract EVs and nature
        if (line.toLowerCase().includes('evs:') && line.includes('|')) {
          const evsMatch = line.match(/evs:\s*([^|]+)/i);
          const natureMatch = line.match(/\|\s*([^|]+)$/);
          if (evsMatch) details.evs = evsMatch[1].trim();
          if (natureMatch) details.nature = natureMatch[1].trim();
        }
        
        // Extract moves (lines starting with -)
        if (line.startsWith('-') && !line.includes('@')) {
          const move = line.replace(/^-\s*/, '').trim();
          if (move && !move.toLowerCase().includes('ability:') && !move.toLowerCase().includes('evs:')) {
            details.moves.push(move);
          }
        }
      }
    }
    
    return Object.keys(details).length > 0 ? details : null;
  } catch (error) {
    console.error('Error extracting Pokemon details:', error);
    return null;
  }
};

// Extract Pokemon names from text (for leads, backlines, etc.)
const extractPokemonFromText = (text: string): string[] => {
  if (!text) return [];
  // Split by common delimiters
  const parts = text.split(/\s*[+/&]| and |,|\/\s*/i).map(part => part.trim()).filter(Boolean);
  const pokemonNames: string[] = [];
  parts.forEach(part => {
    // First check for exact names in POKEMON_ID_MAP (case-insensitive)
    const found = Object.keys(POKEMON_ID_MAP).find(pokemon => pokemon.toLowerCase() === part.toLowerCase());
    if (found) {
      pokemonNames.push(found);
      return;
    }
    
    // Then check for Pokemon forms (need to recreate the form mapping here since it's defined in getPokemonSpriteUrl)
    const knownForms = [
      'Calyrex-Shadow', 'Calyrex-Ice',
      'Urshifu-Single', 'Urshifu-Rapid', 'Urshifu-Rapid-Strike',
      'Tornadus-Incarnate', 'Tornadus-Therian',
      'Thundurus-Incarnate', 'Thundurus-Therian',
      'Landorus-Incarnate', 'Landorus-Therian',
      'Rotom-Heat', 'Rotom-Wash', 'Rotom-Frost', 'Rotom-Fan', 'Rotom-Mow',
      'Maushold-Four', 'Maushold-Three',
      'Ursaluna-Bloodmoon'
    ];
    
    const formFound = knownForms.find(form => form.toLowerCase() === part.toLowerCase());
    if (formFound) {
      pokemonNames.push(formFound);
    }
  });
  return pokemonNames;
};

// Helper function to validate Pokemon names
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isValidPokemonName = (name: string): boolean => {
  // Common non-Pokemon words to exclude
  const excludeWords = [
    'Turn', 'Lead', 'Back', 'Strategy', 'Why', 'This', 'Works', 'Options',
    'Protect', 'Fake', 'Out', 'Body', 'Press', 'Astral', 'Barrage', 'Wide',
    'Guard', 'Follow', 'Me', 'Spore', 'Tailwind', 'Bleakwind', 'Storm',
    'Taunt', 'Thunderbolt', 'Draco', 'Meteor', 'Thunderclap', 'Solar',
    'Beam', 'Grassy', 'Glide', 'Wood', 'Hammer', 'U-turn', 'Life', 'Orb',
    'Rusted', 'Shield', 'Focus', 'Sash', 'Covert', 'Cloak', 'Assault',
    'Vest', 'Clear', 'Amulet', 'Rocky', 'Helmet', 'Choice', 'Scarf',
    'Electro', 'Drift', 'Volt', 'Switch', 'Snarl', 'Glacial', 'Lance',
    'High', 'Horsepower', 'Trick', 'Room', 'Flare', 'Blitz', 'Knock',
    'Off', 'Pollen', 'Puff', 'Rage', 'Powder', 'Earth', 'Power', 'Sludge',
    'Bomb', 'Surging', 'Strikes', 'Close', 'Combat', 'Aqua', 'Jet',
    'Detect', 'Recommended', 'Primary', 'Secondary', 'Aggressive',
    'Defensive', 'Support', 'Control', 'Pressure', 'Setup', 'Cleanup',
    'Priority', 'Speed', 'Terrain', 'Weather', 'Status', 'Damage',
    'Health', 'Attack', 'Defense', 'Special', 'Evasion', 'Accuracy',
    'Critical', 'Hit', 'Miss', 'Flinch', 'Confusion', 'Paralysis',
    'Poison', 'Burn', 'Freeze', 'Sleep', 'Fainted', 'Switch', 'In',
    'Out', 'Mega', 'Evolution', 'Dynamax', 'Z-Move', 'Tera', 'Type',
    'Ability', 'Nature', 'EVs', 'IVs', 'Item', 'Move', 'Moves',
    'Team', 'Pokemon', 'Mon', 'Mons', 'Archetype', 'Core', 'Strategy',
    'Gameplan', 'Matchup', 'Opponent', 'Rival', 'Win', 'Loss', 'Draw',
    'Victory', 'Defeat', 'Battle', 'Fight', 'Combat', 'War', 'Peace',
    'Friend', 'Enemy', 'Ally', 'Foe', 'Partner', 'Leader', 'Follower',
    'Support', 'Attacker', 'Defender', 'Sweeper', 'Wall', 'Tank',
    'Glass', 'Cannon', 'Bulky', 'Fast', 'Slow', 'Strong', 'Weak',
    'Resist', 'Immune', 'Super', 'Effective', 'Not', 'Very', 'Normal',
    'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
    'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon',
    'Dark', 'Steel', 'Fairy', 'Stellar', 'Physical', 'Special',
    'Status', 'Contact', 'Non-contact', 'Priority', 'High', 'Low',
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'First', 'Second', 'Third', 'Fourth',
    'Fifth', 'Sixth', 'Last', 'Next', 'Previous', 'Current', 'Future',
    'Past', 'Present', 'Time', 'Space', 'Reality', 'Dimension',
    'World', 'Universe', 'Galaxy', 'Planet', 'Star', 'Moon', 'Sun',
    'Earth', 'Mars', 'Venus', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
    'Pluto', 'Mercury', 'Neptune', 'Ceres', 'Eris', 'Haumea', 'Makemake'
  ];
  
  return !excludeWords.includes(name) && name.length > 2 && name.length < 20 && !!POKEMON_ID_MAP[name];
};

// Component for rendering Pokemon sprites with optional held items
const PokemonSprite: React.FC<{ 
  pokemon: string; 
  size?: number; 
  className?: string; 
  heldItem?: string | null;
  showItem?: boolean;
}> = ({ 
  pokemon, 
  size = 32, 
  className = '',
  heldItem = null,
  showItem = false
}) => {
  // Enhanced Pokemon ID lookup with better form handling
  let pokemonId = POKEMON_ID_MAP[pokemon] || POKEMON_ID_MAP[pokemon.replace(/[-\s]/g, '')] || 0;
  
  // If not found, try common alternate forms
  if (pokemonId === 0) {
    const alternateNames = [
      pokemon + '-Incarnate',
      pokemon + '-Therian',
      pokemon.replace('-Incarnate', ''),
      pokemon.replace('-Therian', ''),
      pokemon.replace(' ', '-'),
      pokemon.replace('-', ' '),
    ];
    
    for (const altName of alternateNames) {
      if (POKEMON_ID_MAP[altName]) {
        pokemonId = POKEMON_ID_MAP[altName];
        break;
      }
    }
  }
  
  const [itemSpriteUrl, setItemSpriteUrl] = React.useState<string | null>(null);
  
  // Load item sprite asynchronously
  React.useEffect(() => {
    if (heldItem && showItem) {
      // Use synchronous version for immediate display
      const url = getItemSpriteUrlSync(heldItem);
      console.log(`PokemonSprite: Loading item "${heldItem}" -> URL: ${url}`);
      setItemSpriteUrl(url);
    } else {
      setItemSpriteUrl(null);
    }
  }, [heldItem, showItem]);
  
  // Try to get PokemonDB sprite URL first (better quality)
  const pokemonDBSpriteUrl = getPokemonSpriteUrl(pokemon);
  const [currentSpriteUrl, setCurrentSpriteUrl] = React.useState<string | null>(null);
  const [hasError, setHasError] = React.useState<boolean>(false);
  
  // Set initial sprite URL
  React.useEffect(() => {
    if (pokemonDBSpriteUrl) {
      setCurrentSpriteUrl(pokemonDBSpriteUrl);
      setHasError(false);
    } else if (pokemonId > 0) {
      setCurrentSpriteUrl(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`);
      setHasError(false);
    }
  }, [pokemon, pokemonDBSpriteUrl, pokemonId]);
  
  if (pokemonId === 0 && !pokemonDBSpriteUrl) {
    return (
      <div 
        className={`pokemon-sprite-fallback ${className}`}
        style={{ width: size, height: size }}
        title={pokemon}
      >
        ?
      </div>
    );
  }

  return (
    <div 
      className={`pokemon-sprite-container ${className}`}
      style={{ position: 'relative', width: size, height: size }}
      title={heldItem ? `${pokemon} @ ${heldItem}` : pokemon}
    >
      <img
        src={currentSpriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
        alt={pokemon}
        className="pokemon-sprite"
        style={{ width: size, height: size }}
        onError={(e) => {
          // If PokemonDB failed and we haven't tried PokeAPI yet, fall back to PokeAPI
          if (!hasError && pokemonDBSpriteUrl && pokemonId > 0) {
            setCurrentSpriteUrl(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`);
            setHasError(true);
          } else {
            // If PokeAPI also failed, hide the image
            (e.target as HTMLImageElement).style.display = 'none';
          }
        }}
      />
      {itemSpriteUrl && (
        <img
          src={itemSpriteUrl}
          alt={heldItem || ''}
          className="held-item-sprite"
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            // Held items: max 22px, reduced by 30% for better balance
            width: Math.min(22, Math.max(11, size * 0.42)),
            height: Math.min(22, Math.max(11, size * 0.42)),
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            padding: '1px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
};



// Component for dropdown sprites that can load from pokepaste
const DropdownPokemonSprites: React.FC<{ 
  matchupKey: string; 
  gameplanContent: string;
  size?: number;
}> = ({ matchupKey, gameplanContent, size = 24 }) => {
  const [pokepasteData, setPokepasteData] = useState<OpponentTeamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fallbackPokemon, setFallbackPokemon] = useState<string[]>([]);

  useEffect(() => {
    const extractPokepasteUrl = (content: string, matchup: string): string | null => {
      const lines = content.split('\n');
      let inMatchupSection = false;
      let inStrategiesSection = false;
      
      console.log(`[DEBUG] extractPokepasteUrl called with matchup: "${matchup}"`);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if we're in the Matchup-Specific Strategies section
        if (line.includes('## Matchup-Specific Strategies')) {
          inStrategiesSection = true;
          continue;
        }
        
        // Check if we're entering the matchup section (only in strategies section)
        if (inStrategiesSection && (line.toLowerCase().includes(`vs ${matchup.toLowerCase()}`) || 
            line.toLowerCase().includes(`### vs ${matchup.toLowerCase()}`))) {
          console.log(`[DEBUG] Found matchup section at line ${i}: "${line}"`);
          inMatchupSection = true;
          continue;
        }
        
        // If we hit a new matchup section, stop searching
        if (inMatchupSection && (line.startsWith('###') || line.startsWith('##')) && !line.toLowerCase().includes(matchup.toLowerCase())) {
          console.log(`[DEBUG] Leaving matchup section at line ${i}: "${line}"`);
          break;
        }
        // Look for Pokepaste links only within the correct matchup section
        if (inMatchupSection) {
          console.log(`[DEBUG] Checking line ${i} in matchup section: "${line}"`);
          // First try to match markdown link format: [Pokepaste](https://pokepast.es/...)
          const markdownMatch = line.match(/\[Pokepaste\]\((https:\/\/pokepast\.es\/[a-f0-9-]+)\)/i);
          if (markdownMatch) {
            console.log(`[DEBUG] Found pokepaste URL: ${markdownMatch[1]}`);
            return markdownMatch[1];
          }
          // Fallback to direct URL format
          const pokepasteMatch = line.match(/https:\/\/pokepast\.es\/[a-f0-9-]+/i);
          if (pokepasteMatch) {
            console.log(`[DEBUG] Found direct pokepaste URL: ${pokepasteMatch[0]}`);
            return pokepasteMatch[0];
          }
        }
      }
      
      console.log(`[DEBUG] No pokepaste URL found for matchup: "${matchup}"`);
      return null;
    };

    const extractFallbackPokemon = (content: string, matchup: string): string[] => {
      const lines = content.split('\n');
      let inMatchupSection = false;
      let inStrategiesSection = false;
      const allPokemon: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if we're in the Matchup-Specific Strategies section
        if (line.includes('## Matchup-Specific Strategies')) {
          inStrategiesSection = true;
          continue;
        }
        
        // Check if we're entering the matchup section (only in strategies section)
        if (inStrategiesSection && (line.toLowerCase().includes(`vs ${matchup.toLowerCase()}`) || 
            line.toLowerCase().includes(`### vs ${matchup.toLowerCase()}`))) {
          inMatchupSection = true;
          continue;
        }
        
        // Check if we're leaving the matchup section
        if (inMatchupSection && 
            (line.startsWith('###') || line.startsWith('##')) && 
            !line.toLowerCase().includes(matchup.toLowerCase())) {
          break;
        }
        
        if (inMatchupSection) {
          // Extract Pokemon from various patterns in the matchup section
          const pokemonPatterns = [
            /^[-*]\s*([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)?)\s*@/, // Pokemon @ Item
            /^[-*]\s*([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)?)$/, // Pokemon only
            /\b([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)?)\s*@/g, // Pokemon @ Item in text
            /\b([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)?)\b/g // Any Pokemon name
          ];
          
          for (const pattern of pokemonPatterns) {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const pokemonName = match.replace(/@.*$/, '').trim();
                if (
                  (pokemonName && POKEMON_ID_MAP[pokemonName]) || 
                  Object.keys(POKEMON_ID_MAP).some(p => p.toLowerCase() === pokemonName.toLowerCase())
                ) {
                  const correctName = Object.keys(POKEMON_ID_MAP).find(p => 
                    p.toLowerCase() === pokemonName.toLowerCase()) || pokemonName;
                  allPokemon.push(correctName);
                }
              });
            }
          }
        }
      }
      
      return Array.from(new Set(allPokemon));
    };

    const loadPokepasteData = async () => {
      const url = extractPokepasteUrl(gameplanContent, matchupKey);
      if (!url) {
        // No pokepaste URL found, use fallback extraction
        const fallback = extractFallbackPokemon(gameplanContent, matchupKey);
        setFallbackPokemon(fallback);
        return;
      }

      setLoading(true);
      
      try {
        const data = await fetchPokepasteData(url);
        if (data && data.pokemon.length > 0) {
          setPokepasteData(data);
        } else {
          // Fallback to manual extraction if pokepaste fails
          const fallback = extractFallbackPokemon(gameplanContent, matchupKey);
          setFallbackPokemon(fallback);
        }
      } catch (err) {
        console.error('Error loading pokepaste data for dropdown:', err);
        // Fallback to manual extraction
        const fallback = extractFallbackPokemon(gameplanContent, matchupKey);
        setFallbackPokemon(fallback);
      } finally {
        setLoading(false);
      }
    };

    loadPokepasteData();
  }, [matchupKey, gameplanContent]);

  if (loading) {
    return (
      <div className="matchup-pokemon">
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Loading...</span>
      </div>
    );
  }

  const pokemonToShow = pokepasteData ? 
    pokepasteData.pokemon.map(p => p.name) : 
    fallbackPokemon;

  return (
    <div className="matchup-pokemon">
      {pokemonToShow.slice(0, 6).map(pokemon => (
        <PokemonSprite 
          key={pokemon} 
          pokemon={pokemon} 
          size={size} 
          className="matchup-pokemon-sprite"
        />
      ))}
      {pokemonToShow.length > 6 && (
        <span className="pokemon-more">+{pokemonToShow.length - 6}</span>
      )}
    </div>
  );
};

// Matchup Selector Component
const MatchupSelector: React.FC<{ 
  gameplan: Gameplan;
  onReplayAdded?: (replay: Replay) => void;
  onReplayDeleted?: (replayId: string) => void;
}> = ({ gameplan, onReplayAdded, onReplayDeleted }) => {
  const [selectedMatchup, setSelectedMatchup] = useState<string>('');
  const [selectedPokemonForCalcs, setSelectedPokemonForCalcs] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [replayCarouselStates, setReplayCarouselStates] = useState<{ [key: string]: number }>({});
  


  // Extract damage calculations for a specific matchup
  const extractDamageCalcs = (content: string, matchup: string) => {
    const damageCalcs: { [key: string]: string } = {};
    const lines = content.split('\n');
    
    let inMatchupSection = false;
    let inDamageSection = false;
    let currentCalc = '';
    let currentCalcName = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're entering the matchup section
      if (line.includes('###') && line.toLowerCase().includes(`vs ${matchup.toLowerCase()}`)) {
        inMatchupSection = true;
        inDamageSection = false;
        continue;
      }
      
      // Check if we're leaving the matchup section
      if (inMatchupSection && line.includes('###') && !line.toLowerCase().includes('vs ')) {
        break;
      }
      
      if (inMatchupSection) {
        // Check if we're entering a damage calculations section
        if (line.includes('**Damage Calculations:**')) {
          inDamageSection = true;
          continue;
        }
        
        // If we're in a damage section, look for calculation lines
        if (inDamageSection) {
          // Look for damage calculation patterns (more specific)
          if (line.includes('OHKO') || line.includes('2HKO') || line.includes('3HKO') || 
              line.includes('4HKO') || (line.includes('%') && line.includes('chance')) ||
              (line.includes('vs.') && line.includes('HP')) ||
              (line.includes('guaranteed') && (line.includes('HKO') || line.includes('%')))) {
            
            // Extract the calculation name (usually the move or Pokemon)
            const calcMatch = line.match(/^[-*]\s*([^:]+):/);
            if (calcMatch) {
              if (currentCalcName && currentCalc) {
                damageCalcs[currentCalcName] = currentCalc.trim();
              }
              currentCalcName = calcMatch[1].trim();
              currentCalc = line;
            } else {
              currentCalc += '\n' + line;
            }
          }
        }
      }
    }
    
    // Add the last calculation
    if (currentCalcName && currentCalc) {
      damageCalcs[currentCalcName] = currentCalc.trim();
    }
    
    return damageCalcs;
  };
  
  // Reset selected Pokemon when matchup changes
  useEffect(() => {
    setSelectedPokemonForCalcs('');
  }, [selectedMatchup]);



  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.searchable-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Extract matchup data dynamically from gameplan content
  const extractMatchups = (content: string) => {
    console.log('ExtractMatchups called with content length:', content.length);
    console.log('Content preview:', content.substring(0, 500));
    
    const matchups: { [key: string]: { 
      lead: string; 
      back: string; 
      strategy: string; 
      note?: string; 
      turnOptions?: string[];
      likelyLeads?: { lead: string; backs: string[] }[];
      conditionalGameplans?: {
        opponentLead: string;
        myLead: string;
        myBack: string;
        myWincon?: string;
        first3Turns?: string[];
      }[];
      opponentTeam?: Array<{pokemon: string, item: string | null}>;
      pokepasteUrl?: string;
    } } = {};
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for main matchup sections starting with "### vs " or "## vs "
      // But only in the "Matchup-Specific Strategies" section, not in the "Replays" section
              if ((line.startsWith('### vs ') || line.startsWith('## vs ')) && 
            !content.substring(0, i).includes('## Replays')) {
          const opponentName = line.replace(/^#+\s*vs\s*/, '').trim();
          console.log('Found matchup section:', opponentName, 'at line:', i);
        let lead = '';
        let back = '';
        let strategy = '';
        let note = '';
        let turnOptions: string[] = [];
        let likelyLeads: { lead: string; backs: string[] }[] = [];
        let conditionalGameplans: {
          opponentLead: string;
          myLead: string;
          myBack: string;
          myWincon?: string;
          first3Turns?: string[];
        }[] = [];
        let opponentTeam: Array<{pokemon: string, item: string | null}> = [];
        let pokepasteUrl: string = '';
        
        // Parse the matchup section (look ahead ~100 lines for more comprehensive data)
        for (let j = i + 1; j < lines.length && j < i + 100; j++) {
          const nextLine = lines[j].trim();
          
          // Stop if we hit another matchup section or major heading
          if ((nextLine.startsWith('### ') && nextLine !== line) || 
              (nextLine.startsWith('## ') && !nextLine.includes('vs '))) {
            break;
          }
          
          // Extract recommended lead from matchup level or first gameplan if not found yet
          if (!lead && nextLine.includes('**My Lead:**')) {
            const leadMatch = nextLine.match(/\*\*My Lead:\*\*\s*(.+)/i);
            if (leadMatch) {
              lead = leadMatch[1].trim();
              console.log(`Found lead: ${lead}`);
            }
          }
          
          // Extract back line from matchup level or first gameplan if not found yet
          if (!back && nextLine.includes('**My Back:**')) {
            const backMatch = nextLine.match(/\*\*My Back:\*\*\s*(.+)/i);
            if (backMatch) {
              back = backMatch[1].trim();
              console.log(`Found back: ${back}`);
            }
          }
          
          // Also look for lead/back in the first few lines after the matchup header
          if (!lead && j === i + 1 && nextLine.includes('**My Lead:**')) {
            const leadMatch = nextLine.match(/\*\*My Lead:\*\*\s*(.+)/i);
            if (leadMatch) {
              lead = leadMatch[1].trim();
              console.log(`Found lead at matchup level: ${lead}`);
            }
          }
          
          if (!back && j === i + 2 && nextLine.includes('**My Back:**')) {
            const backMatch = nextLine.match(/\*\*My Back:\*\*\s*(.+)/i);
            if (backMatch) {
              back = backMatch[1].trim();
              console.log(`Found back at matchup level: ${back}`);
            }
          }
          

          
          // Extract gameplans (new format)
          if (nextLine.toLowerCase().includes('gameplan') && nextLine.includes('vs ')) {
            let currentGameplan: {
              opponentLead: string;
              myLead: string;
              myBack: string;
              myWincon?: string;
              theirWincon?: string;
              first3Turns?: string[];
            } | null = null;
            
            // Extract opponent's lead from gameplan title
            const gameplanMatch = nextLine.match(/gameplan\s+\d+:\s*vs\s+(.+)/i);
            if (gameplanMatch) {
              currentGameplan = {
                opponentLead: gameplanMatch[1].trim(),
                myLead: '',
                myBack: '',
                myWincon: '',
                theirWincon: '',
                first3Turns: []
              };
            }
            
            // Parse the gameplan details
            if (currentGameplan) {
              for (let k = j + 1; k < lines.length && k < j + 20; k++) {
                const gameplanLine = lines[k].trim();
                
                // Stop if we hit another gameplan or section
                if (gameplanLine.startsWith('**Gameplan') || gameplanLine.startsWith('###') || gameplanLine.startsWith('##')) {
                  break;
                }
                
                // Extract My Lead
                if (gameplanLine.includes('**My Lead:**')) {
                  const leadMatch = gameplanLine.match(/\*\*My Lead:\*\*\s*(.+)/i);
                  if (leadMatch) {
                    currentGameplan.myLead = leadMatch[1].trim();
                  }
                }
                
                // Extract My Back
                if (gameplanLine.includes('**My Back:**')) {
                  const backMatch = gameplanLine.match(/\*\*My Back:\*\*\s*(.+)/i);
                  if (backMatch) {
                    currentGameplan.myBack = backMatch[1].trim();
                  }
                }
                
                // Extract My Win Condition (support both "Wincon" and "Win Condition" formats)
                if (gameplanLine.includes('**My Wincon:**') || gameplanLine.includes('**My Win Condition:**')) {
                  const winconMatch = gameplanLine.match(/\*\*My (Wincon|Win Condition):\*\*\s*(.+)/i);
                  if (winconMatch) {
                    currentGameplan.myWincon = winconMatch[2].trim();
                  }
                }
                
                // Extract Their Win Condition (support both "Wincon" and "Win Condition" formats)
                if (gameplanLine.includes('**Their Wincon:**') || gameplanLine.includes('**Their Win Condition:**')) {
                  const theirWinconMatch = gameplanLine.match(/\*\*Their (Wincon|Win Condition):\*\*\s*(.+)/i);
                  if (theirWinconMatch) {
                    currentGameplan.theirWincon = theirWinconMatch[2].trim();
                  }
                }
                
                // Extract First 3 Turns
                if (gameplanLine.includes('**First 3 Turns:**')) {
                  for (let l = k + 1; l < lines.length && l < k + 20; l++) {
                    const turnLine = lines[l].trim();
                    if (turnLine.startsWith('-') && turnLine.includes('Turn')) {
                      currentGameplan.first3Turns!.push(turnLine.replace(/^-\s*/, ''));
                    } else if (turnLine.startsWith('**Replay Examples:**')) {
                      // Include replay examples in the first3Turns array
                      for (let m = l + 1; m < lines.length && m < l + 15; m++) {
                        const replayLine = lines[m].trim();
                        if (replayLine.startsWith('-') && replayLine.includes('**Replay:**')) {
                          currentGameplan.first3Turns!.push(replayLine.replace(/^-\s*/, ''));
                        } else if (replayLine.startsWith('**Result:**') || replayLine.startsWith('**Notes:**')) {
                          // Include result and notes lines
                          currentGameplan.first3Turns!.push(replayLine);
                        } else if (replayLine.startsWith('**') && !replayLine.includes('Replay') && !replayLine.includes('Result') && !replayLine.includes('Notes')) {
                          break;
                        }
                      }
                      break;
                    } else if (turnLine.startsWith('**') && !turnLine.includes('Replay')) {
                      break;
                    }
                  }
                }
              }
              
              // Add the completed gameplan
              if (currentGameplan.myLead && currentGameplan.myBack) {
                conditionalGameplans.push({
                  opponentLead: currentGameplan.opponentLead,
                  myLead: currentGameplan.myLead,
                  myBack: currentGameplan.myBack,
                  myWincon: currentGameplan.myWincon,
                  first3Turns: currentGameplan.first3Turns && currentGameplan.first3Turns.length > 0 ? currentGameplan.first3Turns : undefined
                });
              }
            }
          }
          
          // Extract opponent's team and Pokepaste URL
          if (nextLine.toLowerCase().includes('opponent team:') || nextLine.toLowerCase().includes("opponent's team:") || nextLine.toLowerCase().includes('pokepaste')) {
            console.log(`Found opponent team line: "${nextLine}"`);

            // Look for Pokepaste URL in the current line
            let urlMatch = nextLine.match(/\[Pokepaste\]\((https:\/\/pokepast\.es\/[a-zA-Z0-9-]+)\)/);
            if (urlMatch) {
              pokepasteUrl = urlMatch[1];
              console.log(`Found pokepaste URL in current line: ${pokepasteUrl}`);
            } else {
              console.log(`No pokepaste URL in current line, checking next lines...`);
              // If not found in current line, look in the next few lines
              for (let k = j + 1; k < lines.length && k < j + 5; k++) {
                const urlLine = lines[k].trim();
                console.log(`Checking line ${k}: "${urlLine}"`);
                urlMatch = urlLine.match(/\[Pokepaste\]\((https:\/\/pokepast\.es\/[a-zA-Z0-9-]+)\)/);
                if (urlMatch) {
                  pokepasteUrl = urlMatch[1];
                  console.log(`Found pokepaste URL in line ${k}: ${pokepasteUrl}`);
                  break;
                }
                // Stop if we hit a line that starts with a dash (team member) or is empty
                if (urlLine.startsWith('-') || urlLine === '') {
                  console.log(`Stopping search at line ${k} (dash or empty)`);
                  break;
                }
              }
            }
            console.log(`Final pokepaste URL for ${opponentName}: ${pokepasteUrl}`);
            
            // Extract team members with items
            for (let k = j + 1; k < lines.length && k < j + 15; k++) {
              const teamLine = lines[k].trim();
              if (teamLine.startsWith('-') || teamLine.startsWith('*')) {
                const teamText = teamLine.replace(/^[-*]\s*/, '');
                // Look for Pokemon @ Item format first - improved regex for multi-hyphen names
                const pokemonWithItemMatch = teamText.match(/^([A-Za-z][A-Za-z0-9-]*(?:-[A-Za-z][A-Za-z0-9-]*)*)\s*@\s*([^(]+)/);
                if (pokemonWithItemMatch) {
                  const pokemonName = pokemonWithItemMatch[1].trim();
                  const itemName = pokemonWithItemMatch[2].trim();
                  console.log(`Found opponent Pokemon with item: ${pokemonName} @ ${itemName}`);
                  
                  // Check if Pokemon exists in our map
                  if (POKEMON_ID_MAP[pokemonName] || 
                      Object.keys(POKEMON_ID_MAP).some(p => p.toLowerCase() === pokemonName.toLowerCase())) {
                    
                    // Find the correct case-sensitive Pokemon name
                    const correctPokemonName = Object.keys(POKEMON_ID_MAP).find(p => 
                      p.toLowerCase() === pokemonName.toLowerCase()) || pokemonName;
                    
                    opponentTeam.push({ pokemon: correctPokemonName, item: itemName });
                  } else {
                    console.warn(`Pokemon "${pokemonName}" not found in POKEMON_ID_MAP`);
                  }
                } else {
                  // Look for Pokemon names without items - improved regex for multi-hyphen names
                  const pokemonMatch = teamText.match(/^([A-Z][a-z]+(?:-[A-Z][a-z]+)*)/);
                  if (pokemonMatch) {
                    const pokemonName = pokemonMatch[1].trim();
                    console.log(`Found opponent Pokemon without item: ${pokemonName}`);
                    
                    // Check if Pokemon exists in our map
                    if (POKEMON_ID_MAP[pokemonName] || 
                        Object.keys(POKEMON_ID_MAP).some(p => p.toLowerCase() === pokemonName.toLowerCase())) {
                      
                      // Find the correct case-sensitive Pokemon name
                      const correctPokemonName = Object.keys(POKEMON_ID_MAP).find(p => 
                        p.toLowerCase() === pokemonName.toLowerCase()) || pokemonName;
                      
                      opponentTeam.push({ pokemon: correctPokemonName, item: null });
                    } else {
                      console.warn(`Pokemon "${pokemonName}" not found in POKEMON_ID_MAP`);
                    }
                  }
                }
              } else if (teamLine.startsWith('**') || teamLine === '') {
                break;
              }
            }
          }
        }
        
        // Only add if we found essential information
        if (opponentName && (lead || back)) {
          console.log(`Adding matchup: ${opponentName} with lead: ${lead}, back: ${back}`);
          console.log(`Opponent team data:`, opponentTeam);
          matchups[opponentName] = {
            lead: lead || 'Check gameplan for lead',
            back: back || 'Check gameplan for back',
            strategy: strategy || 'Check gameplan for detailed strategy',
            note: note || undefined,
            turnOptions: turnOptions.length > 0 ? turnOptions : undefined,
            likelyLeads: likelyLeads.length > 0 ? likelyLeads : undefined,
            conditionalGameplans: conditionalGameplans.length > 0 ? conditionalGameplans : undefined,
            opponentTeam: opponentTeam.length > 0 ? opponentTeam : undefined,
            pokepasteUrl: pokepasteUrl || undefined
          };
        } else {
          console.log(`Skipping matchup ${opponentName} - missing lead: ${!!lead}, back: ${!!back}`);
        }
      }
    }
    
    console.log('Final matchups found:', Object.keys(matchups));
    return matchups;
  };

  console.log('Gameplan content length:', gameplan.content.length);
  console.log('Gameplan content preview:', gameplan.content.substring(0, 200));
  
  const matchups = extractMatchups(gameplan.content);
  const matchupKeys = Object.keys(matchups);
  console.log('Available matchups:', matchupKeys);
  
  console.log('MatchupSelector - matchups found:', matchupKeys);
  console.log('MatchupSelector - matchups object:', matchups);
  console.log('Selected matchup:', selectedMatchup);
  if (selectedMatchup && matchups[selectedMatchup]) {
    console.log('Selected matchup data:', matchups[selectedMatchup]);
    console.log('Pokepaste URL:', matchups[selectedMatchup].pokepasteUrl);
  }

  if (matchupKeys.length === 0) {
    console.log('MatchupSelector - no matchups found, returning null');
    return null;
  }

  // --- Add after opponent team section in MatchupSelector ---
  // Parse all ### Gameplan blocks for the selected matchup
  const extractGameplans = (content: string, matchup: string) => {
    const lines = content.split('\n');
    let inMatchup = false;
    let gameplans: any[] = [];
    let current: any = null;
    
    console.log('Extracting gameplans for matchup:', matchup);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Find the matchup section
      if (line.toLowerCase().startsWith('### vs ') || line.toLowerCase().startsWith('## vs ')) {
        const foundMatchup = line.replace(/^#+\s*vs\s*/i, '').trim().toLowerCase();
        inMatchup = foundMatchup === matchup.toLowerCase();
        console.log('Found matchup section:', foundMatchup, 'matches:', inMatchup);
      }
      if (inMatchup && line.startsWith('### Gameplan')) {
        if (current) gameplans.push(current);
        current = {
          opponentLead: '',
          opponentBack: '',
          myLead: '',
          myBack: '',
          theirWincon: '',
          myWincon: '',
          first3Turns: []
        };
        console.log('Found gameplan:', line);
      }
      if (inMatchup && current) {
        if (line.startsWith('**Opponent Lead:**') || line.startsWith("**Opponent's Lead:**")) {
          current.opponentLead = line.replace(/\*\*(Opponent'?s? Lead):\*\*/, '').trim();
        }
        if (line.startsWith('**Opponent Back:**') || line.startsWith("**Opponent's Back:**")) {
          current.opponentBack = line.replace(/\*\*(Opponent'?s? Back):\*\*/, '').trim();
        }
        if (line.startsWith('**My Lead:**')) {
          current.myLead = line.replace('**My Lead:**', '').trim();
        }
        if (line.startsWith('**My Back:**')) {
          current.myBack = line.replace('**My Back:**', '').trim();
        }
        if (line.startsWith('**Their Wincon:**') || line.startsWith('**Their Win Condition:**')) {
          current.theirWincon = line.replace(/\*\*Their (Wincon|Win Condition):\*\*/, '').trim();
        }
        if (line.startsWith('**My Wincon:**') || line.startsWith('**My Win Condition:**')) {
          current.myWincon = line.replace(/\*\*My (Wincon|Win Condition):\*\*/, '').trim();
        }
        if (line.startsWith('- Turn ')) {
          current.first3Turns.push(line.replace(/^-\s*/, ''));
        }
        // Also include replay examples that come after First 3 Turns
        if (line.includes('**Replay Examples:**') || line.includes('**Replay Examples-G1:**') || line.includes('**Replay Examples-G2:**') || line.includes('**Replay Examples-G3:**')) {
          current.first3Turns.push(line);
          // Include the replay content that follows
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j].trim();
            // Stop if we hit another section or gameplan
            if (nextLine.startsWith('###') || nextLine.startsWith('##') || 
                nextLine.startsWith('**Damage Calculations:**') || nextLine.startsWith('**Notes:**')) {
              break;
            }
            // Include replay lines (starting with - or **, or indented lines)
            if (nextLine.startsWith('-') || nextLine.startsWith('**') || nextLine.trim().startsWith('**')) {
              current.first3Turns.push(nextLine);
            } else if (nextLine === '') {
              // Include empty lines for formatting
              current.first3Turns.push(nextLine);
            } else {
              // Stop if we hit a non-replay line
              break;
            }
            j++;
          }
        }
      }
      // End of section
      if (inMatchup && (line.startsWith('### ') || line.startsWith('## ')) && !line.toLowerCase().includes('gameplan') && !line.toLowerCase().includes('vs ')) {
        if (current) gameplans.push(current);
        current = null;
        inMatchup = false;
      }
    }
    if (current) gameplans.push(current);
    // Filter out empty gameplans
    const filteredGameplans = gameplans.filter(gp => gp.myLead && gp.myBack);
    console.log('Extracted gameplans:', filteredGameplans);
    return filteredGameplans;
  };

  const gameplansForMatchup = selectedMatchup ? extractGameplans(gameplan.content, selectedMatchup) : [];
  console.log('Selected matchup:', selectedMatchup);
  console.log('Gameplans for matchup:', gameplansForMatchup);
  console.log('Gameplans length:', gameplansForMatchup.length);

  // --- New Notes Section Extractor ---
  const extractNotesSection = (content: string) => {
    const lines = content.split('\n');
    let inNotes = false;
    let notes: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^##\s*Notes/i.test(line)) {
        inNotes = true;
        continue;
      }
      if (inNotes && /^##\s/.test(line) && !/^##\s*Notes/i.test(line)) {
        break;
      }
      if (inNotes) {
        notes.push(lines[i]);
      }
    }
    return notes.join('\n').trim();
  };





  // Filter matchups based on search term - now uses pokepaste data when available
  const getMatchupPokemon = (matchupKey: string) => {
    const matchup = matchups[matchupKey];
    const allPokemon: string[] = [];
    
    // Prioritize opponent's team Pokemon (these should be shown first in dropdown)
    if (matchup.opponentTeam && matchup.opponentTeam.length > 0) {
      allPokemon.push(...matchup.opponentTeam.map(teamMember => teamMember.pokemon));
    } else {
      // Fallback to extracting from other sources if no opponent's team is defined
      // Extract Pokemon from leads and backs
      if (matchup.lead) allPokemon.push(...extractPokemonFromText(matchup.lead));
      if (matchup.back) allPokemon.push(...extractPokemonFromText(matchup.back));
      
      // Extract from conditional gameplans
      if (matchup.conditionalGameplans) {
        matchup.conditionalGameplans.forEach(gp => {
          if (gp.myLead) allPokemon.push(...extractPokemonFromText(gp.myLead));
          if (gp.myBack) allPokemon.push(...extractPokemonFromText(gp.myBack));
          if (gp.opponentLead) allPokemon.push(...extractPokemonFromText(gp.opponentLead));
        });
      }
    }
    
    return Array.from(new Set(allPokemon)); // Remove duplicates
  };

  const filteredMatchups = matchupKeys.filter(matchup => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in matchup name
    if (matchup.toLowerCase().includes(searchLower)) return true;
    
    // Search in Pokemon names for this matchup
    const matchupPokemon = getMatchupPokemon(matchup);
    return matchupPokemon.some(pokemon => 
      pokemon.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="matchup-selector">
      <h4>🎯 Interactive Matchup Guide</h4>
      <div className="matchup-dropdown">
        <div className="searchable-dropdown">
          <div className="search-input-container">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search matchups or Pokemon..."
              className="matchup-search-input"
            />
            <button
              className="dropdown-toggle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {isDropdownOpen ? '▲' : '▼'}
            </button>
          </div>
          
          {isDropdownOpen && (
            <div className="dropdown-results">
              {filteredMatchups.length === 0 ? (
                <div className="no-results-item">No matchups found</div>
              ) : (
                filteredMatchups.map(matchup => {
                  return (
                    <div
                      key={matchup}
                      className={`dropdown-item ${selectedMatchup === matchup ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMatchup(matchup);
                        setSearchTerm('');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div className="matchup-info">
                        <div className="matchup-name">{matchup}</div>
                        <DropdownPokemonSprites 
                          matchupKey={matchup}
                          gameplanContent={gameplan.content}
                          size={24}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      {selectedMatchup && matchups[selectedMatchup] && (
        <>
          <div className="matchup-details">
            <div className="matchup-header">
              <h5>vs {selectedMatchup}</h5>
            </div>
            <div className="matchup-recommendation">
              {/* Rival's Team - Compact Layout */}
              <div className="opponent-team-section" style={{ marginBottom: 16 }}>
                {/* Auto-fetched Pokepaste Data */}
                <PokepasteTeamDisplay 
                  content={gameplan.content} 
                  selectedMatchup={selectedMatchup} 
                />
                
                {/* Fallback to Manual Team Data */}
                {matchups[selectedMatchup].opponentTeam && matchups[selectedMatchup].opponentTeam!.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '14px', color: '#f87171' }}>👥 Rival's Team:</strong>
                    <div className="opponent-team-display" style={{ marginTop: 8 }}>
                      {(() => {
                        try {
                          const opponentTeamWithItems = extractOpponentTeamWithItems(gameplan.content, selectedMatchup);
                          if (opponentTeamWithItems && opponentTeamWithItems.length > 0) {
                            return opponentTeamWithItems.map((teamMember, index) => (
                              <div key={`${teamMember.pokemon}-${index}`} className="opponent-team-item">
                                <PokemonSprite 
                                  pokemon={teamMember.pokemon} 
                                  size={48}
                                  heldItem={teamMember.item}
                                  showItem={true}
                                />
                                <span className="opponent-team-name">{teamMember.pokemon}</span>
                              </div>
                            ));
                          } else if (matchups[selectedMatchup] && matchups[selectedMatchup].opponentTeam) {
                            return matchups[selectedMatchup].opponentTeam!.map((teamMember, index) => (
                              <div key={`${teamMember.pokemon}-${index}`} className="opponent-team-item">
                                <PokemonSprite 
                                  pokemon={teamMember.pokemon} 
                                  size={48}
                                  heldItem={teamMember.item}
                                  showItem={true}
                                />
                                <span className="opponent-team-name">{teamMember.pokemon}</span>
                              </div>
                            ));
                          } else {
                            return <div>No opponent team data</div>;
                          }
                        } catch (error) {
                          console.error('Error displaying opponent team:', error);
                          return <div>Error loading opponent team</div>;
                        }
                      })()}
                    </div>
                  </div>
                )}
                  
                {matchups[selectedMatchup].pokepasteUrl && (
                  <a 
                    href={matchups[selectedMatchup].pokepasteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="pokepaste-link"
                    style={{ marginTop: 8, display: 'inline-block', fontSize: '12px' }}
                  >
                    📋 Pokepaste
                  </a>
                )}
              </div>


              
              {/* --- New Gameplans Section --- */}
              {gameplansForMatchup.length > 0 && (
                <div className="gameplans-section">
                  <h5 style={{ marginBottom: 16, color: '#4fd1c5', fontWeight: 700, fontSize: 20 }}>📋 Gameplans</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {gameplansForMatchup.map((gp, idx) => (
                      <div
                        key={idx}
                        className="gameplan-card"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 12,
                          padding: 16,
                          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                          border: '1px solid #333',
                          marginBottom: 0,
                          color: '#e0e0e0',
                        }}
                      >
                        {/* Team Layout Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                          {/* My Team */}
                          <div>
                            <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: 6, fontSize: '13px' }}>My Team</div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#60a5fa', marginBottom: 3, fontSize: '11px' }}>Lead</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {extractPokemonFromText(gp.myLead).map(pokemon => (
                                    <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                                  ))}
                                </div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#60a5fa', marginBottom: 3, fontSize: '11px' }}>Back</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {extractPokemonFromText(gp.myBack).map(pokemon => (
                                    <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Rival's Team */}
                          <div>
                            <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 6, fontSize: '13px' }}>Rival's Team</div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#f87171', marginBottom: 3, fontSize: '11px' }}>Lead</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {extractPokemonFromText(gp.opponentLead).map(pokemon => (
                                    <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                                  ))}
                                </div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#f87171', marginBottom: 3, fontSize: '11px' }}>Back</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {extractPokemonFromText(gp.opponentBack).map(pokemon => (
                                    <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Replays Section - Carousel Layout */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 6, fontSize: '13px' }}>🎮 Replays</div>
                          {(() => {
                            const replays = (() => {
                              const matchupReplays = gameplan.replays?.[selectedMatchup];
                              const replays: Replay[] = [];
                              
                              // Get manually added replays from the app
                              if (matchupReplays) {
                                if (idx + 1) {
                                  // Show replays for specific gameplan
                                  const gameplanReplays = matchupReplays[(idx + 1).toString()] || [];
                                  replays.push(...gameplanReplays);
                                } else {
                                  // Show all replays for this matchup
                                  Object.entries(matchupReplays).forEach(([gameplanKey, gameplanReplays]) => {
                                    gameplanReplays.forEach(replay => {
                                      replays.push({
                                        ...replay,
                                        gameplanNumber: gameplanKey === 'general' ? undefined : parseInt(gameplanKey)
                                      });
                                    });
                                  });
                                }
                              }
                              
                              // Get replays from markdown file
                              const extractReplaysFromMarkdown = (content: string, matchup: string) => {
                                const lines = content.split('\n');
                                const markdownReplays: Replay[] = [];
                                
                                let inReplaysSection = false;
                                
                                for (let i = 0; i < lines.length; i++) {
                                  const line = lines[i].trim();
                                  
                                  // Check if we're entering the replays section
                                  if (line === '## Replays') {
                                    inReplaysSection = true;
                                    continue;
                                  }
                                  
                                  // Exit replays section if we hit another major section
                                  if (inReplaysSection && line.startsWith('## ') && line !== '## Replays') {
                                    inReplaysSection = false;
                                    break;
                                  }
                                  
                                  // Look for matchup-specific replay sections
                                  if (inReplaysSection && line.startsWith('### ') && line.toLowerCase().includes(matchup.toLowerCase())) {
                                    let j = i + 1;
                                    while (j < lines.length) {
                                      const nextLine = lines[j].trim();
                                      
                                      // Stop if we hit another section
                                      if (nextLine.startsWith('### ') || nextLine.startsWith('## ')) {
                                        break;
                                      }
                                      
                                      // Look for replay entries in the format: - [Result] URL - Notes
                                      const replayMatch = nextLine.match(/^-\s*\[(Win|Loss|Draw)\]\s*(https:\/\/replay\.pokemonshowdown\.com\/[^\s]+)\s*-\s*(.+)$/i);
                                      if (replayMatch) {
                                        const [, result, url, notes] = replayMatch;
                                        // Removed unused isPlaceholder variable
                                        
                                        // Try to extract gameplan number from the notes
                                        let gameplanNumber: number | undefined;
                                        if (notes.toLowerCase().includes('gameplan 1') || notes.toLowerCase().includes('gp1')) {
                                          gameplanNumber = 1;
                                        } else if (notes.toLowerCase().includes('gameplan 2') || notes.toLowerCase().includes('gp2')) {
                                          gameplanNumber = 2;
                                        } else if (notes.toLowerCase().includes('gameplan 3') || notes.toLowerCase().includes('gp3')) {
                                          gameplanNumber = 3;
                                        }
                                        
                                        // Only include if it matches the selected gameplan (if one is selected)
                                        if (!(idx + 1) || gameplanNumber === (idx + 1) || !gameplanNumber) {
                                          markdownReplays.push({
                                            id: `markdown-${matchup}-${j}`,
                                            url,
                                            matchup,
                                            gameplanNumber,
                                            dateAdded: new Date().toISOString(),
                                            description: notes.trim(),
                                            result: result.toLowerCase() as 'win' | 'loss' | 'draw'
                                          });
                                        }
                                      }
                                      
                                      j++;
                                    }
                                  }
                                }
                                
                                return markdownReplays;
                              };
                              
                              const markdownReplays = extractReplaysFromMarkdown(gameplan.content, selectedMatchup);
                              replays.push(...markdownReplays);
                              
                              return replays;
                            })();

                            if (replays.length === 0) {
                              return (
                                <div style={{ 
                                  color: 'rgba(255,255,255,0.6)', 
                                  fontStyle: 'italic', 
                                  textAlign: 'center',
                                  padding: '1rem',
                                  fontSize: '11px'
                                }}>
                                  No replays found
                                </div>
                              );
                            }

                            // Carousel state - using component-level state
                            const carouselKey = `${selectedMatchup}-${idx}`;
                            const currentSlide = replayCarouselStates[carouselKey] || 0;
                            const slidesToShow = 2; // Show 2 replays at a time
                            const totalSlides = replays.length;
                            const maxSlide = Math.max(0, totalSlides - slidesToShow);

                            const nextSlide = () => {
                              setReplayCarouselStates(prev => ({
                                ...prev,
                                [carouselKey]: Math.min((prev[carouselKey] || 0) + 1, maxSlide)
                              }));
                            };

                            const prevSlide = () => {
                              setReplayCarouselStates(prev => ({
                                ...prev,
                                [carouselKey]: Math.max((prev[carouselKey] || 0) - 1, 0)
                              }));
                            };

                            return (
                              <div style={{ position: 'relative' }}>
                                {/* Carousel Container */}
                                <div style={{ 
                                  display: 'flex', 
                                  gap: 12, 
                                  overflow: 'hidden',
                                  position: 'relative',
                                  padding: '0 40px' // Space for navigation buttons
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    gap: 12,
                                    transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)`,
                                    transition: 'transform 0.3s ease-in-out',
                                    width: `${(100 / slidesToShow) * totalSlides}%`
                                  }}>
                                    {replays.map((replay: Replay, index: number) => (
                                      <div 
                                        key={replay.id} 
                                        style={{
                                          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                          border: '1px solid rgba(255,255,255,0.15)',
                                          borderRadius: '12px',
                                          padding: '12px',
                                          width: `${100 / totalSlides}%`,
                                          minWidth: '200px',
                                          flexShrink: 0,
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                          backdropFilter: 'blur(10px)',
                                          transition: 'all 0.3s ease',
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
                                          e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)';
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                          <a
                                            href={replay.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ 
                                              color: '#60a5fa', 
                                              textDecoration: 'none', 
                                              fontWeight: 600, 
                                              fontSize: '11px',
                                              padding: '0.3rem 0.6rem',
                                              background: 'rgba(96, 165, 250, 0.1)',
                                              borderRadius: '6px',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)';
                                              e.currentTarget.style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)';
                                              e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                          >
                                            📺 View
                                          </a>
                                          <span style={{
                                            padding: '0.3rem 0.6rem',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: replay.result === 'win' ? 'rgba(34, 197, 94, 0.2)' : 
                                                       replay.result === 'loss' ? 'rgba(239, 68, 68, 0.2)' : 
                                                       'rgba(245, 158, 11, 0.2)',
                                            color: replay.result === 'win' ? '#22c55e' : 
                                                   replay.result === 'loss' ? '#ef4444' : '#f59e0b',
                                            border: `1px solid ${replay.result === 'win' ? 'rgba(34, 197, 94, 0.3)' : 
                                                              replay.result === 'loss' ? 'rgba(239, 68, 68, 0.3)' : 
                                                              'rgba(245, 158, 11, 0.3)'}`
                                          }}>
                                            {(replay.result || 'win').toUpperCase()}
                                          </span>
                                          {replay.gameplanNumber && (
                                            <span style={{
                                              padding: '0.3rem 0.6rem',
                                              borderRadius: '6px',
                                              fontSize: '0.7rem',
                                              fontWeight: 600,
                                              background: 'rgba(59, 130, 246, 0.2)',
                                              color: '#3b82f6',
                                              border: '1px solid rgba(59, 130, 246, 0.3)'
                                            }}>
                                              GP{replay.gameplanNumber}
                                            </span>
                                          )}
                                          {replay.id.startsWith('markdown-') && (
                                            <span style={{
                                              padding: '0.3rem 0.6rem',
                                              borderRadius: '6px',
                                              fontSize: '0.7rem',
                                              fontWeight: 600,
                                              background: 'rgba(139, 92, 246, 0.2)',
                                              color: '#8b5cf6',
                                              border: '1px solid rgba(139, 92, 246, 0.3)'
                                            }}>
                                              FILE
                                            </span>
                                          )}
                                        </div>
                                        {replay.description && (
                                          <div style={{ 
                                            color: 'rgba(255,255,255,0.8)', 
                                            fontSize: '11px', 
                                            marginBottom: '0.5rem', 
                                            lineHeight: '1.4',
                                            fontWeight: 500
                                          }}>
                                            {replay.description.length > 300 ? replay.description.substring(0, 300) + '...' : replay.description}
                                          </div>
                                        )}
                                        <div style={{ 
                                          color: 'rgba(255,255,255,0.6)', 
                                          fontSize: '10px',
                                          fontWeight: 500
                                        }}>
                                          {new Date(replay.dateAdded).toLocaleDateString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Navigation Buttons */}
                                {totalSlides > slidesToShow && (
                                  <>
                                    {/* Previous Button */}
                                    <button
                                      onClick={prevSlide}
                                      disabled={currentSlide === 0}
                                      style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: currentSlide === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.2)',
                                        border: `1px solid ${currentSlide === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.4)'}`,
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                                        color: currentSlide === 0 ? 'rgba(255,255,255,0.3)' : '#10b981',
                                        fontSize: '16px',
                                        transition: 'all 0.2s ease',
                                        zIndex: 10
                                      }}
                                      onMouseEnter={(e) => {
                                        if (currentSlide !== 0) {
                                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)';
                                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (currentSlide !== 0) {
                                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                        }
                                      }}
                                    >
                                      ‹
                                    </button>

                                    {/* Next Button */}
                                    <button
                                      onClick={nextSlide}
                                      disabled={currentSlide >= maxSlide}
                                      style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: currentSlide >= maxSlide ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.2)',
                                        border: `1px solid ${currentSlide >= maxSlide ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.4)'}`,
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: currentSlide >= maxSlide ? 'not-allowed' : 'pointer',
                                        color: currentSlide >= maxSlide ? 'rgba(255,255,255,0.3)' : '#10b981',
                                        fontSize: '16px',
                                        transition: 'all 0.2s ease',
                                        zIndex: 10
                                      }}
                                      onMouseEnter={(e) => {
                                        if (currentSlide < maxSlide) {
                                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)';
                                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (currentSlide < maxSlide) {
                                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                        }
                                      }}
                                    >
                                      ›
                                    </button>
                                  </>
                                )}

                                {/* Dots Indicator */}
                                {totalSlides > slidesToShow && (
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    marginTop: '12px'
                                  }}>
                                                                         {Array.from({ length: maxSlide + 1 }, (_, i) => (
                                       <button
                                         key={i}
                                         onClick={() => setReplayCarouselStates(prev => ({
                                           ...prev,
                                           [carouselKey]: i
                                         }))}
                                        style={{
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '50%',
                                          background: i === currentSlide ? '#10b981' : 'rgba(255,255,255,0.3)',
                                          border: 'none',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (i !== currentSlide) {
                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.6)';
                                            e.currentTarget.style.transform = 'scale(1.2)';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (i !== currentSlide) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                                            e.currentTarget.style.transform = 'scale(1)';
                                          }
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Win Conditions Section - Horizontal Layout */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#34d399', marginBottom: 3, fontSize: '12px' }}>My Wincon</div>
                            <div style={{ fontSize: '11px', lineHeight: '1.3', color: '#d1d5db' }}>{gp.myWincon}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: 3, fontSize: '12px' }}>Rival's Wincon</div>
                            <div style={{ fontSize: '11px', lineHeight: '1.3', color: '#d1d5db' }}>{gp.theirWincon}</div>
                          </div>
                        </div>

                        {/* First 3 Turns - Compact Layout */}
                        <div>
                          <div style={{ fontWeight: 600, color: '#a78bfa', marginBottom: 6, fontSize: '12px' }}>First 3 Turns</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
                            {gp.first3Turns.map((turn: string, i: number) => {
                              // Skip empty lines
                              if (!turn.trim()) {
                                return null;
                              }
                              
                              // Skip replay-related content in First 3 Turns
                              if (turn.includes('**Replay Examples:**') || turn.includes('**Replay Examples-G1:**') || turn.includes('**Replay Examples-G2:**') || turn.includes('**Replay Examples-G3:**') || turn.includes('**Replay:**') || turn.includes('**Result:**') || turn.includes('**Notes:**')) {
                                return null;
                              }
                              
                              // Regular turn instruction
                              return (
                                <div key={i} style={{ 
                                  padding: '6px 10px', 
                                  background: 'rgba(168, 139, 250, 0.1)', 
                                  borderRadius: '6px',
                                  border: '1px solid rgba(168, 139, 250, 0.2)',
                                  fontSize: '11px',
                                  lineHeight: '1.3',
                                  color: '#e0e0e0'
                                }}>
                                  {turn.replace(/\btheir\b/gi, "rival's")}
                                </div>
                              );
                            }).filter(Boolean)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Notes Card (only once, after all gameplans) */}
                  {(() => {
                    const notes = extractNotesSection(gameplan.content);
                    if (notes) {
                      return (
                        <div
                          className="notes-card"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                            border: '1px solid #333',
                            color: '#e0e0e0',
                            marginTop: 16,
                          }}
                        >
                          <h5 style={{ color: '#fbbf24', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>📝 Notes</h5>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>{notes}</pre>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Damage Calculations Section */}
              {(() => {
                const damageCalcs = extractDamageCalcs(gameplan.content, selectedMatchup);
                if (Object.keys(damageCalcs).length > 0) {
                  // Extract Pokemon from the matchup for sprite display
                  const matchupData = matchups[selectedMatchup];
                  const allPokemonInMatchup: string[] = [];
                  
                  if (matchupData) {
                    // Extract Pokemon from lead and back
                    if (matchupData.lead) {
                      allPokemonInMatchup.push(...extractPokemonFromText(matchupData.lead));
                    }
                    if (matchupData.back) {
                      allPokemonInMatchup.push(...extractPokemonFromText(matchupData.back));
                    }
                    
                    // Add opponent team Pokemon
                    if (matchupData.opponentTeam) {
                      allPokemonInMatchup.push(...matchupData.opponentTeam.map(p => p.pokemon));
                    }
                  }
                  
                  const uniquePokemon = Array.from(new Set(allPokemonInMatchup));
                  const calcsByPokemon: { [key: string]: { [key: string]: string } } = {};
                  
                  // Group calculations by Pokemon
                  Object.entries(damageCalcs).forEach(([calcName, calcContent]) => {
                    for (const pokemon of uniquePokemon) {
                      if (calcName.toLowerCase().includes(pokemon.toLowerCase()) || 
                          calcContent.toLowerCase().includes(pokemon.toLowerCase())) {
                        if (!calcsByPokemon[pokemon]) {
                          calcsByPokemon[pokemon] = {};
                        }
                        calcsByPokemon[pokemon][calcName] = calcContent;
                      }
                    }
                  });
                  
                  return (
                    <div className="damage-calculations-section">
                      <h5 style={{ marginBottom: 12, color: '#fbbf24', fontWeight: 700, fontSize: 16 }}>⚔️ Damage Calculations</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', 
                          gap: 8,
                          marginBottom: 12
                        }}>
                          {uniquePokemon.map(pokemon => (
                                                          <div
                                key={pokemon}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: 8,
                                  background: selectedPokemonForCalcs === pokemon ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                                  border: `2px solid ${selectedPokemonForCalcs === pokemon ? '#fbbf24' : '#333'}`,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  minHeight: 80,
                                  justifyContent: 'center'
                                }}
                              onClick={() => setSelectedPokemonForCalcs(selectedPokemonForCalcs === pokemon ? '' : pokemon)}
                              onMouseEnter={(e) => {
                                if (selectedPokemonForCalcs !== pokemon) {
                                  e.currentTarget.style.border = '2px solid #fbbf24';
                                  e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedPokemonForCalcs !== pokemon) {
                                  e.currentTarget.style.border = '2px solid #333';
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }
                              }}
                            >
                              <PokemonSprite pokemon={pokemon} size={48} />
                              <div style={{ 
                                fontSize: 11, 
                                color: '#e0e0e0', 
                                textAlign: 'center',
                                fontWeight: 500,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {pokemon}
                              </div>
                              {calcsByPokemon[pokemon] && (
                                <div style={{ 
                                  fontSize: 9, 
                                  color: '#fbbf24',
                                  fontWeight: 600
                                }}>
                                  {Object.keys(calcsByPokemon[pokemon]).length} calcs
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {selectedPokemonForCalcs && calcsByPokemon[selectedPokemonForCalcs] && (
                          <div style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: 6,
                            padding: 12
                          }}>
                            <h6 style={{ color: '#fbbf24', marginBottom: 8, fontSize: 14 }}>Calculations for {selectedPokemonForCalcs}</h6>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {Object.entries(calcsByPokemon[selectedPokemonForCalcs]).map(([calcName, calcContent]) => (
                                <div key={calcName} style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(251, 191, 36, 0.2)',
                                  borderRadius: 4,
                                  padding: 8
                                }}>
                                  <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 3, fontSize: 12 }}>{calcName}</div>
                                  <pre style={{ 
                                    color: '#e0e0e0', 
                                    fontSize: 11, 
                                    whiteSpace: 'pre-wrap', 
                                    fontFamily: 'inherit',
                                    margin: 0
                                  }}>{calcContent}</pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Cheat Sheet Component
const CheatSheet: React.FC<{ 
  gameplan: Gameplan;
  onReplayAdded?: (replay: Replay) => void;
  onReplayDeleted?: (replayId: string) => void;
}> = ({ gameplan, onReplayAdded, onReplayDeleted }) => {
  const [pokepasteTeamData, setPokepasteTeamData] = useState<string[]>([]);

  const extractCheatSheetData = (content: string) => {
    const lines = content.split('\n');
    const leads: string[] = [];
    const matchups: { opponent: string; strategy: string }[] = [];

    // Extract leads
    const leadStart = lines.findIndex(line => 
      line.toLowerCase().includes('lead') && (line.includes('🚀') || line.includes('primary'))
    );
    
    if (leadStart !== -1) {
      for (let i = leadStart; i < lines.length && i < leadStart + 15; i++) {
        const line = lines[i];
        if (line.includes('-') && (line.toLowerCase().includes('lead') || line.includes('+'))) {
          const leadMatch = line.match(/(?:Lead|lead):\s*([^*\n]+)/i);
          if (leadMatch) {
            leads.push(leadMatch[1].trim());
          }
        }
      }
    }

    // Extract matchups
    const matchupStart = lines.findIndex(line => 
      line.toLowerCase().includes('matchup') && (line.includes('⚔️') || line.includes('vs'))
    );
    
    if (matchupStart !== -1) {
      for (let i = matchupStart; i < lines.length && i < matchupStart + 30; i++) {
        const line = lines[i];
        if (line.includes('###') && line.toLowerCase().includes('vs ')) {
          const opponent = line.replace(/###?\s*/g, '').replace(/vs\s*/i, '').trim();
          let strategy = '';
          for (let j = i + 1; j < lines.length && j < i + 10; j++) {
            if (lines[j].includes('Strategy') || lines[j].includes('why this works')) {
              for (let k = j + 1; k < lines.length && k < j + 5; k++) {
                if (lines[k].trim() && !lines[k].includes('###') && !lines[k].includes('**')) {
                  strategy += lines[k].trim() + ' ';
                }
                if (strategy.length > 100) break;
              }
              break;
            }
          }
          if (opponent && strategy) {
            matchups.push({ opponent, strategy: strategy.trim() });
          }
        }
      }
    }

    return { leads, matchups };
  };

  const { leads, matchups } = extractCheatSheetData(gameplan.content);
  
  // Use pokepaste data if available, otherwise fallback to manual extraction
  const allPokemon = pokepasteTeamData.length > 0 ? pokepasteTeamData : extractPokemonFromContent(gameplan);
  const teamWithItems = extractTeamPokemonWithItems(gameplan.content);
  


  return (
    <div className="cheat-sheet">
      <h3>🎯 Quick Reference</h3>
      
      {/* Team Overview */}
      <div className="cheat-section">
        <h4>Team Composition</h4>
        
        {/* Auto-fetched My Team Pokepaste Data */}
        <MyTeamPokepasteDisplay 
          content={gameplan.content} 
          onPokemonDataLoaded={setPokepasteTeamData}
        />
        
        {/* Fallback to Manual Team Data - Only show if no pokepaste data */}
        {!gameplan.content.toLowerCase().includes('my team:') || !gameplan.content.match(/https:\/\/pokepast\.es\/[a-f0-9]+/i) ? (
          <div className="pokemon-team-display">
            {teamWithItems && teamWithItems.length > 0 ? (
              teamWithItems.slice(0, 6).map((teamMember, index) => {
                return (
                  <div 
                    key={`${teamMember.pokemon}-${index}`} 
                    className="pokemon-team-item"
                  >
                    <PokemonSprite 
                      pokemon={teamMember.pokemon} 
                      size={56} 
                      heldItem={teamMember.item}
                      showItem={true}
                    />
                    <span className="pokemon-name-compact">{teamMember.pokemon}</span>
                  </div>
                );
              })
            ) : allPokemon && allPokemon.length > 0 ? (
              allPokemon.slice(0, 6).map(pokemon => {
                return (
                  <div 
                    key={pokemon} 
                    className="pokemon-team-item"
                  >
                    <PokemonSprite pokemon={pokemon} size={56} />
                    <span className="pokemon-name-compact">{pokemon}</span>
                  </div>
                );
              })
            ) : (
              <div>No team data found</div>
            )}
          </div>
        ) : null}
      </div>



      {/* Interactive Matchup Selector */}
      <MatchupSelector 
        gameplan={gameplan} 
        onReplayAdded={onReplayAdded}
        onReplayDeleted={onReplayDeleted}
      />

      {/* Lead Options */}
      {leads.length > 0 && (
        <div className="cheat-section">
          <h4>🚀 Primary Leads</h4>
          <div className="leads-list">
            {leads.map((lead, index) => (
              <div key={index} className="lead-option">
                <span className="lead-number">{index + 1}.</span>
                <div className="lead-combo">
                  <div className="pokemon-combo-display">
                    {extractPokemonFromText(lead).map(pokemon => (
                      <div key={pokemon} className="pokemon-combo-item">
                        <PokemonSprite pokemon={pokemon} size={40} />
                        <span className="pokemon-combo-name">{pokemon}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pokemon-combo-text">{lead}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Matchups */}
      {matchups.length > 0 && (
        <div className="cheat-section">
          <h4>⚔️ Key Matchups</h4>
          <div className="matchups-list">
            {matchups.slice(0, 3).map((matchup, index) => (
              <div key={index} className="matchup-item">
                <div className="matchup-opponent">{matchup.opponent}</div>
                <div className="matchup-strategy">{matchup.strategy}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Gameplan List Item Component (with async Pokemon loading)
const GameplanListItem: React.FC<{ 
  gameplan: Gameplan;
  isSelected: boolean;
  onView: (gameplan: Gameplan) => void;
  onEdit: (gameplan: Gameplan) => void;
  onDelete: (gameplanId: string) => void;
}> = ({ gameplan, isSelected, onView, onEdit, onDelete }) => {
  const [pokemonList, setPokemonList] = useState<string[]>([]);

  return (
    <div 
      key={gameplan.id} 
      className={`gameplan-list-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onView(gameplan)}
    >
      {/* Hidden component that loads Pokemon names */}
      <PokemonNamesLoader 
        content={gameplan.content} 
        onPokemonNamesLoaded={setPokemonList}
      />
      
      <div className="gameplan-list-header">
        <h4 className="gameplan-list-title">{gameplan.title || 'Untitled'}</h4>
        <div className="gameplan-list-actions">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(gameplan); }}
            className="btn-icon edit"
            title="Edit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(gameplan.id); }}
            className="btn-icon delete"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
      
      {pokemonList && pokemonList.length > 0 && (
        <div className="pokemon-row">
          {pokemonList.slice(0, 6).map((pokemon, index) => (
            <div key={`${pokemon}-${index}`} className="pokemon-mini">
              <PokemonSprite pokemon={pokemon} size={58} />
            </div>
          ))}
          {pokemonList.length > 6 && (
            <span className="pokemon-more">+{pokemonList.length - 6}</span>
          )}
        </div>
      )}
      
      <div className="gameplan-list-meta">
        <div className="tags-mini">
          {gameplan.tags && gameplan.tags.slice(0, 2).map(tag => (
            <span key={tag} className="tag-mini">{tag}</span>
          ))}
          {gameplan.tags && gameplan.tags.length > 2 && (
            <span className="tag-mini">+{gameplan.tags.length - 2}</span>
          )}
        </div>
        <div className="date-mini">
          {gameplan.season && <span className="season-mini">S{gameplan.season}</span>}
          <span className="date-text">{gameplan.dateCreated}</span>
        </div>
      </div>
    </div>
  );
};

// Simple Pokemon Names Loader (for left panel sprites)
const PokemonNamesLoader: React.FC<{ 
  content: string;
  onPokemonNamesLoaded: (pokemon: string[]) => void;
}> = ({ content, onPokemonNamesLoaded }) => {

  useEffect(() => {
    const extractMyTeamPokepasteUrl = (content: string): string | null => {
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for "My Team" pokepaste links
        if (line.toLowerCase().includes('my team:') || line.toLowerCase().includes('**my team:**')) {
          const pokepasteMatch = line.match(/https:\/\/pokepast\.es\/[a-f0-9]+/i);
          if (pokepasteMatch) {
            return pokepasteMatch[0];
          }
        }
      }
      
      return null;
    };

    const loadPokemonNames = async () => {
      const url = extractMyTeamPokepasteUrl(content);
      if (!url) {
        // No pokepaste URL found, try manual extraction
        const teamWithItems = extractTeamPokemonWithItems(content);
        if (teamWithItems && teamWithItems.length > 0) {
          onPokemonNamesLoaded(teamWithItems.map(tm => tm.pokemon));
                 } else {
           // Final fallback to regex extraction (same as extractPokemonFromContent)
           const pokemonNames = Object.keys(POKEMON_ID_MAP);
           const found: string[] = [];
           
           pokemonNames.forEach(pokemon => {
             try {
               const regex = new RegExp(`\\b${pokemon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
               if (regex.test(content)) {
                 found.push(pokemon);
               }
             } catch (regexError) {
               // Skip problematic Pokemon names
             }
           });
           
           onPokemonNamesLoaded(Array.from(new Set(found)).slice(0, 6));
         }
        return;
      }

      try {
        const data = await fetchPokepasteData(url);
        
        if (data && data.pokemon) {
          const pokemonNames = data.pokemon.map(p => p.name);
          onPokemonNamesLoaded(pokemonNames);
        } else {
          // Fallback to manual extraction if pokepaste fails
          const teamWithItems = extractTeamPokemonWithItems(content);
          if (teamWithItems && teamWithItems.length > 0) {
            onPokemonNamesLoaded(teamWithItems.map(tm => tm.pokemon));
          } else {
            onPokemonNamesLoaded([]);
          }
        }
      } catch (err) {
        console.error('Error loading Pokemon names from pokepaste:', err);
        // Fallback to manual extraction
        const teamWithItems = extractTeamPokemonWithItems(content);
        if (teamWithItems && teamWithItems.length > 0) {
          onPokemonNamesLoaded(teamWithItems.map(tm => tm.pokemon));
        } else {
          onPokemonNamesLoaded([]);
        }
      }
    };

    loadPokemonNames();
  }, [content, onPokemonNamesLoaded]);

  // This component doesn't render anything - it just loads data
  return null;
};

// My Team Pokepaste Display Component
const MyTeamPokepasteDisplay: React.FC<{ 
  content: string;
  onPokemonDataLoaded?: (pokemon: string[]) => void;
}> = ({ content, onPokemonDataLoaded }) => {
  const [pokepasteData, setPokepasteData] = useState<OpponentTeamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pokepasteUrl, setPokepasteUrl] = useState<string | null>(null);
  const onPokemonDataLoadedRef = useRef(onPokemonDataLoaded);
  
  // Update the ref when the callback changes
  useEffect(() => {
    onPokemonDataLoadedRef.current = onPokemonDataLoaded;
  }, [onPokemonDataLoaded]);

  useEffect(() => {
    const extractMyTeamPokepasteUrl = (content: string): string | null => {
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for "My Team" pokepaste links
        if (line.toLowerCase().includes('my team:') || line.toLowerCase().includes('**my team:**')) {
          const pokepasteMatch = line.match(/https:\/\/pokepast\.es\/[a-f0-9]+/i);
          if (pokepasteMatch) {
            return pokepasteMatch[0];
          }
        }
      }
      
      return null;
    };

    const loadMyTeamData = async () => {
      const url = extractMyTeamPokepasteUrl(content);
      if (!url) {
        console.log('No "My Team" pokepaste URL found');
        setPokepasteUrl(null);
        return;
      }

      setPokepasteUrl(url);
      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading my team pokepaste data from:', url);
        const data = await fetchPokepasteData(url);
        
        if (data) {
          setPokepasteData(data);
          console.log('Successfully loaded my team pokepaste data:', data);
          console.log('Pokemon data structure:', data.pokemon.map(p => ({ 
            name: p.name, 
            item: p.item, 
            ability: p.ability, 
            teraType: p.teraType, 
            moves: p.moves,
            allProps: Object.keys(p)
          })));
          
          // Notify parent component of the pokemon names
          if (onPokemonDataLoadedRef.current && data.pokemon) {
            const pokemonNames = data.pokemon.map(p => p.name);
            onPokemonDataLoadedRef.current(pokemonNames);
          }
        } else {
          setError('Failed to load team data from Pokepaste');
        }
      } catch (err) {
        console.error('Error loading my team Pokepaste:', err);
        setError('Network error while loading team data');
      } finally {
        setLoading(false);
      }
    };

    loadMyTeamData();
  }, [content]); // Removed onPokemonDataLoaded from dependencies to avoid re-rendering when function reference changes

  if (loading) {
    return (
      <div className="pokepaste-loading">
        <span>🔄 Loading your team from Pokepaste...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pokepaste-error">
        <span>⚠️ {error}</span>
      </div>
    );
  }

  if (!pokepasteData || !pokepasteData.pokemon.length) {
    return null;
  }

  return (
    <div className="my-team-pokepaste-display">
      <div className="pokepaste-header">
        <strong>Team Composition</strong>
        {pokepasteUrl && (
          <a 
            href={pokepasteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="pokepaste-link"
          >
            📋 Pokepaste
          </a>
        )}
      </div>
      <div className="my-team-pokemon-grid">
        {pokepasteData.pokemon.map((pokemon, index) => (
          <div key={`my-team-${pokemon.name}-${index}`} className="my-team-pokemon-item">
            <div className="pokemon-sprite-section">
              <PokemonSprite 
                pokemon={pokemon.name} 
                size={72}
                heldItem={pokemon.item}
                showItem={true}
              />
            </div>
            <div className="pokemon-details-section">
              <div className="pokemon-header">
                <span className="pokemon-name">{pokemon.name}</span>
                {pokemon.item && <span className="pokemon-item">@ {pokemon.item}</span>}
              </div>
              <div className="pokemon-info">
                {pokemon.ability && <span className="pokemon-ability">Ability: {pokemon.ability}</span>}
                {pokemon.teraType && <span className="pokemon-tera">Tera: {pokemon.teraType}</span>}
              </div>
              {pokemon.moves.length > 0 && (
                <div className="pokemon-moves-section">
                  <span className="moves-label">Moves:</span>
                  <div className="pokemon-moves-list">
                    {pokemon.moves.map((move, moveIndex) => (
                      <span key={moveIndex} className="pokemon-move">{move}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pokepaste Team Display Component
const PokepasteTeamDisplay: React.FC<{ 
  content: string; 
  selectedMatchup: string; 
}> = ({ content, selectedMatchup }) => {
  const [pokepasteData, setPokepasteData] = useState<OpponentTeamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractPokepasteUrl = (content: string, matchup: string): string | null => {
      const lines = content.split('\n');
      let inMatchupSection = false;
      let foundMatchupSection = false;
      let inStrategiesSection = false;
      
      console.log(`[DEBUG] extractPokepasteUrl called with matchup: "${matchup}"`);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if we're in the Matchup-Specific Strategies section
        if (line.includes('## Matchup-Specific Strategies')) {
          inStrategiesSection = true;
          continue;
        }
        
        // Check if we're entering the matchup section (only in strategies section)
        if (inStrategiesSection && (line.toLowerCase().includes(`vs ${matchup.toLowerCase()}`) || 
            line.toLowerCase().includes(`### vs ${matchup.toLowerCase()}`))) {
          console.log(`[DEBUG] Found matchup section at line ${i}: "${line}"`);
          inMatchupSection = true;
          foundMatchupSection = true;
          continue;
        }
        
        // Check if we're leaving the matchup section
        if (foundMatchupSection && inMatchupSection && 
            (line.startsWith('###') || line.startsWith('##')) && 
            !line.toLowerCase().includes(matchup.toLowerCase())) {
          console.log(`[DEBUG] Leaving matchup section at line ${i}: "${line}"`);
          break;
        }
        
        // Look for Pokepaste links only within the correct matchup section
        if (inMatchupSection) {
          // First try to match markdown link format: [Pokepaste](https://pokepast.es/...)
          const markdownMatch = line.match(/\[Pokepaste\]\((https:\/\/pokepast\.es\/[a-f0-9-]+)\)/i);
          if (markdownMatch) {
            console.log(`[DEBUG] Found pokepaste URL: ${markdownMatch[1]}`);
            return markdownMatch[1];
          }
          // Fallback to direct URL format
          const pokepasteMatch = line.match(/https:\/\/pokepast\.es\/[a-f0-9-]+/i);
          if (pokepasteMatch) {
            console.log(`[DEBUG] Found direct pokepaste URL: ${pokepasteMatch[0]}`);
            return pokepasteMatch[0];
          }
        }
      }
      
      console.log(`[DEBUG] No pokepaste URL found for matchup: "${matchup}"`);
      return null;
    };

    const loadPokepasteData = async () => {
      const url = extractPokepasteUrl(content, selectedMatchup);
      if (!url) {
        console.log('No pokepaste URL found for matchup:', selectedMatchup);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading pokepaste data from:', url);
        const data = await fetchPokepasteData(url);
        
        if (data) {
          setPokepasteData(data);
          console.log('Successfully loaded pokepaste data:', data);
        } else {
          // Check if this is an example URL
          const isExample = url.includes('example-') || !url.match(/pokepast\.es\/[a-f0-9]{12,}/i);
          if (isExample) {
            setError('This is an example Pokepaste URL. Please replace with a real team URL.');
          } else {
            setError('Failed to load team data. The Pokepaste may be private or invalid.');
          }
        }
      } catch (err) {
        console.error('Error loading Pokepaste:', err);
        setError('Network error while loading Pokepaste data');
      } finally {
        setLoading(false);
      }
    };

    if (selectedMatchup) {
      loadPokepasteData();
    }
  }, [content, selectedMatchup]);

  if (loading) {
    return (
      <div className="pokepaste-loading">
        <span>🔄 Loading opponent team from Pokepaste...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pokepaste-error">
        <span>⚠️ {error}</span>
      </div>
    );
  }

  if (!pokepasteData || !pokepasteData.pokemon.length) {
    return null;
  }

  return (
    <div className="pokepaste-team-display">
      <div className="pokepaste-header">
        <strong>🔗 Rival's team:</strong>
        {pokepasteData.title && <span className="pokepaste-title">{pokepasteData.title}</span>}
        {pokepasteData.author && <span className="pokepaste-author">by {pokepasteData.author}</span>}
      </div>
      <div className="pokepaste-pokemon-grid">
        {pokepasteData.pokemon.map((pokemon, index) => (
          <div key={`pokepaste-${pokemon.name}-${index}`} className="pokepaste-pokemon-item">
            <PokemonSprite 
              pokemon={pokemon.name} 
              size={72}
              heldItem={pokemon.item}
              showItem={true}
            />
            <div className="pokepaste-pokemon-details">
              <span className="pokepaste-pokemon-name">{pokemon.name}</span>
              {pokemon.item && <span className="pokepaste-pokemon-item">@ {pokemon.item}</span>}
              {pokemon.ability && <span className="pokepaste-pokemon-ability">Ability: {pokemon.ability}</span>}
              {pokemon.teraType && <span className="pokepaste-pokemon-tera">Tera: {pokemon.teraType}</span>}
              {pokemon.moves.length > 0 && (
                <div className="pokepaste-pokemon-moves">
                  <span className="moves-label">Moves:</span>
                  <div className="pokemon-moves-list">
                    {pokemon.moves.map((move, moveIndex) => (
                      <span key={moveIndex} className="pokepaste-move">{move}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Add back the OpponentTeamData interface and fetchPokepasteData function
interface PokemonData {
  name: string;
  item?: string;
  ability?: string;
  teraType?: string;
  moves: string[];
}

interface OpponentTeamData {
  pokemon: PokemonData[];
  title?: string;
  author?: string;
}

const fetchPokepasteData = async (url: string): Promise<OpponentTeamData | null> => {
  try {
    // Extract the ID from the Pokepaste URL
    const urlMatch = url.match(/pokepast\.es\/([a-f0-9]+)/i);
    if (!urlMatch) {
      console.warn('Invalid pokepaste URL format:', url);
      return null;
    }
    const pokepasteId = urlMatch[1];
    // Try multiple endpoints in order of preference
    const endpoints = [
      `https://pokepast.es/${pokepasteId}/raw`,
      `https://pokepast.es/${pokepasteId}.txt`,
      `https://cors-anywhere.herokuapp.com/https://pokepast.es/${pokepasteId}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://pokepast.es/${pokepasteId}`)}`
    ];
    let text = '';
    let response: Response | null = null;
    for (const endpoint of endpoints) {
      try {
        response = await fetch(endpoint);
        if (response.ok) {
          if (endpoint.includes('allorigins.win')) {
            const data = await response.json();
            text = data.contents;
          } else {
            text = await response.text();
          }
          if (text && (text.includes('@') || text.includes('Ability:') || text.includes('EVs:'))) {
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }
    if (!text) {
      return null;
    }
    const pokemon: PokemonData[] = [];
    const lines = text.split('\n');
    let currentPokemon: Partial<PokemonData> | null = null;
    let title = '';
    let author = '';
    const isHtmlContent = text.includes('<html>') || text.includes('<title>');
    for (const line of lines) {
      const trimmed = line.trim();
      if (isHtmlContent) {
        if (trimmed.includes('<title>') && !title) {
          const titleMatch = trimmed.match(/<title>(.+?)<\/title>/);
          if (titleMatch) title = titleMatch[1].replace(' · Pokepaste', '');
        }
        if (trimmed.startsWith('##') && trimmed.includes('by ')) {
          const authorMatch = trimmed.match(/by (.+)/);
          if (authorMatch) author = authorMatch[1];
        }
        if (trimmed.includes('<') && trimmed.includes('>')) {
          continue;
        }
      } else {
        if (!title && trimmed && !trimmed.includes('@') && !trimmed.startsWith('-') && 
            !trimmed.startsWith('Ability:') && !trimmed.startsWith('EVs:') && 
            !trimmed.startsWith('Level:') && !trimmed.startsWith('Tera Type:') &&
            !trimmed.startsWith('IVs:') && !trimmed.includes('Nature') && lines.indexOf(line) < 5) {
          if (trimmed.length > 3 && !trimmed.match(/^[A-Z][a-z]+\s*@/)) {
            title = trimmed;
          }
        }
        if (trimmed.toLowerCase().startsWith('by ') && !author) {
          author = trimmed.substring(3).trim();
        }
      }
      if (!trimmed || (isHtmlContent && (trimmed.includes('<') || trimmed.includes('>')))) {
        continue;
      }
      if (trimmed.includes(' @ ') || (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('Ability:') && !trimmed.startsWith('Tera Type:') && !trimmed.startsWith('EVs:') && !trimmed.startsWith('IVs:') && !trimmed.includes('Nature') && !trimmed.startsWith('#') && !trimmed.startsWith('Format:') && !trimmed.startsWith('by ') && !trimmed.startsWith('Level:') && currentPokemon === null)) {
        if (currentPokemon && currentPokemon.name) {
          pokemon.push({
            name: currentPokemon.name,
            item: currentPokemon.item,
            ability: currentPokemon.ability,
            teraType: currentPokemon.teraType,
            moves: currentPokemon.moves || []
          });
        }
        const parts = trimmed.split(' @ ');
        const pokemonName = parts[0].replace(/\(.*?\)/g, '').trim();
        const item = parts[1] || undefined;
        currentPokemon = {
          name: pokemonName,
          item,
          moves: []
        };
      } else if (trimmed.startsWith('Ability:') && currentPokemon) {
        currentPokemon.ability = trimmed.replace('Ability:', '').trim();
      } else if (trimmed.startsWith('Tera Type:') && currentPokemon) {
        currentPokemon.teraType = trimmed.replace('Tera Type:', '').trim();
      } else if (trimmed.startsWith('- ') && currentPokemon) {
        const move = trimmed.replace('- ', '').trim();
        if (!currentPokemon.moves) currentPokemon.moves = [];
        currentPokemon.moves.push(move);
      }
    }
    if (currentPokemon && currentPokemon.name) {
      pokemon.push({
        name: currentPokemon.name,
        item: currentPokemon.item,
        ability: currentPokemon.ability,
        teraType: currentPokemon.teraType,
        moves: currentPokemon.moves || []
      });
    }
    return {
      pokemon: pokemon.filter((p: any) => p.name),
      title: title || undefined,
      author: author || undefined
    };
  } catch (error) {
    return null;
  }
};

function App() {
  const [gameplans, setGameplans] = useState<Gameplan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');

  const [sortBy, setSortBy] = useState<'date' | 'title' | 'season'>('date');
  const [selectedGameplan, setSelectedGameplan] = useState<Gameplan | null>(null);

  // Expose test function to window for debugging
  React.useEffect(() => {
    (window as any).testPokemonItemParsing = testPokemonItemParsing;
    (window as any).debugGameplan = (gameplanId: string) => {
      const gameplan = gameplans.find(gp => gp.id === gameplanId);
      if (gameplan) {
        console.log('Gameplan content:', gameplan.content);
        console.log('Team with items:', extractTeamPokemonWithItems(gameplan.content));
      } else {
        console.log('Gameplan not found');
      }
    };
    (window as any).debugCurrentGameplan = () => {
      if (selectedGameplan) {
        console.log('Current gameplan content:', selectedGameplan.content);
        console.log('Team with items:', extractTeamPokemonWithItems(selectedGameplan.content));
      } else {
        console.log('No gameplan selected');
      }
    };
    (window as any).testItemSprites = () => {
      console.log('=== Testing Item Sprites ===');
      const testItems = ['Choice Scarf', 'Life Orb', 'Focus Sash', 'Covert Cloak', 'Rusted Shield'];
      testItems.forEach(item => {
        const url = getItemSpriteUrlSync(item);
        console.log(`${item} -> ${url}`);
      });
    };
    (window as any).testOpponentTeam = () => {
      if (selectedGameplan) {
        console.log('=== Testing Opponent Team Parsing ===');
        // This will be implemented when we move extractMatchups outside the component
        console.log('Test function ready - check console logs for opponent team data');
      } else {
        console.log('No gameplan selected');
      }
    };
    (window as any).testPokepasteConversion = () => {
      const samplePokepaste = `Calyrex-Shadow @ Life Orb  
Ability: As One (Spectrier)  
Level: 99  
Tera Type: Dark  
EVs: 28 HP / 36 Def / 180 SpA / 12 SpD / 252 Spe  
Timid Nature  
IVs: 0 Atk  
- Astral Barrage  
- Psychic  
- Nasty Plot  
- Protect  

Zamazenta @ Rusted Shield  
Ability: Dauntless Shield  
Level: 99  
Shiny: Yes  
Tera Type: Grass  
EVs: 204 HP / 4 Atk / 180 Def / 28 SpD / 92 Spe  
Impish Nature  
- Body Press  
- Heavy Slam  
- Wide Guard  
- Protect`;
      
      console.log('=== Testing Pokepaste Conversion ===');
      console.log('Sample Pokepaste:', samplePokepaste);
      
      console.log('Testing direct parsing...');
      const directParsed = parsePokepasteFormat(samplePokepaste);
      console.log('Direct pokepaste parsing result:', directParsed);
      
      console.log('Testing detection and conversion...');
      const converted = convertPokepasteToMarkdown(samplePokepaste);
      console.log('Converted to Markdown:', converted);
      
      const parsed = extractTeamPokemonWithItems(converted);
      console.log('Final parsed team data:', parsed);
      
      const pasteResult = handleContentPaste(samplePokepaste);
      console.log('Paste handler result length:', pasteResult.length, 'characters');
      console.log('Paste conversion successful:', pasteResult !== samplePokepaste);
    };
    

  }, [gameplans, selectedGameplan]);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit'>('list');
  // Removed unused isModalOpen state
  const [isCloudImportModalOpen, setIsCloudImportModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    season: '',
    tournament: '',
    format: 'VGC'
  });

  // Load data prioritizing local API, then localStorage for all environments
  useEffect(() => {
    const initializeGameplans = async () => {
      console.log('Initializing gameplans...');
      
      if (isStaticHosting()) {
        console.log('Running on static hosting (GitHub Pages, etc.) - using localStorage only');
        
        // On static hosting, only use localStorage
        const savedGameplans = localStorage.getItem('vgc-gameplans');
        if (savedGameplans) {
          try {
            const parsed = JSON.parse(savedGameplans);
            if (parsed.length > 0) {
              console.log(`Loaded ${parsed.length} gameplans from localStorage`);
              setGameplans(parsed);
              return;
            }
          } catch (error) {
            console.error('Error parsing saved gameplans:', error);
          }
        }
        
        console.log('No gameplans in localStorage for static hosting - starting with empty state');
        setGameplans([]);
        return;
      }
      
      // For local development: try API first, then localStorage
      console.log('Running locally - trying API first...');
      const apiGameplans = await loadGameplansFromAPI();
      
      if (apiGameplans.length > 0) {
        console.log(`Loaded ${apiGameplans.length} gameplans from API`);
        setGameplans(apiGameplans);
        // Also save to localStorage as backup
        localStorage.setItem('vgc-gameplans', JSON.stringify(apiGameplans));
        return;
      }
      
      // If no API gameplans, try localStorage
      console.log('No gameplans found from API, checking localStorage...');
      const savedGameplans = localStorage.getItem('vgc-gameplans');
      
      if (savedGameplans) {
        try {
          const parsed = JSON.parse(savedGameplans);
          if (parsed.length > 0) {
            console.log(`Loaded ${parsed.length} gameplans from localStorage`);
            setGameplans(parsed);
            return;
          }
        } catch (error) {
          console.error('Error parsing saved gameplans:', error);
        }
      }
      
      // If no gameplans found anywhere, start with empty array
      console.log('No gameplans found anywhere - starting with empty state');
      setGameplans([]);
    };
    
    initializeGameplans();
  }, []);

  // Save to localStorage whenever gameplans change
  useEffect(() => {
    console.log('Saving gameplans to localStorage:', gameplans);
    localStorage.setItem('vgc-gameplans', JSON.stringify(gameplans));
  }, [gameplans]);

  // Memoized computed values for performance
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    gameplans.forEach(gp => gp.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [gameplans]);

  const allSeasons = useMemo(() => {
    const seasons = new Set<string>();
    gameplans.forEach(gp => gp.season && seasons.add(gp.season));
    return Array.from(seasons).sort().reverse();
  }, [gameplans]);



  // Memoized filtered and sorted gameplans
  const filteredAndSortedGameplans = useMemo(() => {
    let filtered = gameplans.filter(gameplan => {
      // Enhanced search logic
      const searchLower = searchTerm.toLowerCase();
      const teamPokemon = extractPokemonFromContent(gameplan);
      
      // Check if search term is a Pokemon name
      const isPokemonSearch = Object.keys(POKEMON_ID_MAP).some(pokemon => 
        pokemon.toLowerCase().includes(searchLower) && searchLower.length >= 3
      );
      
      let matchesSearch = false;
      
      if (isPokemonSearch) {
        // For Pokemon searches: only look in team composition
        matchesSearch = teamPokemon.some(pokemon => pokemon.toLowerCase().includes(searchLower));
      } else {
        // For non-Pokemon searches: search in title, content, and tags (but not team roster)
        matchesSearch = gameplan.title.toLowerCase().includes(searchLower) ||
                       gameplan.content.toLowerCase().includes(searchLower) ||
                       gameplan.tags.some(tag => tag.toLowerCase().includes(searchLower));
      }
      
      const matchesTag = !selectedTag || gameplan.tags.includes(selectedTag);
      const matchesSeason = !selectedSeason || gameplan.season === selectedSeason;

      return matchesSearch && matchesTag && matchesSeason;
    });

    // Sort gameplans
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'season':
          const seasonA = a.season || '0';
          const seasonB = b.season || '0';
          return seasonB.localeCompare(seasonA);
        case 'date':
        default:
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      }
    });

    return filtered;
  }, [gameplans, searchTerm, selectedTag, selectedSeason, sortBy]);

  // Display all filtered gameplans in list view (no pagination)
  const displayGameplans = filteredAndSortedGameplans;



  const closeModal = useCallback(() => {
            // Removed unused setIsModalOpen call
    setSelectedGameplan(null);
    setIsEditing(false);
  }, []);

  const saveGameplan = useCallback(() => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in both title and content fields.');
      return;
    }

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    // Extract team Pokemon from the content for both new and updated gameplans
    const teamWithItems = extractTeamPokemonWithItems(formData.content);
    const teamPokemon = teamWithItems.map(teamMember => teamMember.pokemon);
    
    if (isEditing && selectedGameplan) {
      const updatedGameplans = gameplans.map(gp =>
        gp.id === selectedGameplan.id
          ? { 
              ...gp, 
              title: formData.title, 
              content: formData.content, 
              tags,
              season: formData.season,
              tournament: formData.tournament,
              format: formData.format,
              teamPokemon: teamPokemon // Update the teamPokemon field
            }
          : gp
      );
      setGameplans(updatedGameplans);
    } else {
      const newGameplan: Gameplan = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        tags,
        dateCreated: new Date().toISOString().split('T')[0],
        season: formData.season,
        tournament: formData.tournament,
        format: formData.format,
        teamPokemon: teamPokemon // Set the teamPokemon field for new gameplans
      };
      setGameplans([newGameplan, ...gameplans]);
    }

    closeModal();
  }, [formData, isEditing, selectedGameplan, gameplans, closeModal]);

  const deleteGameplan = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this gameplan?')) {
      setGameplans(gameplans.filter(gp => gp.id !== id));
    }
  }, [gameplans]);

  const handleViewGameplan = useCallback((gameplan: Gameplan) => {
    setSelectedGameplan(gameplan);
    setViewMode('detail');
    setIsMobileSidebarOpen(false); // Close mobile sidebar on navigation
  }, []);

  const handleEditGameplan = useCallback((gameplan: Gameplan) => {
    setSelectedGameplan(gameplan);
    setFormData({
      title: gameplan.title,
      content: gameplan.content,
      tags: gameplan.tags.join(', '),
      season: gameplan.season || '',
      tournament: gameplan.tournament || '',
      format: gameplan.format || 'VGC'
    });
    setViewMode('edit');
    setIsEditing(true);
    setIsMobileSidebarOpen(false); // Close mobile sidebar on navigation
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedGameplan(null);
    setIsEditing(false);
  }, []);

  const handleNewGameplan = useCallback(() => {
    setFormData({
      title: '',
      content: '',
      tags: '',
      season: '',
      tournament: '',
      format: 'VGC'
    });
    setSelectedGameplan(null);
    setViewMode('edit');
    setIsEditing(false);
    setIsMobileSidebarOpen(false); // Close mobile sidebar on navigation
  }, []);

  // Removed unused resetData function



  const exportData = useCallback(() => {
    // Export all gameplans as individual markdown files
    gameplans.forEach((gameplan, index) => {
      // Create YAML frontmatter (teamPokemon auto-inferred from content, so not included)
      const frontmatter = {
        title: gameplan.title,
        tags: gameplan.tags,
        season: gameplan.season || '',
        tournament: gameplan.tournament || '',
        format: gameplan.format || 'VGC',
        author: 'VGC Gameplan Manager',
        dateCreated: gameplan.dateCreated,
        teamArchetype: gameplan.teamPokemon?.length ? `${gameplan.teamPokemon.length} Pokemon Team` : 'Custom Team',
        coreStrategy: 'VGC Strategy'
        // teamPokemon removed - will be auto-inferred from team composition section
      };

      const yamlString = Object.entries(frontmatter)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
          }
          return `${key}: "${value}"`;
        })
        .join('\n');

      const markdownContent = `---\n${yamlString}\n---\n\n${gameplan.content}`;
      
      // Create safe filename
      const safeTitle = gameplan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeTitle}_${gameplan.dateCreated}.md`;
      
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', filename);
      linkElement.click();
      
      URL.revokeObjectURL(url);
    });
    
    alert(`Exported ${gameplans.length} gameplan(s) as markdown files!`);
  }, [gameplans]);

  // Process a single file (existing logic)
  const processImportFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        
        // Determine file type and process accordingly
        if (file.name.endsWith('.json')) {
          // Process JSON file (existing logic)
          const importedData = JSON.parse(fileContent);
          
          // Validate the imported data structure
          if (Array.isArray(importedData)) {
            const validGameplans = importedData.filter(item => 
              item.id && item.title && item.content && item.dateCreated && item.tags
            );
            
            if (validGameplans.length > 0) {
              // Ask user if they want to merge or replace
              const shouldMerge = window.confirm(
                `Found ${validGameplans.length} valid gameplan(s). Click OK to merge with existing data, or Cancel to replace all data.`
              );
              
              if (shouldMerge) {
                // Merge: Add imported gameplans with new IDs to avoid conflicts
                const mergedGameplans = [...gameplans];
                validGameplans.forEach(gameplan => {
                  // Extract teamPokemon from content if not already present
                  const teamWithItems = extractTeamPokemonWithItems(gameplan.content);
                  const teamPokemon = teamWithItems.map(teamMember => teamMember.pokemon);
                  
                  const newGameplan = {
                    ...gameplan,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    teamPokemon: gameplan.teamPokemon || teamPokemon, // Use existing or extract from content
                    originalFile: {
                      name: file.name,
                      type: 'json' as const,
                      lastModified: file.lastModified
                    }
                  };
                  mergedGameplans.push(newGameplan);
                });
                setGameplans(mergedGameplans);
              } else {
                // Replace all data
                const gameplansWithFileInfo = validGameplans.map(gameplan => {
                  // Extract teamPokemon from content if not already present
                  const teamWithItems = extractTeamPokemonWithItems(gameplan.content);
                  const teamPokemon = teamWithItems.map(teamMember => teamMember.pokemon);
                  
                  return {
                    ...gameplan,
                    teamPokemon: gameplan.teamPokemon || teamPokemon, // Use existing or extract from content
                    originalFile: {
                      name: file.name,
                      type: 'json' as const,
                      lastModified: file.lastModified
                    }
                  };
                });
                setGameplans(gameplansWithFileInfo);
              }
              
              alert(`Successfully imported ${validGameplans.length} gameplan(s)!`);
            } else {
              alert('No valid gameplans found in the imported file.');
            }
          } else {
            alert('Invalid JSON file format. Please select a valid JSON file.');
          }
        } else if (file.name.endsWith('.md')) {
          // Process Markdown file with YAML frontmatter
          const lines = fileContent.split('\n');
          let frontmatterEnd = -1;
          let frontmatterStart = -1;
          
          // Find YAML frontmatter boundaries
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
              if (frontmatterStart === -1) {
                frontmatterStart = i;
              } else {
                frontmatterEnd = i;
                break;
              }
            }
          }
          
          if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
            // Extract YAML frontmatter
            const frontmatter = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
            const content = lines.slice(frontmatterEnd + 1).join('\n');
            
                         // Simple YAML parser for basic key-value pairs
             const metadata: any = {};
             frontmatter.split('\n').forEach(line => {
               const colonIndex = line.indexOf(':');
               if (colonIndex !== -1) {
                 const key = line.substring(0, colonIndex).trim();
                 let value: any = line.substring(colonIndex + 1).trim();
                 
                 // Remove quotes if present
                 if ((value.startsWith('"') && value.endsWith('"')) || 
                     (value.startsWith("'") && value.endsWith("'"))) {
                   value = value.slice(1, -1);
                 }
                 
                 // Handle array values (basic support)
                 if (value.startsWith('[') && value.endsWith(']')) {
                   try {
                     value = JSON.parse(value);
                   } catch {
                     // If JSON parsing fails, treat as comma-separated string array
                     value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/"/g, ''));
                   }
                 }
                 
                 metadata[key] = value;
               }
             });
            
                         // Create gameplan object
                         // Auto-infer teamPokemon from content to avoid redundancy
                         const teamWithItems = extractTeamPokemonWithItems(content);
                         const teamPokemon = teamWithItems.map(teamMember => teamMember.pokemon);
                         
             const gameplan: Gameplan = {
               id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
               title: metadata.title || file.name.replace('.md', ''),
               content: content.trim(),
               dateCreated: metadata.dateCreated || new Date().toISOString().split('T')[0],
               tags: Array.isArray(metadata.tags) ? metadata.tags : (metadata.tags ? [metadata.tags] : []),
               season: metadata.season || '',
               tournament: metadata.tournament || '',
               format: metadata.format || 'VGC',
               teamPokemon: teamPokemon, // Always use auto-inferred Pokemon from content
               rivalTeams: metadata.rivalTeams || {},
               analysis: metadata.analysis || {},
               originalFile: {
                 name: file.name,
                 type: 'markdown' as const,
                 lastModified: file.lastModified
               }
             };
            
            // Add to gameplans
            const mergedGameplans = [...gameplans, gameplan];
            setGameplans(mergedGameplans);
            
            alert(`Successfully imported "${gameplan.title}" from markdown file!`);
          } else {
            alert('Invalid markdown file format. Please ensure the file has YAML frontmatter.');
          }
        } else {
          alert('Unsupported file format. Please select a JSON or Markdown file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON or Markdown file.');
        console.error('Import error:', error);
      }
    };
    
    reader.readAsText(file);
  }, [gameplans]);

  // NEW: Process multiple files for bulk import
  const processBulkImport = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.name.endsWith('.json') || file.name.endsWith('.md')
    );
    
    if (validFiles.length === 0) {
      alert('No valid files found. Please select JSON or Markdown files.');
      return;
    }
    
    if (validFiles.length === 1) {
      // Single file - use existing logic
      await processImportFile(validFiles[0]);
      return;
    }
    
    // Multiple files - show confirmation
    const shouldProceed = window.confirm(
      `Found ${validFiles.length} files to import. This will add all gameplans to your existing collection. Continue?`
    );
    
    if (!shouldProceed) return;
    
    const allResults: Array<{
      success: boolean;
      gameplans: Gameplan[];
      error?: string;
      successCount: number;
    }> = [];
    
    // Process files sequentially to avoid overwhelming the user
    for (const file of validFiles) {
      try {
        const result = await new Promise<{
          success: boolean;
          gameplans: Gameplan[];
          error?: string;
          successCount: number;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const fileContent = e.target?.result as string;
              const fileGameplans: Gameplan[] = [];
              let fileSuccessCount = 0;
              
              if (file.name.endsWith('.json')) {
                // Process JSON file
                const importedData = JSON.parse(fileContent);
                
                if (Array.isArray(importedData)) {
                  const validGameplans = importedData.filter(item => 
                    item.id && item.title && item.content && item.dateCreated && item.tags
                  );
                  
                  if (validGameplans.length > 0) {
                    // Collect gameplans instead of updating state immediately
                    validGameplans.forEach(gameplan => {
                      const teamWithItems = extractTeamPokemonWithItems(gameplan.content);
                      const teamPokemon = teamWithItems.map(teamMember => teamMember.pokemon);
                      
                      const newGameplan: Gameplan = {
                        ...gameplan,
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        teamPokemon: gameplan.teamPokemon || teamPokemon,
                        originalFile: {
                          name: file.name,
                          type: 'json' as const,
                          lastModified: file.lastModified
                        }
                      };
                      fileGameplans.push(newGameplan);
                    });
                    fileSuccessCount = validGameplans.length;
                    resolve({ success: true, gameplans: fileGameplans, successCount: fileSuccessCount });
                  } else {
                    resolve({ success: false, gameplans: [], error: `${file.name}: No valid gameplans found`, successCount: 0 });
                  }
                } else {
                  resolve({ success: false, gameplans: [], error: `${file.name}: Invalid JSON format`, successCount: 0 });
                }
              } else if (file.name.endsWith('.md')) {
                // Process Markdown file
                const lines = fileContent.split('\n');
                let frontmatterEnd = -1;
                let frontmatterStart = -1;
                
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].trim() === '---') {
                    if (frontmatterStart === -1) {
                      frontmatterStart = i;
                    } else {
                      frontmatterEnd = i;
                      break;
                    }
                  }
                }
                
                if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
                  const frontmatter = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
                  const content = lines.slice(frontmatterEnd + 1).join('\n');
                  
                  const metadata: any = {};
                  frontmatter.split('\n').forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex !== -1) {
                      const key = line.substring(0, colonIndex).trim();
                      let value: any = line.substring(colonIndex + 1).trim();
                      
                      if ((value.startsWith('"') && value.endsWith('"')) || 
                          (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                      }
                      
                      if (value.startsWith('[') && value.endsWith(']')) {
                        try {
                          value = JSON.parse(value);
                        } catch {
                          value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/"/g, ''));
                        }
                      }
                      
                      metadata[key] = value;
                    }
                  });
                  
                  const teamWithItems = extractTeamPokemonWithItems(content);
                  const teamPokemon = teamWithItems.map(teamMember => teamMember.pokemon);
                  
                  const gameplan: Gameplan = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title: metadata.title || file.name.replace('.md', ''),
                    content: content.trim(),
                    dateCreated: metadata.dateCreated || new Date().toISOString().split('T')[0],
                    tags: Array.isArray(metadata.tags) ? metadata.tags : (metadata.tags ? [metadata.tags] : []),
                    season: metadata.season || '',
                    tournament: metadata.tournament || '',
                    format: metadata.format || 'VGC',
                    teamPokemon: teamPokemon,
                    rivalTeams: metadata.rivalTeams || {},
                    analysis: metadata.analysis || {},
                    originalFile: {
                      name: file.name,
                      type: 'markdown' as const,
                      lastModified: file.lastModified
                    }
                  };
                  
                  fileGameplans.push(gameplan);
                  fileSuccessCount = 1;
                  resolve({ success: true, gameplans: fileGameplans, successCount: fileSuccessCount });
                } else {
                  resolve({ success: false, gameplans: [], error: `${file.name}: Invalid markdown format (missing YAML frontmatter)`, successCount: 0 });
                }
              }
            } catch (error) {
              resolve({ success: false, gameplans: [], error: `${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, successCount: 0 });
            }
          };
          reader.onerror = () => {
            resolve({ success: false, gameplans: [], error: `${file.name}: Failed to read file`, successCount: 0 });
          };
          reader.readAsText(file);
        });
        allResults.push(result);
      } catch (error) {
        allResults.push({ success: false, gameplans: [], error: `${file.name}: Unexpected error`, successCount: 0 });
      }
    }
    
    // Aggregate results
    const newGameplans: Gameplan[] = [];
    const errors: string[] = [];
    
    const { successCount, errorCount } = allResults.reduce((acc, result) => {
      if (result.success) {
        newGameplans.push(...result.gameplans);
        acc.successCount += result.successCount;
      } else {
        if (result.error) {
          errors.push(result.error);
        }
        acc.errorCount++;
      }
      return acc;
    }, { successCount: 0, errorCount: 0 });
    
    // Update state once with all new gameplans
    if (newGameplans.length > 0) {
      setGameplans(prevGameplans => [...prevGameplans, ...newGameplans]);
    }
    
    // Show results
    let message = `Bulk import completed!\n\nSuccessfully imported: ${successCount} gameplan(s)`;
    if (errorCount > 0) {
      message += `\nFailed to import: ${errorCount} file(s)`;
      message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
      if (errors.length > 5) {
        message += `\n... and ${errors.length - 5} more errors`;
      }
    }
    
    alert(message);
  }, [processImportFile]);

  const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      processImportFile(files[0]);
    } else {
      processBulkImport(files);
    }
    
    // Reset the input so the same files can be imported again
    event.target.value = '';
  }, [processImportFile, processBulkImport]);

  const exportToPDF = useCallback(async (gameplan: Gameplan) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      
      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };
      
      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };
      
      // Helper function to load image from URL
      const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });
      };
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(gameplan.title, margin, yPosition);
      yPosition += 15;
      
      // Meta information
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(`Season: ${gameplan.season || 'N/A'}`, margin, yPosition, pageWidth - 2 * margin, 12);
      yPosition = addWrappedText(`Format: ${gameplan.format || 'VGC'}`, margin, yPosition, pageWidth - 2 * margin, 12);
      yPosition = addWrappedText(`Tournament: ${gameplan.tournament || 'N/A'}`, margin, yPosition, pageWidth - 2 * margin, 12);
      yPosition = addWrappedText(`Created: ${gameplan.dateCreated}`, margin, yPosition, pageWidth - 2 * margin, 12);
      
      if (gameplan.tags && gameplan.tags.length > 0) {
        yPosition = addWrappedText(`Tags: ${gameplan.tags.join(', ')}`, margin, yPosition, pageWidth - 2 * margin, 12);
      }
      
      yPosition += 10;
      
      // Team Composition with sprites
      const teamPokemon = extractPokemonFromContent(gameplan);
      if (teamPokemon.length > 0) {
        checkNewPage(80);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Team Composition', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        
        // Create a grid layout for Pokemon (3 columns to fit better with sprites)
        const colWidth = (pageWidth - 4 * margin) / 3;
        let currentCol = 0;
        let currentRow = 0;
        
        for (let i = 0; i < teamPokemon.length; i++) {
          const pokemon = teamPokemon[i];
          const pokemonId = POKEMON_ID_MAP[pokemon];
          const x = margin + (currentCol * (colWidth + margin));
          const y = yPosition + (currentRow * 25);
          
          // Try to add Pokemon sprite
          if (pokemonId) {
            try {
              const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
              const img = await loadImageFromUrl(spriteUrl);
              
              // Add sprite to PDF (small size)
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = 32;
              canvas.height = 32;
              if (ctx) {
                ctx.drawImage(img, 0, 0, 32, 32);
                const imageData = canvas.toDataURL('image/png');
                pdf.addImage(imageData, 'PNG', x, y - 8, 8, 8);
              }
            } catch (error) {
              console.warn(`Failed to load sprite for ${pokemon}:`, error);
            }
          }
          
          // Add Pokemon name (offset to account for sprite)
          pdf.text(`${i + 1}. ${pokemon}`, x + 10, y);
          
          currentCol++;
          if (currentCol >= 3) {
            currentCol = 0;
            currentRow++;
          }
        }
        
        yPosition += Math.ceil(teamPokemon.length / 3) * 25 + 15;
      }
      
      // Parse and organize content sections
      const sections = gameplan.content.split('\n\n');
      
      for (const section of sections) {
        if (section.trim()) {
          checkNewPage(30);
          
          // Check if it's a header (starts with #)
          if (section.startsWith('#')) {
            const headerLevel = (section.match(/^#+/) || [''])[0].length;
            const headerText = section.replace(/^#+\s*/, '');
            
            pdf.setFontSize(Math.max(12, 18 - headerLevel * 2));
            pdf.setFont('helvetica', 'bold');
            pdf.text(headerText, margin, yPosition);
            yPosition += headerLevel === 1 ? 15 : 12;
          } else {
            // Regular content
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            
            // Special formatting for certain sections
            if (section.includes('**') || section.includes('*')) {
              // Handle bold text (simplified)
              const cleanText = section.replace(/\*\*/g, '').replace(/\*/g, '');
              yPosition = addWrappedText(cleanText, margin, yPosition, pageWidth - 2 * margin, 10);
            } else {
              yPosition = addWrappedText(section, margin, yPosition, pageWidth - 2 * margin, 10);
            }
            yPosition += 8;
          }
        }
      }
      
      // Add footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated by VGC Team Manager - Page ${i} of ${totalPages}`, 
                 margin, pageHeight - 10);
        pdf.text(`Team: ${gameplan.title}`, 
                 pageWidth - margin - 50, pageHeight - 10);
      }
      
      // Save the PDF
      const fileName = `${gameplan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_team_guide.pdf`;
      pdf.save(fileName);
      
      // Show success message
      alert('PDF exported successfully! Check your downloads folder.');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  }, []);

  // Sync changes back to original file
  const syncChangesToFile = useCallback(async (gameplan: Gameplan) => {
    if (!gameplan.originalFile) {
      alert('This gameplan was not imported from a file, so it cannot be synced back.');
      return;
    }

    try {
      // Check if File System Access API is available
      if ('showSaveFilePicker' in window) {
        // Modern browser - use File System Access API
        const options = {
          suggestedName: gameplan.originalFile.name,
          types: [{
            description: gameplan.originalFile.type === 'json' ? 'JSON File' : 'Markdown File',
            accept: {
              [gameplan.originalFile.type === 'json' ? 'application/json' : 'text/markdown']: [`.${gameplan.originalFile.type}`]
            }
          }]
        };

        try {
          const fileHandle = await window.showSaveFilePicker!(options);
          
          // Convert gameplan back to original format
          let content: string;
          if (gameplan.originalFile.type === 'json') {
            // Single gameplan JSON
            const gameplanData = {
              id: gameplan.id,
              title: gameplan.title,
              content: gameplan.content,
              dateCreated: gameplan.dateCreated,
              tags: gameplan.tags,
              season: gameplan.season,
              tournament: gameplan.tournament,
              format: gameplan.format,
              teamPokemon: gameplan.teamPokemon,
              rivalTeams: gameplan.rivalTeams,
              analysis: gameplan.analysis
            };
            content = JSON.stringify(gameplanData, null, 2);
          } else {
            // Markdown with YAML frontmatter
            const frontmatter = {
              title: gameplan.title,
              tags: gameplan.tags,
              season: gameplan.season || '',
              tournament: gameplan.tournament || '',
              format: gameplan.format || 'VGC',
              author: 'Developer',
              dateCreated: gameplan.dateCreated,
              teamArchetype: gameplan.teamPokemon?.length ? `${gameplan.teamPokemon.length} Pokemon Team` : 'Custom Team',
              coreStrategy: 'Updated strategy',
              teamPokemon: gameplan.teamPokemon || []
            };

            const yamlString = Object.entries(frontmatter)
              .filter(([_, value]) => value !== undefined && value !== '')
              .map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
                }
                return `${key}: "${value}"`;
              })
              .join('\n');

            content = `---\n${yamlString}\n---\n\n${gameplan.content}`;
          }

          // Write to file
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();

          alert(`Changes successfully synced to ${fileHandle.name}!`);
                 } catch (error: any) {
           if (error.name === 'AbortError') {
             // User cancelled the save dialog
             return;
           }
           throw error;
         }
      } else {
        // Fallback for older browsers - trigger download
        let content: string;
        let filename: string;
        let mimeType: string;

        if (gameplan.originalFile.type === 'json') {
          const gameplanData = {
            id: gameplan.id,
            title: gameplan.title,
            content: gameplan.content,
            dateCreated: gameplan.dateCreated,
            tags: gameplan.tags,
            season: gameplan.season,
            tournament: gameplan.tournament,
            format: gameplan.format,
            teamPokemon: gameplan.teamPokemon,
            rivalTeams: gameplan.rivalTeams,
            analysis: gameplan.analysis
          };
          content = JSON.stringify(gameplanData, null, 2);
          filename = gameplan.originalFile.name;
          mimeType = 'application/json';
        } else {
          const frontmatter = {
            title: gameplan.title,
            tags: gameplan.tags,
            season: gameplan.season || '',
            tournament: gameplan.tournament || '',
            format: gameplan.format || 'VGC',
            author: 'Developer',
            dateCreated: gameplan.dateCreated,
            teamArchetype: gameplan.teamPokemon?.length ? `${gameplan.teamPokemon.length} Pokemon Team` : 'Custom Team',
            coreStrategy: 'Updated strategy',
            teamPokemon: gameplan.teamPokemon || []
          };

          const yamlString = Object.entries(frontmatter)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
              }
              return `${key}: "${value}"`;
            })
            .join('\n');

          content = `---\n${yamlString}\n---\n\n${gameplan.content}`;
          filename = gameplan.originalFile.name;
          mimeType = 'text/markdown';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', url);
        linkElement.setAttribute('download', filename);
        linkElement.click();
        
        URL.revokeObjectURL(url);

        alert(`Updated file downloaded as ${filename}. Please replace your original file with this updated version.`);
      }
    } catch (error) {
      console.error('Error syncing changes:', error);
      alert('Failed to sync changes to file. Please try again or use the export feature.');
    }
  }, []);

  // Replay management functions
  const handleReplayAdded = (gameplanId: string, replay: Replay) => {
    // Implement as needed or connect to state
  };
  const handleReplayDeleted = (gameplanId: string, replayId: string) => {
    // Implement as needed or connect to state
  };

  return (
    <div className="app">
      <AppHeader 
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />

      <div className="main-content">
        {/* Mobile Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="mobile-overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <button 
              className="mobile-close-btn"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
            <div className="search-controls">
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              <div className="filter-row">
                <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="filter-select">
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                
                <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="filter-select">
                  <option value="">All Seasons</option>
                  {allSeasons.map(season => (
                    <option key={season} value={season}>S{season}</option>
                  ))}
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'season')} className="filter-select">
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="season">Season</option>
                </select>
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={handleNewGameplan} className="btn btn-primary btn-sm">
                + New Team
              </button>

              <button onClick={exportData} className="btn btn-success btn-sm">
                📥 Export
              </button>
              <button onClick={() => setIsCloudImportModalOpen(true)} className="btn btn-info btn-sm">
                📤 Import
              </button>
            </div>
          </div>

          <div className="gameplans-list">
            <div className="list-header">
              <span className="gameplan-count">{displayGameplans.length} team(s)</span>
            </div>
            
                          {displayGameplans.length === 0 && (
                <div className="no-results">
                  <p>No teams found.</p>
                  <button onClick={handleNewGameplan} className="btn btn-primary btn-sm">
                    Create your first team
                  </button>
                </div>
              )}

            {displayGameplans.map((gameplan: Gameplan) => {
              try {
                const isSelected = selectedGameplan?.id === gameplan.id;
                
                return (
                  <GameplanListItem
                    key={gameplan.id}
                    gameplan={gameplan}
                    isSelected={isSelected}
                    onView={handleViewGameplan}
                    onEdit={handleEditGameplan}
                    onDelete={deleteGameplan}
                  />
                );
              } catch (error) {
                console.error('Error rendering gameplan:', error);
                return (
                  <div key={gameplan.id} className="gameplan-list-item error">
                    <div className="gameplan-list-header">
                      <h4 className="gameplan-list-title">Error loading gameplan</h4>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="content-area">
          {viewMode === 'list' && (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>Welcome to VGC Gameplan Manager</h2>
                <p>Select a gameplan from the sidebar to view details, or create a new one.</p>
                <div className="welcome-stats">
                  <div className="stat">
                    <span className="stat-number">{gameplans.length}</span>
                    <span className="stat-label">Total Gameplans</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{allSeasons.length}</span>
                    <span className="stat-label">Seasons</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{allTags.length}</span>
                    <span className="stat-label">Tags</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'detail' && selectedGameplan && (
            <div className="gameplan-detail">
              <div className="detail-header">
                <button onClick={handleBackToList} className="btn btn-secondary btn-sm back-btn">
                  ← Back to List
                </button>
                <div className="detail-actions">
                  <button onClick={() => exportToPDF(selectedGameplan)} className="btn btn-info btn-sm">
                    📄 Export PDF
                  </button>
                  {selectedGameplan.originalFile && (
                    <button onClick={() => syncChangesToFile(selectedGameplan)} className="btn btn-success btn-sm">
                      🔄 Sync Changes
                    </button>
                  )}
                  <button onClick={() => handleEditGameplan(selectedGameplan)} className="btn btn-primary btn-sm">
                    Edit Gameplan
                  </button>
                  <button onClick={() => deleteGameplan(selectedGameplan.id)} className="btn btn-danger btn-sm">
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="detail-content">
                <div className="gameplan-header">
                  <h1>{selectedGameplan.title}</h1>
                  <div className="gameplan-meta-full">
                    <div className="meta-item">
                      <strong>Season:</strong> {selectedGameplan.season}
                    </div>
                    <div className="meta-item">
                      <strong>Format:</strong> {selectedGameplan.format}
                    </div>
                    <div className="meta-item">
                      <strong>Tournament:</strong> {selectedGameplan.tournament}
                    </div>
                    <div className="meta-item">
                      <strong>Created:</strong> {selectedGameplan.dateCreated}
                    </div>
                  </div>
                  
                  <div className="tags-full">
                    {selectedGameplan.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Cheat Sheet */}
                <CheatSheet 
                  gameplan={selectedGameplan} 
                  onReplayAdded={(replay) => handleReplayAdded(selectedGameplan.id, replay)}
                  onReplayDeleted={(replayId) => handleReplayDeleted(selectedGameplan.id, replayId)}
                />
              </div>
            </div>
          )}

                    {viewMode === 'edit' && (
            <div className="gameplan-edit">
              <div className="edit-header">
                <button onClick={handleBackToList} className="btn btn-secondary btn-sm back-btn">
                  ← Back to List
                </button>
                <div className="edit-actions">
                  <button onClick={saveGameplan} className="btn btn-success btn-sm">
                    {isEditing ? 'Update' : 'Create'} Gameplan
                  </button>
                  {isEditing && selectedGameplan?.originalFile && (
                    <button onClick={() => syncChangesToFile(selectedGameplan)} className="btn btn-info btn-sm">
                      🔄 Sync Changes
                    </button>
                  )}
                </div>
              </div>
              
              <div className="edit-form">
                <div className="form-group">
                  <label htmlFor="title">Title:</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter gameplan title..."
                    className="form-input"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="season">Season:</label>
                    <input
                      type="text"
                      id="season"
                      value={formData.season}
                      onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
                      placeholder="e.g., 2024"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="tournament">Tournament:</label>
                    <input
                      type="text"
                      id="tournament"
                      value={formData.tournament}
                      onChange={(e) => setFormData(prev => ({ ...prev, tournament: e.target.value }))}
                      placeholder="e.g., Regional, Worlds"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="format">Format:</label>
                    <select
                      id="format"
                      value={formData.format}
                      onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                      className="form-input"
                    >
                      <option value="VGC">VGC</option>
                      <option value="Singles">Singles</option>
                      <option value="Doubles">Doubles</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="tags">Tags (comma separated):</label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., Trick Room, Sun Team, Calyrex"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="content">Content:</label>
                  <div style={{ marginBottom: '0.5rem', padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '6px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: '600' }}>
                      🍃 Pokepaste Support: Paste directly from pokepast.es and it will auto-convert to the app format!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                      Supports all pokepaste fields: abilities, EVs, natures, tera types, moves, items, etc.
                    </div>
                  </div>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    onPaste={(e) => {
                      // Get pasted content
                      const pastedData = e.clipboardData.getData('text');
                      if (pastedData) {
                        // Check if it looks like pokepaste format and auto-convert
                        const convertedContent = handleContentPaste(pastedData);
                        if (convertedContent !== pastedData) {
                          // If conversion happened, prevent default paste and set converted content
                          e.preventDefault();
                          setFormData(prev => ({ ...prev, content: prev.content + convertedContent }));
                        }
                      }
                    }}
                    placeholder="Enter your gameplan content in markdown format...&#10;&#10;💡 Tip: You can paste pokepaste format directly and it will be auto-converted!"
                    className="form-textarea"
                    rows={20}
                  />
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Cloud Import Modal */}
      <CloudImportModal
        isOpen={isCloudImportModalOpen}
        onClose={() => setIsCloudImportModalOpen(false)}
        onImport={processImportFile}
        onBulkImport={processBulkImport}
      />

      {/* Hidden Import Input */}
      <input
        type="file"
        id="import-input"
        accept=".json,.md"
        multiple
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// Enhanced header component with user info
const AppHeader: React.FC<{ 
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
}> = ({ isMobileSidebarOpen, setIsMobileSidebarOpen }) => {
  const { user, logout } = useAuth();
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div>
            <h1>🎮 VGC Team Manager</h1>
            <p>Manage your VGC team strategies and gameplans</p>
          </div>
        </div>
        <div className="header-user">
          <div className="user-profile">
            <img src={user?.avatar_url} alt="Profile" className="user-profile-avatar" />
            <div className="user-profile-info">
              <span className="user-name">{user?.name || user?.login}</span>
              <span className="user-status">Beta Access</span>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-sm">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

// Main App component wrapped with authentication
const AppWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <App />
      </AuthGuard>
    </AuthProvider>
  );
};

export default AppWithAuth;
