// "Jak to funguje" and FAQ of every identifier page: plain Czech text for people and search engines, written into
// the static HTML only (not into the script). Facts follow the approved rules in docs/rules/<id>.md; each identifier
// links its main official source.
import type { IdentifierId } from '../src/catalog.js';

export interface About {
  /** How the identifier is built and checked; one paragraph per item. */
  readonly how: readonly string[];
  /** The main official source: label and address. */
  readonly source: readonly [label: string, url: string];
  /** Frequent questions with short answers. */
  readonly faq: readonly (readonly [question: string, answer: string])[];
}

const REAL_PERSON =
  'Může. Generátor nekontroluje, jestli číslo někdo nemá, a platných kombinací je omezený počet. Používejte vygenerované hodnoty jen v testovacích systémech, ne v ostrých aplikacích ani úředních formulářích.';

export const ABOUT = {
  birthNumber: {
    how: [
      'Rodné číslo má tvar RRMMDD/XXXX: rok, měsíc a den narození a za lomítkem čtyřmístná koncovka. Ženy mají k měsíci přičteno 50, takže žena narozená v květnu má měsíc 55.',
      'Desetimístné rodné číslo musí být dělitelné jedenácti. Výjimkou jsou čísla vydaná do roku 1985, u kterých vyšel zbytek 10 a na konec se napsala nula. Lidé narození před rokem 1954 mají jen devět číslic a žádnou kontrolu.',
      'Od roku 2004 se může k měsíci přičíst ještě 20 (u žen tedy 70), když v daném dni dojdou volné koncovky. Mnoho validátorů o tom neví.',
    ],
    source: ['Zákon č. 133/2000 Sb., o evidenci obyvatel a rodných číslech, § 13', 'https://www.zakonyprolidi.cz/cs/2000-133'],
    faq: [
      ['Je vygenerované rodné číslo skutečné?', REAL_PERSON],
      ['Proč má žena v rodném čísle měsíc větší než 50?', 'Ženám se k měsíci narození přičítá 50. Měsíc 51 až 62 je tedy leden až prosinec u žen.'],
      ['Musí být v rodném čísle lomítko?', 'Nemusí. Lidé ho píšou s lomítkem i bez něj a formulář by měl zvládnout obojí. Generátor umí obě podoby.'],
      ['Proč formulář odmítá rodné číslo s měsícem +20?', 'Protože jeho validátor nezná pravidlo z roku 2004. Takové číslo je platné, a právě proto ho stojí za to vyzkoušet.'],
    ],
  },
  ico: {
    how: [
      'IČO (identifikační číslo osoby) má osm číslic. Prvních sedm se vynásobí vahami 8, 7, 6, 5, 4, 3 a 2, výsledky se sečtou a z jedenáctkového zbytku vyjde osmá, kontrolní číslice.',
      'Když by kontrolní číslice vyšla 10, píše se 0, a když 11, píše se 1. Kratší IČO se doplňují nulami zleva, takže platné IČO může začínat i několika nulami.',
    ],
    source: ['Zákon č. 111/2009 Sb., o základních registrech', 'https://e-sbirka.gov.cz/sb/2009/111'],
    faq: [
      ['Patří vygenerované IČO skutečné firmě?', 'Může. Platných IČO je málo a mnohá jsou přidělená. Generátor existenci v registru neověřuje, proto hodnoty používejte jen v testech.'],
      ['Proč Excel z IČO udělá sedm číslic?', 'Excel bere IČO jako číslo a úvodní nulu zahodí. Ukládejte IČO jako text a vyzkoušejte to s hraniční variantou „Nula na začátku“.'],
      ['Je IČ totéž co IČO?', 'Ano. IČ je starší zkratka pro stejné osmimístné číslo.'],
    ],
  },
  dic: {
    how: [
      'DIČ (daňové identifikační číslo) začíná CZ. U firem za ním následuje IČO, u fyzických osob rodné číslo bez lomítka a ve zvláštních případech číslo přidělené finančním úřadem.',
      'U DIČ odvozeného z IČO nebo rodného čísla platí kontrolní součet původního čísla. Skupina plátců DPH má DIČ začínající CZ699.',
    ],
    source: ['Zákon č. 280/2009 Sb., daňový řád', 'https://e-sbirka.gov.cz/sb/2009/280'],
    faq: [
      ['Jak poznám DIČ firmy a DIČ fyzické osoby?', 'Za CZ má firma osm číslic (IČO), fyzická osoba devět nebo deset (rodné číslo bez lomítka).'],
      ['Je DIČ s malým „cz“ platné?', 'Záleží na výkladu, proto je tahle varianta označená jako sporná. Rozhodněte podle zadání vaší aplikace.'],
      ['Mají všechny firmy DIČ?', 'Ne. DIČ dostane jen registrovaný daňový subjekt. Firma tedy může mít IČO a DIČ nemít.'],
    ],
  },
  bankAccount: {
    how: [
      'Číslo účtu má tvar předčíslí-číslo/kód banky. Předčíslí má nejvýš šest číslic a je nepovinné, číslo účtu dvě až deset číslic a kód banky čtyři číslice.',
      'Předčíslí i číslo se kontrolují zvlášť: číslice se vynásobí vahami 6, 3, 7, 9, 10, 5, 8, 4, 2, 1 (zarovnanými zprava) a součet musí být dělitelný jedenácti. Kód banky musí být v číselníku ČNB.',
    ],
    source: ['Vyhláška ČNB č. 169/2011 Sb.', 'https://e-sbirka.gov.cz/sb/2011/169'],
    faq: [
      ['Existuje vygenerovaný účet doopravdy?', 'Nejspíš ne, ale zaručit to nejde. Na vygenerované účty nikdy neposílejte peníze a používejte je jen v testech.'],
      ['Které kódy bank generátor používá?', 'Kódy z číselníku ČNB přibaleného v knihovně. Datum stažení číselníku je uvedené v dokumentaci.'],
      ['Projde účet ze samých nul?', 'Kontrolou modulo 11 projde, ale platný není. Je to dobrá zkouška naivního validátoru.'],
    ],
  },
  iban: {
    how: [
      'Český IBAN má 24 znaků: CZ, dvě kontrolní číslice, čtyřmístný kód banky, šestimístné předčíslí a desetimístné číslo účtu, obojí doplněné nulami zleva.',
      'Kontrolní číslice se počítají modulo 97 podle ISO 13616. IBAN může tuto kontrolu projít, a přesto být neplatný, když neprojde číslo účtu uvnitř.',
    ],
    source: ['Česká národní banka: IBAN – mezinárodní formát čísla účtu', 'https://www.cnb.cz/cs/platebni-styk/iban/iban-mezinarodni-format-cisla-uctu/'],
    faq: [
      ['Jak převedu číslo účtu na IBAN?', 'Doplňte předčíslí na šest a číslo na deset číslic, přidejte kód banky a spočítejte kontrolní číslice. Generátor na téhle stránce umí převést zadané číslo účtu.'],
      ['Píše se IBAN s mezerami?', 'Na papíře se píše po čtveřicích, ve formulářích obvykle bez mezer. Formulář by měl přijmout obojí, nebo mezery sám odstranit.'],
      ['Projde IBAN s malými písmeny?', 'Záleží na výkladu, proto je tahle varianta označená jako sporná.'],
    ],
  },
  phone: {
    how: [
      'České telefonní číslo má předvolbu +420 a devět číslic. Která řada je mobilní, pevná nebo speciální, určuje číslovací plán Českého telekomunikačního úřadu.',
      'Plán se mění: řada 706 až 719 je mobilní teprve od roku 2022 a starší knihovny ji neznají. Telefonní čísla nemají kontrolní součet, kontroluje se jen délka a řada.',
    ],
    source: ['Vyhláška č. 117/2007 Sb., o číslovacích plánech', 'https://www.zakonyprolidi.cz/cs/2007-117'],
    faq: [
      ['Mohu na vygenerované číslo zavolat?', 'Ne. Česko nemá fiktivní telefonní řadu, takže vygenerované číslo může patřit skutečnému člověku. Nevolejte ani neposílejte SMS.'],
      ['Je číslo bez +420 platné?', 'Uvnitř Česka se běžně píše jen devět číslic. Formulář by měl předvolbu doplnit, nebo přijmout obě podoby.'],
      ['Proč formulář odmítá čísla začínající 71?', 'Řada 706 až 719 je mobilní od roku 2022 a starší validátory ji neznají.'],
    ],
  },
  postalCode: {
    how: [
      'PSČ má pět číslic a píše se s mezerou po třetí, například 110 00. První číslice určuje oblast a v Česku je 1 až 7; PSČ začínající 0, 8 nebo 9 jsou slovenská.',
      'PSČ nemá kontrolní součet. Kontroluje se jen tvar, ne to, jestli kód v seznamu České pošty opravdu existuje.',
    ],
    source: ['Česká pošta: seznam PSČ ke stažení', 'https://www.ceskaposta.cz/ke-stazeni/zakaznicke-vystupy'],
    faq: [
      ['Existuje vygenerované PSČ?', 'Většinou ne. Generátor vytváří kódy správného tvaru, ne kódy ze seznamu České pošty.'],
      ['Píše se PSČ s mezerou?', 'Správně ano (123 45), ale lidé ho často píšou bez mezery. Formulář by měl přijmout obě podoby.'],
      ['Jak poznám slovenské PSČ?', 'Začíná 0, 8 nebo 9. Česká PSČ začínají 1 až 7.'],
    ],
  },
  ean: {
    how: [
      'EAN odběrného místa elektřiny má 18 číslic. Začíná 8591824, následuje kód distribuční soustavy a pořadové číslo a poslední číslice je kontrolní podle standardu GS1.',
      'EAN najdete na faktuře za elektřinu nebo ve smlouvě s dodavatelem. Každé odběrné místo má vlastní EAN.',
    ],
    source: ['Vyhláška č. 408/2015 Sb., o Pravidlech trhu s elektřinou', 'https://www.zakonyprolidi.cz/cs/2015-408'],
    faq: [
      ['Patří vygenerovaný EAN skutečnému odběrnému místu?', 'Může. Generátor vytváří platné kódy, ne kódy z registru. Používejte je jen v testech.'],
      ['Proč se EAN v Excelu změní na 8,59E+17?', 'Excel ho bere jako číslo a osmnáct číslic neudrží přesně. Ukládejte EAN jako text.'],
      ['Jaký je rozdíl mezi EAN a EIC?', 'EAN označuje odběrné místo elektřiny, EIC odběrné místo plynu.'],
    ],
  },
  eic: {
    how: [
      'EIC kód odběrného místa plynu má 16 znaků. Začíná 27ZG, pokračuje kódem distributora a pořadovým číslem a poslední znak je kontrolní podle pravidel ENTSO-E.',
      'Kontrolní znak může být číslice i písmeno, nikdy ale pomlčka. Kód najdete na faktuře za plyn.',
    ],
    source: ['Vyhláška č. 349/2015 Sb., o Pravidlech trhu s plynem', 'https://www.zakonyprolidi.cz/cs/2015-349'],
    faq: [
      ['Patří vygenerovaný EIC skutečnému odběrnému místu?', 'Vygenerované kódy jsou testovací, nejsou přidělené skutečným odběrným místům. Přesto je používejte jen v testech.'],
      ['Proč EIC začíná 27ZG?', '27 je český vydavatel kódů EIC a Z znamená měřicí místo. Odběrná místa plynu v Česku mají začátek 27ZG; kód s jiným začátkem je jiného typu.'],
      ['Jaký je rozdíl mezi EIC a EAN?', 'EIC označuje odběrné místo plynu, EAN odběrné místo elektřiny.'],
    ],
  },
  vin: {
    how: [
      'VIN (identifikační číslo vozidla) má 17 znaků: číslice a velká písmena bez I, O a Q. První tři znaky určují výrobce, například TMB je Škoda.',
      'Na 9. pozici je kontrolní znak: znaky se převedou na čísla, vynásobí vahami a zbytek po dělení jedenácti je kontrolní číslice, přičemž 10 se píše jako X. V EU je povinný u všech nově registrovaných vozidel od 7. července 2026, starší evropská auta ho často nemají.',
    ],
    source: ['Prováděcí nařízení (EU) 2021/535, příloha II', 'https://eur-lex.europa.eu/eli/reg_impl/2021/535/oj'],
    faq: [
      ['Patří vygenerované VIN skutečnému autu?', 'Může. Vygenerovaná VIN začínají kódem Škody TMB a mohou se shodovat se skutečným vozidlem. Používejte je jen v testech.'],
      ['Proč starší auto neprojde kontrolou VIN?', 'EU dříve kontrolní znak nevyžadovala, takže ho mnoho evropských aut nemá platný. Formulář, který musí přijmout i starší auta, nesmí kontrolní znak vyžadovat.'],
      ['Proč VIN neobsahuje písmena I, O a Q?', 'Pletou se s číslicemi 1 a 0, proto je norma zakazuje.'],
    ],
  },
} satisfies Record<IdentifierId, About>;
