import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import { AuthProvider } from './auth/AuthProvider';
import { AuthGuard } from './auth/AuthGuard';
import { useAuth } from './auth/AuthProvider';
import { CloudImportModal } from './CloudImportModal';
import './App.css';

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

// Test function to verify Pokemon and item parsing
// Call this from browser console: window.testPokemonItemParsing()
const testPokemonItemParsing = () => {
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

// Extract held items from team composition content
const extractTeamPokemonWithItems = (content: string): Array<{pokemon: string, item: string | null}> => {
  try {
    const lines = content.split('\n');
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

// Extract Pokemon names from gameplan (prioritize teamPokemon field)
const extractPokemonFromContent = (gameplan: Gameplan): string[] => {
  try {
    // First try to get team from teamPokemon field (new standardized format)
    if (gameplan && gameplan.teamPokemon && Array.isArray(gameplan.teamPokemon) && gameplan.teamPokemon.length > 0) {
      return gameplan.teamPokemon.slice(0, 6); // Ensure exactly 6 Pokemon max
    }
    
    // Fallback: extract from content (legacy format)
    if (!gameplan || !gameplan.content) {
      return [];
    }
    
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
    // Only match exact names (case-insensitive)
    const found = Object.keys(POKEMON_ID_MAP).find(pokemon => pokemon.toLowerCase() === part.toLowerCase());
    if (found) {
      pokemonNames.push(found);
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
  
  if (pokemonId === 0) {
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
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
        alt={pokemon}
        className="pokemon-sprite"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {itemSpriteUrl && (
        <img
          src={itemSpriteUrl}
          alt={heldItem || ''}
          className="held-item-sprite"
          style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            width: Math.max(24, size * 0.55),
            height: Math.max(24, size * 0.55),
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            padding: '2px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
};

// Matchup Selector Component
const MatchupSelector: React.FC<{ gameplan: Gameplan }> = ({ gameplan }) => {
  const [selectedMatchup, setSelectedMatchup] = useState<string>('');
  const [selectedPokemonForCalcs, setSelectedPokemonForCalcs] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

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
      if (line.startsWith('### vs ') || line.startsWith('## vs ')) {
        const opponentName = line.replace(/^#+\s*vs\s*/, '').trim();
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
          
          // Extract recommended lead from first gameplan if not found yet
          if (!lead && nextLine.includes('**My Lead:**')) {
            const leadMatch = nextLine.match(/\*\*My Lead:\*\*\s*(.+)/i);
            if (leadMatch) {
              lead = leadMatch[1].trim();
              console.log(`Found lead: ${lead}`);
            }
          }
          
          // Extract back line from first gameplan if not found yet
          if (!back && nextLine.includes('**My Back:**')) {
            const backMatch = nextLine.match(/\*\*My Back:\*\*\s*(.+)/i);
            if (backMatch) {
              back = backMatch[1].trim();
              console.log(`Found back: ${back}`);
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
                  for (let l = k + 1; l < lines.length && l < k + 6; l++) {
                    const turnLine = lines[l].trim();
                    if (turnLine.startsWith('-') && turnLine.includes('Turn')) {
                      currentGameplan.first3Turns!.push(turnLine.replace(/^-\s*/, ''));
                    } else if (turnLine.startsWith('**') || turnLine === '') {
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

            // Look for Pokepaste URL
            const urlMatch = nextLine.match(/\[Pokepaste\]\((https:\/\/pokepast\.es\/[a-zA-Z0-9]+)\)/);
            if (urlMatch) {
              pokepasteUrl = urlMatch[1];
            }
            
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
        if (opponentName && lead && back) {
          console.log(`Adding matchup: ${opponentName} with lead: ${lead}, back: ${back}`);
          console.log(`Opponent team data:`, opponentTeam);
          matchups[opponentName] = {
            lead,
            back,
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

  const matchups = extractMatchups(gameplan.content);
  const matchupKeys = Object.keys(matchups);
  
  console.log('MatchupSelector - matchups found:', matchupKeys);
  console.log('MatchupSelector - matchups object:', matchups);

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
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Find the matchup section
      if (line.toLowerCase().startsWith('### vs ') || line.toLowerCase().startsWith('## vs ')) {
        inMatchup = line.replace(/^#+\s*vs\s*/i, '').trim().toLowerCase() === matchup.toLowerCase();
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
    return gameplans.filter(gp => gp.myLead && gp.myBack);
  };

  const gameplansForMatchup = selectedMatchup ? extractGameplans(gameplan.content, selectedMatchup) : [];

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

  // Filter matchups based on search term
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
                  const matchupPokemon = getMatchupPokemon(matchup);
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
                        <div className="matchup-pokemon">
                          {matchupPokemon.slice(0, 6).map(pokemon => (
                            <PokemonSprite 
                              key={pokemon} 
                              pokemon={pokemon} 
                              size={24} 
                              className="matchup-pokemon-sprite"
                            />
                          ))}
                          {matchupPokemon.length > 6 && (
                            <span className="pokemon-more">+{matchupPokemon.length - 6}</span>
                          )}
                        </div>
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
              {/* Opponent's Team */}
              {matchups[selectedMatchup].opponentTeam && matchups[selectedMatchup].opponentTeam!.length > 0 && (
                <div className="opponent-team-section">
                  <strong>👥 Opponent's Team:</strong>
                  {matchups[selectedMatchup].pokepasteUrl && (
                    <a 
                      href={matchups[selectedMatchup].pokepasteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="pokepaste-link"
                    >
                      📋 View Pokepaste
                    </a>
                  )}
                  <div className="opponent-team-display">
                    {(() => {
                      try {
                        const opponentTeamWithItems = extractOpponentTeamWithItems(gameplan.content, selectedMatchup);
                        console.log(`extractOpponentTeamWithItems result:`, opponentTeamWithItems);
                        console.log(`matchups[selectedMatchup].opponentTeam:`, matchups[selectedMatchup]?.opponentTeam);
                        if (opponentTeamWithItems && opponentTeamWithItems.length > 0) {
                          console.log(`Using extractOpponentTeamWithItems data`);
                          return opponentTeamWithItems.map((teamMember, index) => (
                            <div key={`${teamMember.pokemon}-${index}`} className="opponent-team-item">
                              <PokemonSprite 
                                pokemon={teamMember.pokemon} 
                                size={56}
                                heldItem={teamMember.item}
                                showItem={true}
                              />
                              <span className="opponent-team-name">{teamMember.pokemon}</span>
                            </div>
                          ));
                        } else if (matchups[selectedMatchup] && matchups[selectedMatchup].opponentTeam) {
                          console.log(`Using fallback matchups data`);
                          console.log(`Opponent team members:`, matchups[selectedMatchup].opponentTeam);
                          return matchups[selectedMatchup].opponentTeam!.map((teamMember, index) => {
                            console.log(`Rendering opponent team member: ${teamMember.pokemon} @ ${teamMember.item}`);
                            return (
                              <div key={`${teamMember.pokemon}-${index}`} className="opponent-team-item">
                                <PokemonSprite 
                                  pokemon={teamMember.pokemon} 
                                  size={56}
                                  heldItem={teamMember.item}
                                  showItem={true}
                                />
                                <span className="opponent-team-name">{teamMember.pokemon}</span>
                              </div>
                            );
                          });
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
              {/* --- New Gameplans Section --- */}
              {gameplansForMatchup.length > 0 && (
                <div className="gameplans-section">
                  <h5 style={{ marginBottom: 16, color: '#4fd1c5', fontWeight: 700, fontSize: 20 }}>📋 Gameplans</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {gameplansForMatchup.map((gp, idx) => (
                      <div
                        key={idx}
                        className="gameplan-card"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 12,
                          padding: 20,
                          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                          border: '1px solid #333',
                          marginBottom: 0,
                          color: '#e0e0e0',
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 12 }}>
                          {/* Opponent's Lead/Back */}
                          <div>
                            <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>Opponent's Lead</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {extractPokemonFromText(gp.opponentLead).map(pokemon => (
                                <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                              ))}
                              <span style={{ fontWeight: 500 }}>{gp.opponentLead}</span>
                            </div>
                            <div style={{ fontWeight: 600, color: '#f87171', marginTop: 8, marginBottom: 4 }}>Opponent's Back</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {extractPokemonFromText(gp.opponentBack).map(pokemon => (
                                <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                              ))}
                              <span style={{ fontWeight: 500 }}>{gp.opponentBack}</span>
                            </div>
                          </div>
                          {/* My Lead/Back */}
                          <div>
                            <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: 4 }}>My Lead</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {extractPokemonFromText(gp.myLead).map(pokemon => (
                                <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                              ))}
                              <span style={{ fontWeight: 500 }}>{gp.myLead}</span>
                            </div>
                            <div style={{ fontWeight: 600, color: '#60a5fa', marginTop: 8, marginBottom: 4 }}>My Back</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {extractPokemonFromText(gp.myBack).map(pokemon => (
                                <PokemonSprite key={pokemon} pokemon={pokemon} size={56} />
                              ))}
                              <span style={{ fontWeight: 500 }}>{gp.myBack}</span>
                            </div>
                          </div>
                          {/* Wincons */}
                          <div style={{ minWidth: 180 }}>
                            <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: 4 }}>Their Win Condition</div>
                            <div style={{ marginBottom: 8 }}>{gp.theirWincon}</div>
                            <div style={{ fontWeight: 600, color: '#34d399', marginBottom: 4 }}>My Win Condition</div>
                            <div>{gp.myWincon}</div>
                          </div>
                        </div>
                        {/* First 3 Turns */}
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>First 3 Turns</div>
                          <div style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {gp.first3Turns.map((turn: string, i: number) => (
                              <div key={i} style={{ marginBottom: 2 }}>{turn}</div>
                            ))}
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
                            padding: 20,
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                            border: '1px solid #333',
                            color: '#e0e0e0',
                            marginTop: 24,
                          }}
                        >
                          <h5 style={{ color: '#fbbf24', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>📝 Notes</h5>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 16 }}>{notes}</pre>
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
                    
                    // Extract from gameplans
                    if (matchupData.conditionalGameplans) {
                      matchupData.conditionalGameplans.forEach(gp => {
                        if (gp.myLead) allPokemonInMatchup.push(...extractPokemonFromText(gp.myLead));
                        if (gp.myBack) allPokemonInMatchup.push(...extractPokemonFromText(gp.myBack));
                      });
                    }
                  }
                  
                  // Also extract from the team composition section to ensure we get all Pokemon
                  const teamPokemon = extractPokemonFromContent(gameplan);
                  allPokemonInMatchup.push(...teamPokemon);
                  
                  // Remove duplicates
                  const uniquePokemon = Array.from(new Set(allPokemonInMatchup));
                  
                  // Group calculations by Pokemon
                  const calcsByPokemon: { [pokemon: string]: { [calcName: string]: string } } = {};
                  
                  Object.entries(damageCalcs).forEach(([calcName, calcDetails]) => {
                    // Find which Pokemon this calculation is for
                    const pokemonMatch = uniquePokemon.find(pokemon => 
                      calcName.toLowerCase().includes(pokemon.toLowerCase())
                    );
                    
                    if (pokemonMatch) {
                      if (!calcsByPokemon[pokemonMatch]) {
                        calcsByPokemon[pokemonMatch] = {};
                      }
                      calcsByPokemon[pokemonMatch][calcName] = calcDetails;
                    } else {
                      // If no direct match, try to find Pokemon mentioned in the calculation details
                      const mentionedPokemon = uniquePokemon.find(pokemon => 
                        calcDetails.toLowerCase().includes(pokemon.toLowerCase())
                      );
                      
                      if (mentionedPokemon) {
                        if (!calcsByPokemon[mentionedPokemon]) {
                          calcsByPokemon[mentionedPokemon] = {};
                        }
                        calcsByPokemon[mentionedPokemon][calcName] = calcDetails;
                      }
                    }
                  });
                  
                  return (
                    <div className="damage-calculations-section">
                      <h5 style={{ marginBottom: 16, color: '#fbbf24', fontWeight: 700, fontSize: 20 }}>
                        ⚡ Damage Calculations
                      </h5>
                      
                      {/* Pokemon Sprites Section */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {uniquePokemon.map(pokemon => (
                            <div
                              key={pokemon}
                              onClick={() => {
                                const pokemonCalcs = calcsByPokemon[pokemon];
                                if (pokemonCalcs && Object.keys(pokemonCalcs).length > 0) {
                                  // Toggle selection - if same Pokemon clicked, deselect
                                  setSelectedPokemonForCalcs(selectedPokemonForCalcs === pokemon ? '' : pokemon);
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                padding: 8,
                                borderRadius: 8,
                                border: selectedPokemonForCalcs === pokemon ? '2px solid #fbbf24' : '2px solid #333',
                                background: selectedPokemonForCalcs === pokemon ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                                width: 120,
                                height: 120
                              }}
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
                              <PokemonSprite pokemon={pokemon} size={56} />
                              <div style={{ 
                                fontSize: 12, 
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
                                  fontSize: 10, 
                                  color: '#fbbf24',
                                  fontWeight: 600
                                }}>
                                  {Object.keys(calcsByPokemon[pokemon]).length} calcs
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Selected Pokemon Damage Calculations */}
                      {selectedPokemonForCalcs && calcsByPokemon[selectedPokemonForCalcs] && (
                        <div style={{ marginTop: 20 }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: '#fbbf24', 
                            marginBottom: 12, 
                            fontSize: 18,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <PokemonSprite pokemon={selectedPokemonForCalcs} size={32} />
                            Damage Calculations for {selectedPokemonForCalcs}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {Object.entries(calcsByPokemon[selectedPokemonForCalcs]).map(([calcName, calcDetails]) => (
                              <div
                                key={calcName}
                                className="damage-calc-card"
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  borderRadius: 12,
                                  padding: 16,
                                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                                  border: '1px solid #333',
                                  color: '#e0e0e0',
                                }}
                              >
                                <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: 8, fontSize: 16 }}>
                                  {calcName}
                                </div>
                                <pre style={{ 
                                  whiteSpace: 'pre-wrap', 
                                  fontFamily: 'inherit', 
                                  fontSize: 14,
                                  margin: 0,
                                  color: '#a1a1aa'
                                }}>
                                  {calcDetails}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      

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
const CheatSheet: React.FC<{ gameplan: Gameplan }> = ({ gameplan }) => {

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
  const allPokemon = extractPokemonFromContent(gameplan);
  const teamWithItems = extractTeamPokemonWithItems(gameplan.content);
  
  console.log('CheatSheet Debug:');
  console.log('- allPokemon:', allPokemon);
  console.log('- teamWithItems:', teamWithItems);
  console.log('- teamWithItems.length:', teamWithItems?.length);

  return (
    <div className="cheat-sheet">
      <h3>🎯 Quick Reference</h3>
      
      {/* Team Overview */}
      <div className="cheat-section">
        <h4>Team Composition</h4>
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
      </div>



      {/* Interactive Matchup Selector */}
      <MatchupSelector gameplan={gameplan} />

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
  }, [gameplans, selectedGameplan]);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setIsModalOpen(false);
    setSelectedGameplan(null);
    setIsEditing(false);
  }, []);

  const saveGameplan = useCallback(() => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in both title and content fields.');
      return;
    }

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
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
              format: formData.format
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
        format: formData.format
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

  const resetData = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all data? This will clear localStorage and reload from the gameplans directory.')) {
      localStorage.removeItem('vgc-gameplans');
      // Reload gameplans from API (which will provide sample data if directory is empty)
      window.location.reload();
    }
  }, []);



  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(gameplans, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'vgc-gameplans-export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [gameplans]);

  const processImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
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
                const newGameplan = {
                  ...gameplan,
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                };
                mergedGameplans.push(newGameplan);
              });
              setGameplans(mergedGameplans);
            } else {
              // Replace all data
              setGameplans(validGameplans);
            }
            
            alert(`Successfully imported ${validGameplans.length} gameplan(s)!`);
          } else {
            alert('No valid gameplans found in the imported file.');
          }
        } else {
          alert('Invalid file format. Please select a valid JSON file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
        console.error('Import error:', error);
      }
    };
    
    reader.readAsText(file);
  }, [gameplans]);

  const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processImportFile(file);
    
    // Reset the input so the same file can be imported again
    event.target.value = '';
  }, [processImportFile]);

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
                const pokemonList = extractPokemonFromContent(gameplan);
                const isSelected = selectedGameplan?.id === gameplan.id;
                
                return (
                  <div 
                    key={gameplan.id} 
                    className={`gameplan-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleViewGameplan(gameplan)}
                  >
                    <div className="gameplan-list-header">
                      <h4 className="gameplan-list-title">{gameplan.title || 'Untitled'}</h4>
                      <div className="gameplan-list-actions">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditGameplan(gameplan); }}
                          className="btn-icon edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteGameplan(gameplan.id); }}
                          className="btn-icon delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {pokemonList && pokemonList.length > 0 && (
                      <div className="pokemon-row">
                        {pokemonList.slice(0, 6).map((pokemon, index) => (
                          <div key={`${pokemon}-${index}`} className="pokemon-mini">
                            <PokemonSprite pokemon={pokemon} size={32} />
                            <span className="pokemon-mini-name">{pokemon.length > 8 ? pokemon.substring(0, 8) + '...' : pokemon}</span>
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
                <CheatSheet gameplan={selectedGameplan} />
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
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your gameplan content in markdown format..."
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
      />

      {/* Hidden Import Input */}
      <input
        type="file"
        id="import-input"
        accept=".json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />

      {/* Reset Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reset Data</h3>
            <p>Are you sure you want to reset all data? This will clear localStorage and reload from the gameplans directory.</p>
            <div className="modal-actions">
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={resetData} className="btn btn-danger">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
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
