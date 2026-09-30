import type { TreatmentContent } from './types';

const content: Record<string, TreatmentContent> = {
  'crowns-bridges': {
    sq: {
      intro:
        'Kurorat mbulojnë dhe mbrojnë një dhëmb të dobësuar, ndërsa urat zëvendësojnë një dhëmb që mungon duke u mbështetur te dhëmbët fqinjë. Të dyja rikthejnë funksionin e përtypjes dhe pamjen e buzëqeshjes.',
      body: [
        'Kurora është një “kapak” i punuar me porosi që vendoset mbi një dhëmb të prishur rëndë, të thyer, me mbushje të madhe ose pas trajtimit të kanalit. Ura përdoret kur mungon një ose disa dhëmbë radhazi: dhëmbët në të dy anët e hapësirës përgatiten si mbështetëse dhe mbajnë një dhëmb artificial në mes. Në klinikën tonë punojmë kryesisht me dy materiale: zirkon dhe metal-qeramikë. Mjeku do t’ju këshillojë se cili përshtatet më mirë me vendin e dhëmbit, forcën e kafshimit dhe dëshirat tuaja estetike.',
        'Zirkoni është pa metal, shumë i fortë dhe duket më natyral pranë mishrave, prandaj zgjidhet shpesh për dhëmbët e dukshëm. Metal-qeramika është një zgjidhje e provuar prej dekadash dhe zakonisht më ekonomike, por me kalimin e kohës mund të shfaqet një vijë e hirtë në kufi me mishrat. Trajtimi zakonisht kërkon dy ose më shumë vizita, bëhet me anestezi lokale dhe, me higjienë të mirë e kontrolle të rregullta, kurorat dhe urat mund të zgjasin shumë vite.',
      ],
      steps: [
        { title: 'Ekzaminimi dhe radiografia', text: 'Kontrollojmë dhëmbin, mishrat dhe rrënjët me radiografi, dhe diskutojmë nëse ju nevojitet kurorë apo urë.' },
        { title: 'Përgatitja e dhëmbit', text: 'Nën anestezi lokale, dhëmbi hollohet lehtë në të gjitha anët që të krijohet vend për kurorën.' },
        { title: 'Masa ose skanimi', text: 'Marrim masën e dhëmbëve me material të butë ose me skanim dixhital, për një përshtatje të saktë.' },
        { title: 'Kurora e përkohshme', text: 'Vendosim një kurorë të përkohshme që mbron dhëmbin dhe ruan pamjen deri në vizitën tjetër.' },
        { title: 'Punimi në laborator', text: 'Laboratori dentar e punon kurorën ose urën sipas masave dhe ngjyrës së zgjedhur për dhëmbët tuaj.' },
        { title: 'Provimi dhe çimentimi', text: 'Kontrollojmë përshtatjen, kafshimin dhe ngjyrën, pastaj e fiksojmë përfundimisht kurorën ose urën.' },
      ],
      faq: [
        { q: 'Cili është ndryshimi mes kurorës dhe urës?', a: 'Kurora mbulon një dhëmb ekzistues që është dëmtuar. Ura zëvendëson një dhëmb që mungon dhe mbahet nga kurorat mbi dhëmbët fqinjë.' },
        { q: 'A dhemb vendosja e kurorës?', a: 'Përgatitja bëhet me anestezi lokale, kështu që zakonisht ndjeni vetëm presion. Për disa ditë pas vendosjes mund të keni ndjeshmëri të lehtë, e cila zakonisht kalon vetë.' },
        { q: 'Si të zgjedh mes zirkonit dhe metal-qeramikës?', a: 'Zirkoni është pa metal dhe më natyral në pamje, veçanërisht te dhëmbët e përparmë. Metal-qeramika është e provuar dhe zakonisht më ekonomike; mjeku do t’ju ndihmojë të vendosni sipas rastit tuaj.' },
        { q: 'A ka alternativë ndaj urës?', a: 'Në shumë raste, një dhëmb që mungon mund të zëvendësohet edhe me implant, i cili nuk kërkon përgatitjen e dhëmbëve fqinjë. Mjeku do t’ju shpjegojë përparësitë e secilës zgjidhje.' },
      ],
      seoDescription: 'Kurora dhe ura dentare në Prishtinë, me zirkon ose metal-qeramikë, për të rikthyer dhëmbët e dëmtuar ose që mungojnë.',
    },
    en: {
      intro:
        'A crown covers and protects a weakened tooth, while a bridge replaces a missing tooth by anchoring onto the teeth either side. Both restore comfortable chewing and the look of your smile.',
      body: [
        'A crown is a custom-made cap that fits over a tooth that is badly decayed, cracked, heavily filled or root-treated. A bridge is used when one or more teeth in a row are missing: the teeth on each side of the gap are prepared as supports and carry an artificial tooth in between. We mainly work with two materials, zirconia and metal-ceramic. Your dentist will advise which suits the position of the tooth, your bite and your aesthetic wishes.',
        'Zirconia is metal-free, very strong and looks more natural at the gum line, so it is often chosen for visible teeth. Metal-ceramic has been used successfully for decades and is usually the more economical option, although a thin grey line can sometimes appear at the gum over time. Treatment usually takes two or more visits under local anaesthetic, and with good hygiene and regular check-ups, crowns and bridges can last many years.',
      ],
      steps: [
        { title: 'Exam and X-ray', text: 'We check the tooth, gums and roots with an X-ray and discuss whether a crown or a bridge is the right option.' },
        { title: 'Tooth preparation', text: 'Under local anaesthetic, the tooth is gently reshaped on all sides to make room for the crown.' },
        { title: 'Impression or scan', text: 'We record the shape of your teeth with a soft impression material or a digital scan for an accurate fit.' },
        { title: 'Temporary crown', text: 'A temporary crown protects the tooth and keeps your smile looking natural until the next visit.' },
        { title: 'Lab fabrication', text: 'A dental laboratory makes your crown or bridge to the recorded shape and the shade chosen for your teeth.' },
        { title: 'Try-in and cementation', text: 'We check the fit, bite and colour, then fix the crown or bridge permanently in place.' },
      ],
      faq: [
        { q: 'What is the difference between a crown and a bridge?', a: 'A crown covers an existing tooth that has been damaged. A bridge replaces a missing tooth and is held in place by crowns on the neighbouring teeth.' },
        { q: 'Does getting a crown hurt?', a: 'Preparation is done under local anaesthetic, so you usually feel only pressure. Mild sensitivity for a few days afterwards is common and normally settles on its own.' },
        { q: 'How do I choose between zirconia and metal-ceramic?', a: 'Zirconia is metal-free and more natural-looking, especially on front teeth. Metal-ceramic is proven and usually more economical; your dentist will help you decide based on your situation.' },
        { q: 'Is there an alternative to a bridge?', a: 'In many cases a missing tooth can also be replaced with an implant, which does not require preparing the neighbouring teeth. Your dentist will explain the pros and cons of each option.' },
      ],
      seoDescription: 'Dental crowns and bridges in Prishtina, in zirconia or metal-ceramic, to restore damaged or missing teeth with a natural look and feel.',
    },
    de: {
      intro:
        'Eine Krone umschließt und schützt einen geschwächten Zahn, eine Brücke ersetzt einen fehlenden Zahn und stützt sich dabei auf die Nachbarzähne. Beide stellen Kaufunktion und Ästhetik Ihres Lächelns wieder her.',
      body: [
        'Eine Krone ist eine individuell gefertigte Kappe für einen Zahn, der stark kariös, gebrochen, großflächig gefüllt oder wurzelbehandelt ist. Eine Brücke kommt zum Einsatz, wenn ein oder mehrere Zähne in einer Reihe fehlen: Die Zähne beiderseits der Lücke werden als Pfeiler vorbereitet und tragen dazwischen einen künstlichen Zahn. Wir arbeiten vor allem mit zwei Materialien, Zirkon und Metallkeramik. Ihr Zahnarzt berät Sie, welches Material zur Zahnposition, zu Ihrem Biss und zu Ihren ästhetischen Wünschen passt.',
        'Zirkon ist metallfrei, sehr belastbar und wirkt am Zahnfleischrand natürlicher, weshalb es häufig für sichtbare Zähne gewählt wird. Metallkeramik hat sich seit Jahrzehnten bewährt und ist meist die günstigere Lösung, allerdings kann sich mit der Zeit ein grauer Rand am Zahnfleisch zeigen. Die Behandlung umfasst in der Regel zwei oder mehr Termine unter örtlicher Betäubung. Bei guter Mundhygiene und regelmäßigen Kontrollen halten Kronen und Brücken viele Jahre.',
      ],
      steps: [
        { title: 'Untersuchung und Röntgen', text: 'Wir untersuchen Zahn, Zahnfleisch und Wurzeln mit einem Röntgenbild und besprechen, ob eine Krone oder eine Brücke sinnvoll ist.' },
        { title: 'Präparation des Zahns', text: 'Unter örtlicher Betäubung wird der Zahn rundum schonend beschliffen, um Platz für die Krone zu schaffen.' },
        { title: 'Abformung oder Scan', text: 'Wir erfassen die Form Ihrer Zähne mit einer Abformmasse oder einem digitalen Scan für eine genaue Passform.' },
        { title: 'Provisorische Krone', text: 'Ein Provisorium schützt den Zahn und sorgt bis zum nächsten Termin für ein natürliches Aussehen.' },
        { title: 'Fertigung im Labor', text: 'Ein zahntechnisches Labor fertigt Ihre Krone oder Brücke nach der Abformung und in der ausgewählten Zahnfarbe.' },
        { title: 'Einprobe und Befestigung', text: 'Wir prüfen Passform, Biss und Farbe und befestigen die Krone oder Brücke anschließend dauerhaft.' },
      ],
      faq: [
        { q: 'Was ist der Unterschied zwischen Krone und Brücke?', a: 'Eine Krone umschließt einen vorhandenen, geschädigten Zahn. Eine Brücke ersetzt einen fehlenden Zahn und wird von Kronen auf den Nachbarzähnen getragen.' },
        { q: 'Ist das Einsetzen einer Krone schmerzhaft?', a: 'Die Präparation erfolgt unter örtlicher Betäubung, sodass Sie meist nur Druck spüren. Eine leichte Empfindlichkeit in den ersten Tagen ist üblich und klingt in der Regel von selbst ab.' },
        { q: 'Wie wähle ich zwischen Zirkon und Metallkeramik?', a: 'Zirkon ist metallfrei und wirkt besonders im Frontzahnbereich natürlicher. Metallkeramik ist bewährt und meist günstiger; Ihr Zahnarzt hilft Ihnen, passend zu Ihrer Situation zu entscheiden.' },
        { q: 'Gibt es eine Alternative zur Brücke?', a: 'In vielen Fällen lässt sich ein fehlender Zahn auch durch ein Implantat ersetzen, bei dem die Nachbarzähne nicht beschliffen werden müssen. Ihr Zahnarzt erklärt Ihnen die Vor- und Nachteile beider Wege.' },
      ],
      seoDescription: 'Zahnkronen und Brücken in Prishtina aus Zirkon oder Metallkeramik, um beschädigte oder fehlende Zähne natürlich wiederherzustellen.',
    },
  },

  'zirconia-crowns': {
    sq: {
      intro:
        'Kurorat e zirkonit janë kurora pa metal, të forta dhe me ngjyrë që përshtatet me dhëmbët tuaj. Janë zgjidhje e mirë si për dhëmbët e përparmë, ashtu edhe për ata të pasmë.',
      body: [
        'Zirkoni është një material qeramik shumë i qëndrueshëm, që i reziston mirë forcave të përtypjes. Meqë nuk ka bazë metalike, drita kalon më natyrshëm përmes kurorës dhe nuk krijohet vijë e errët në kufi me mishrat. Kjo e bën të përshtatshëm për dhëmbët e dukshëm, për ura të shkurtra dhe për pacientët që preferojnë një restaurim pa metal ose kanë ndjeshmëri ndaj metaleve. Zirkoni është gjithashtu shumë i pajtueshëm me indet e gojës.',
        'Trajtimi zakonisht kërkon dy vizita, herë pas here tri. Në të parën, dhëmbi përgatitet nën anestezi lokale, zgjidhet ngjyra dhe merret masa ose skanimi dixhital; në të dytën, pasi laboratori e ka punuar kurorën, ajo provohet dhe çimentohet. Gjatë përgatitjes shumica e pacientëve ndjejnë vetëm presion. Pas vendosjes, dhëmbi ose mishi mund të jenë pak të ndjeshëm për disa ditë, gjë që zakonisht kalon vetë.',
        'Kujdesuni për kurorën si për një dhëmb natyral: lani dhëmbët dy herë në ditë me pastë me fluor, pastroni mes dhëmbëve me fill dentar ose furçë ndërdhëmbore dhe vini rregullisht në kontroll. Shmangni kafshimin e sendeve shumë të forta, si akulli ose kapakët e stilolapsave. Me kujdes të mirë, një kurorë zirkoni mund të zgjasë shumë vite. Zakonisht kushton më shumë se një kurorë metal-qeramike, dhe mjeku do t’ju ndihmojë të vlerësoni nëse përparësitë estetike dhe mungesa e metalit ia vlejnë në rastin tuaj.',
      ],
      steps: [
        { title: 'Konsulta dhe radiografia', text: 'Ekzaminojmë dhëmbin dhe mishrat, bëjmë radiografi dhe konfirmojmë nëse kurora e zirkonit është zgjidhja e duhur.' },
        { title: 'Përgatitja e dhëmbit', text: 'Nën anestezi lokale, dhëmbi hollohet lehtë për të krijuar vend për kurorën.' },
        { title: 'Masa dhe ngjyra', text: 'Regjistrojmë dhëmbët me masë ose skanim dixhital dhe zgjedhim ngjyrën që përputhet me dhëmbët fqinjë.' },
        { title: 'Kurora e përkohshme', text: 'Një kurorë e përkohshme e mbron dhëmbin ndërsa laboratori punon kurorën tuaj të zirkonit.' },
        { title: 'Vendosja', text: 'Kontrollojmë përshtatjen, kafshimin dhe ngjyrën, bëjmë rregullime të vogla nëse duhen dhe e çimentojmë kurorën.' },
        { title: 'Kujdesi pas trajtimit', text: 'Ju shpjegojmë si të kujdeseni për kurorën në shtëpi dhe kur të vini për kontroll.' },
      ],
      faq: [
        { q: 'A duket natyrale kurora e zirkonit?', a: 'Po, ngjyra zgjidhet sipas dhëmbëve tuaj dhe, pa bazë metalike, kurora nuk krijon hije të errët pranë mishrave. Për dhëmbët e përparmë, zirkoni shpesh veshet me një shtresë qeramike për më shumë tejdukshmëri.' },
        { q: 'A dhemb vendosja e kurorës së zirkonit?', a: 'Dhëmbi mpihet me anestezi lokale, kështu që zakonisht ndjeni vetëm presion dhe dridhje. Ndjeshmëria e lehtë për disa ditë pas trajtimit është e zakonshme dhe zakonisht kalon vetë.' },
        { q: 'Sa zgjat një kurorë zirkoni?', a: 'Me higjienë të mirë dhe kontrolle të rregullta, kurorat e zirkonit zakonisht zgjasin shumë vite. Jetëgjatësia varet edhe nga kafshimi, zakonet si shtrëngimi i dhëmbëve dhe gjendja e mishrave.' },
        { q: 'A është i përshtatshëm zirkoni për dhëmbët e pasmë?', a: 'Po, forca e lartë e zirkonit e bën të përshtatshëm edhe për dhëmbëballët, ku forcat e përtypjes janë më të mëdha. Mjeku do të vlerësojë nëse ka vend të mjaftueshëm dhe si është kafshimi juaj.' },
        { q: 'Si krahasohet zirkoni me metal-qeramikën?', a: 'Të dyja janë të forta. Zirkoni është pa metal dhe duket më natyral pranë mishrave, ndërsa metal-qeramika zakonisht është më ekonomike; zgjedhja varet nga dhëmbi, kafshimi dhe përparësitë tuaja.' },
        { q: 'A mund të ngjyroset kurora e zirkonit?', a: 'Zirkoni është shumë rezistent ndaj njollave nga kafeja, çaji ose duhani. Megjithatë, pastrimi i rregullt mbetet i rëndësishëm për mishrat dhe dhëmbin poshtë kurorës.' },
      ],
      seoDescription: 'Kurora zirkoni në Prishtinë: kurora pa metal, të forta dhe me pamje natyrale për dhëmbët e përparmë dhe të pasmë.',
    },
    en: {
      intro:
        'Zirconia crowns are metal-free crowns that are strong and colour-matched to your own teeth. They work well for both front and back teeth.',
      body: [
        'Zirconia is a very durable ceramic material that stands up well to chewing forces. Because there is no metal core, light passes through the crown more naturally and no dark line forms at the gum margin. This makes it a good choice for visible teeth, short bridges and patients who prefer a metal-free restoration or are sensitive to metals. Zirconia is also very well tolerated by the gums and the tissues of the mouth.',
        'Treatment usually takes two visits, occasionally three. At the first, the tooth is prepared under local anaesthetic, the shade is chosen and an impression or digital scan is taken; at the second, once the laboratory has made the crown, it is checked and cemented. During preparation most people feel only pressure. Afterwards the tooth or gum may feel slightly tender or sensitive for a few days, which usually settles without treatment.',
        'Look after the crown as you would a natural tooth: brush twice a day with a fluoride toothpaste, clean between the teeth with floss or interdental brushes and keep up regular check-ups. Try not to bite on very hard things such as ice or pen tops. With good care, a zirconia crown can last many years. It usually costs more than a metal-ceramic crown, and your dentist can help you weigh up whether the aesthetic and metal-free benefits are worth it in your case.',
      ],
      steps: [
        { title: 'Consultation and X-ray', text: 'We examine the tooth and gums, take an X-ray and confirm that a zirconia crown is the right option.' },
        { title: 'Tooth preparation', text: 'Under local anaesthetic, the tooth is reshaped slightly to make room for the crown.' },
        { title: 'Scan and shade', text: 'We record your teeth with an impression or digital scan and choose a shade that matches your neighbouring teeth.' },
        { title: 'Temporary crown', text: 'A temporary crown protects the tooth while the laboratory makes your zirconia crown.' },
        { title: 'Fitting', text: 'We check the fit, bite and colour, make any small adjustments and cement the crown in place.' },
        { title: 'Aftercare', text: 'We explain how to care for the crown at home and when to come back for a check-up.' },
      ],
      faq: [
        { q: 'Will a zirconia crown look natural?', a: 'Yes, the shade is matched to your teeth and, without a metal core, there is no dark shadow near the gum. For front teeth, zirconia is often layered with ceramic for extra translucency.' },
        { q: 'Does getting a zirconia crown hurt?', a: 'The tooth is numbed with local anaesthetic, so you usually feel only pressure and vibration. Mild sensitivity for a few days afterwards is common and normally fades on its own.' },
        { q: 'How long does a zirconia crown last?', a: 'With good hygiene and regular check-ups, zirconia crowns usually last many years. Longevity also depends on your bite, habits such as teeth grinding and the health of your gums.' },
        { q: 'Is zirconia suitable for back teeth?', a: 'Yes, its high strength makes it suitable for molars, where chewing forces are greatest. Your dentist will check that there is enough space and assess your bite.' },
        { q: 'How does zirconia compare with metal-ceramic?', a: 'Both are strong. Zirconia is metal-free and looks more natural at the gum line, while metal-ceramic is usually more economical; the right choice depends on the tooth, your bite and your priorities.' },
        { q: 'Can a zirconia crown stain?', a: 'Zirconia is highly resistant to staining from coffee, tea or smoking. Regular cleaning is still important for the gums and the tooth underneath the crown.' },
      ],
      seoDescription: 'Zirconia crowns in Prishtina: strong, metal-free crowns with a natural look for both front and back teeth.',
    },
    de: {
      intro:
        'Zirkonkronen sind metallfreie Kronen, die sehr stabil sind und farblich an Ihre eigenen Zähne angepasst werden. Sie eignen sich für Front- und Seitenzähne.',
      body: [
        'Zirkon ist ein äußerst widerstandsfähiger keramischer Werkstoff, der den Kaukräften gut standhält. Da kein Metallgerüst vorhanden ist, lässt die Krone das Licht natürlicher durch, und am Zahnfleischrand entsteht kein dunkler Rand. Damit ist Zirkon eine gute Wahl für sichtbare Zähne, kurze Brücken und für Patienten, die eine metallfreie Versorgung bevorzugen oder empfindlich auf Metalle reagieren. Zudem wird Zirkon vom Zahnfleisch und den Geweben im Mund sehr gut vertragen.',
        'Die Behandlung umfasst in der Regel zwei, gelegentlich drei Termine. Beim ersten wird der Zahn unter örtlicher Betäubung präpariert, die Farbe bestimmt und eine Abformung oder ein digitaler Scan angefertigt; beim zweiten wird die im Labor gefertigte Krone einprobiert und befestigt. Während der Präparation spüren die meisten Patienten nur Druck. Danach können Zahn oder Zahnfleisch einige Tage leicht empfindlich sein, was in der Regel von selbst abklingt.',
        'Pflegen Sie die Krone wie einen natürlichen Zahn: zweimal täglich mit fluoridhaltiger Zahnpasta putzen, die Zwischenräume mit Zahnseide oder Interdentalbürsten reinigen und regelmäßig zur Kontrolle kommen. Beißen Sie möglichst nicht auf sehr harte Dinge wie Eis oder Stiftkappen. Bei guter Pflege kann eine Zirkonkrone viele Jahre halten. Sie ist meist teurer als eine Metallkeramikkrone; Ihr Zahnarzt hilft Ihnen abzuwägen, ob sich die ästhetischen Vorteile und die Metallfreiheit in Ihrem Fall lohnen.',
      ],
      steps: [
        { title: 'Beratung und Röntgen', text: 'Wir untersuchen Zahn und Zahnfleisch, fertigen ein Röntgenbild an und klären, ob eine Zirkonkrone die richtige Lösung ist.' },
        { title: 'Präparation des Zahns', text: 'Unter örtlicher Betäubung wird der Zahn leicht beschliffen, um Platz für die Krone zu schaffen.' },
        { title: 'Scan und Farbwahl', text: 'Wir erfassen Ihre Zähne per Abformung oder digitalem Scan und wählen eine Farbe passend zu den Nachbarzähnen.' },
        { title: 'Provisorium', text: 'Ein Provisorium schützt den Zahn, während das Labor Ihre Zirkonkrone fertigt.' },
        { title: 'Einsetzen', text: 'Wir prüfen Passform, Biss und Farbe, nehmen kleine Korrekturen vor und befestigen die Krone.' },
        { title: 'Nachsorge', text: 'Wir erklären Ihnen die Pflege zu Hause und vereinbaren den nächsten Kontrolltermin.' },
      ],
      faq: [
        { q: 'Sieht eine Zirkonkrone natürlich aus?', a: 'Ja, die Farbe wird an Ihre Zähne angepasst, und ohne Metallgerüst entsteht kein dunkler Schatten am Zahnfleisch. Im Frontzahnbereich wird Zirkon oft mit Keramik verblendet, um mehr Transluzenz zu erreichen.' },
        { q: 'Tut das Einsetzen einer Zirkonkrone weh?', a: 'Der Zahn wird örtlich betäubt, sodass Sie meist nur Druck und Vibration spüren. Eine leichte Empfindlichkeit in den Tagen danach ist üblich und klingt in der Regel von selbst ab.' },
        { q: 'Wie lange hält eine Zirkonkrone?', a: 'Bei guter Mundhygiene und regelmäßigen Kontrollen halten Zirkonkronen in der Regel viele Jahre. Die Haltbarkeit hängt auch von Ihrem Biss, Gewohnheiten wie Zähneknirschen und der Gesundheit des Zahnfleischs ab.' },
        { q: 'Eignet sich Zirkon auch für Backenzähne?', a: 'Ja, dank seiner hohen Festigkeit eignet sich Zirkon auch für Backenzähne, wo die Kaukräfte am größten sind. Ihr Zahnarzt prüft, ob ausreichend Platz vorhanden ist, und beurteilt Ihren Biss.' },
        { q: 'Wie schneidet Zirkon im Vergleich zu Metallkeramik ab?', a: 'Beide Materialien sind stabil. Zirkon ist metallfrei und wirkt am Zahnfleischrand natürlicher, Metallkeramik ist meist günstiger; die Wahl hängt vom Zahn, Ihrem Biss und Ihren Prioritäten ab.' },
        { q: 'Kann sich eine Zirkonkrone verfärben?', a: 'Zirkon ist sehr beständig gegen Verfärbungen durch Kaffee, Tee oder Rauchen. Eine regelmäßige Reinigung bleibt dennoch wichtig für das Zahnfleisch und den Zahn unter der Krone.' },
      ],
      seoDescription: 'Zirkonkronen in Prishtina: stabile, metallfreie Kronen mit natürlichem Aussehen für Front- und Seitenzähne.',
    },
  },

  'metal-ceramic-crowns': {
    sq: {
      intro:
        'Kurorat metal-qeramike kanë një bazë metalike të veshur me qeramikë me ngjyrë dhëmbi. Janë zgjidhje e provuar prej dekadash, e qëndrueshme dhe zakonisht më ekonomike.',
      body: [
        'Në këtë lloj kurore, një skelet i hollë metalik i jep forcë, ndërsa shtresa e qeramikës sipër i jep pamjen e një dhëmbi natyral. Përdoret për të rikthyer dhëmbë të çarë, të konsumuar ose të thyer, për të zëvendësuar mbushje të mëdha e të vjetra, për të mbrojtur një dhëmb pas mjekimit të kanalit dhe si mbështetje për urat dentare. Falë qëndrueshmërisë, zgjidhet shpesh për dhëmbët e pasmë, për ura më të gjata dhe kur kërkohet forcë e lartë me kosto më të ulët.',
        'Disavantazhi kryesor është estetik. Metali nuk e lejon dritën të kalojë si te një dhëmb natyral, prandaj kurora mund të duket pak më pak e gjallë se një kurorë tërësisht qeramike. Gjithashtu, nëse mishrat tërhiqen me kalimin e kohës, mund të shfaqet një vijë e hirtë në buzë të kurorës. Te dhëmbët e përparmë, prandaj, shpesh preferohet zirkoni.',
        'Procedura zakonisht kërkon dy ose më shumë vizita dhe bëhet me anestezi lokale. Shpesh, fillimisht provohet skeleti metalik për të kontrolluar përshtatjen para se të shtohet qeramika. Pas vendosjes, është normale të ndjeni ndjeshmëri të lehtë për disa ditë. Kurora kujdeset si një dhëmb natyral: larje e rregullt, pastrim ndërmjet dhëmbëve dhe kontrolle periodike. Shmangni kafshimin e objekteve shumë të forta, si akulli, pasi qeramika mund të ciflohet; nëse i shtrëngoni dhëmbët natën, mjeku mund t’ju rekomandojë një mbrojtëse gojore për natën. Me kujdes të mirë, këto kurora mund të zgjasin shumë vite.',
      ],
      steps: [
        { title: 'Konsulta dhe radiografia', text: 'Ekzaminojmë dhëmbin, bëjmë radiografi dhe diskutojmë nëse kurora metal-qeramike i përshtatet dhëmbit dhe dëshirave tuaja.' },
        { title: 'Përgatitja e dhëmbit', text: 'Nën anestezi lokale, dhëmbi hollohet për të krijuar vend për metalin dhe qeramikën.' },
        { title: 'Masa dhe kurora provizore', text: 'Marrim masën ose skanimin dixhital, zgjedhim ngjyrën dhe vendosim një kurorë të përkohshme.' },
        { title: 'Provimi i skeletit', text: 'Kur nevojitet, provojmë skeletin metalik për t’u siguruar që përshtatet saktë para se të shtohet qeramika.' },
        { title: 'Vendosja përfundimtare', text: 'Provojmë kurorën e përfunduar, rregullojmë kafshimin dhe e çimentojmë përfundimisht.' },
        { title: 'Kujdesi pas trajtimit', text: 'Ju shpjegojmë kujdesin në shtëpi, caktojmë kontrollet dhe, nëse i shtrëngoni dhëmbët, ju këshillojmë për një mbrojtëse gojore për natën.' },
      ],
      faq: [
        { q: 'Pse të zgjedh kurorë metal-qeramike?', a: 'Është një zgjidhje e fortë, e provuar prej shumë vitesh dhe zakonisht më ekonomike se zirkoni. Përshtatet veçanërisht mirë për dhëmbët e pasmë dhe për ura.' },
        { q: 'A do të duket metali?', a: 'Metali mbulohet plotësisht nga qeramika me ngjyrë dhëmbi. Me kalimin e kohës, nëse mishrat tërhiqen, mund të duket një vijë e hirtë në kufi me mishrat.' },
        { q: 'A është e përshtatshme për dhëmbët e përparmë?', a: 'Mund të përdoret, por te dhëmbët e përparmë vija e hirtë që mund të shfaqet kur mishrat tërhiqen bie më shumë në sy. Për dhëmbët e dukshëm, kurora e zirkonit pa metal shpesh është zgjedhje më e mirë estetike.' },
        { q: 'Sa zgjat një kurorë metal-qeramike?', a: 'Me higjienë të mirë dhe kontrolle të rregullta, kurorat metal-qeramike zakonisht zgjasin shumë vite. Jetëgjatësia varet nga kafshimi, zakonet si shtrëngimi i dhëmbëve dhe shëndeti i mishrave e i dhëmbit poshtë kurorës.' },
        { q: 'A mund të kem alergji ndaj metalit?', a: 'Reaksionet alergjike janë të rralla, por nëse keni ndjeshmëri të njohur ndaj metaleve, na e thoni. Në atë rast, një kurorë zirkoni pa metal mund të jetë zgjidhje më e mirë.' },
        { q: 'Si kujdesem për kurorën?', a: 'Lani dhëmbët dy herë në ditë, pastroni mes dhëmbëve dhe vini në kontrolle të rregullta. Shmangni kafshimin e objekteve shumë të forta, që të mos ciflohet qeramika.' },
      ],
      seoDescription: 'Kurora metal-qeramike në Prishtinë: zgjidhje e provuar, e fortë dhe ekonomike për dhëmbët e pasmë dhe urat dentare.',
    },
    en: {
      intro:
        'Metal-ceramic crowns have a metal base covered with tooth-coloured ceramic. They are a long-established, durable and usually more economical option.',
      body: [
        'In this type of crown, a thin metal framework provides strength, while the ceramic layer on top gives it the appearance of a natural tooth. It is used to restore teeth that are cracked, worn or broken, to replace large old fillings, to protect a tooth after root canal treatment and to support a dental bridge. Because it is so robust, it is widely chosen for back teeth, longer bridges and situations where high durability at a lower cost is the priority.',
        'The main drawback is aesthetic. Metal does not let light through the way a natural tooth does, so the crown can look slightly less lifelike than an all-ceramic one. In addition, if the gum recedes over time, a grey line may become visible at the edge of the crown. For front teeth, zirconia is therefore often preferred.',
        'The procedure usually takes two or more visits and is carried out under local anaesthetic. Often the metal framework is tried in first to check the fit before the ceramic is added. Mild sensitivity for a few days after fitting is normal. Care is the same as for a natural tooth: regular brushing, cleaning between the teeth and periodic check-ups. Avoid biting on very hard objects such as ice, as the ceramic can chip, and if you grind your teeth at night your dentist may recommend a night guard. With good care, these crowns can last many years.',
      ],
      steps: [
        { title: 'Consultation and X-ray', text: 'We examine the tooth, take an X-ray and discuss whether a metal-ceramic crown suits the tooth and your wishes.' },
        { title: 'Tooth preparation', text: 'Under local anaesthetic, the tooth is reshaped to make room for the metal and ceramic layers.' },
        { title: 'Impression and temporary', text: 'We take an impression or digital scan, choose the shade and fit a temporary crown.' },
        { title: 'Framework try-in', text: 'When needed, we try in the metal framework to confirm an accurate fit before the ceramic is applied.' },
        { title: 'Final fitting', text: 'We try in the finished crown, adjust the bite and cement it permanently.' },
        { title: 'Aftercare', text: 'We explain home care, arrange check-ups and suggest a night guard if you grind your teeth.' },
      ],
      faq: [
        { q: 'Why choose a metal-ceramic crown?', a: 'It is a strong option that has been proven over many years and is usually more economical than zirconia. It is particularly well suited to back teeth and bridges.' },
        { q: 'Will the metal show?', a: 'The metal is fully covered by tooth-coloured ceramic. Over time, if the gum recedes, a grey line may become visible at the gum margin.' },
        { q: 'Is a metal-ceramic crown suitable for front teeth?', a: 'It can be used, but on front teeth the grey edge that may appear if the gum recedes is more noticeable. For visible teeth, a metal-free zirconia crown is often the better aesthetic choice.' },
        { q: 'How long does a metal-ceramic crown last?', a: 'With good hygiene and regular check-ups, metal-ceramic crowns usually last many years. How long depends on your bite, habits such as grinding and the health of the gum and tooth underneath.' },
        { q: 'Could I be allergic to the metal?', a: 'Allergic reactions are rare, but please tell us if you have a known sensitivity to metals. In that case, a metal-free zirconia crown may be a better choice.' },
        { q: 'How do I look after my crown?', a: 'Brush twice a day, clean between your teeth and attend regular check-ups. Avoid biting on very hard objects so that the ceramic does not chip.' },
      ],
      seoDescription: 'Metal-ceramic crowns in Prishtina: a proven, strong and economical option for back teeth and dental bridges.',
    },
    de: {
      intro:
        'Metallkeramikkronen bestehen aus einem Metallgerüst mit zahnfarbener Keramikverblendung. Sie sind seit Langem bewährt, belastbar und meist die günstigere Lösung.',
      body: [
        'Bei dieser Krone sorgt ein dünnes Metallgerüst für Stabilität, während die Keramikschicht darüber das Aussehen eines natürlichen Zahns vermittelt. Sie dient dazu, gesprungene, abgenutzte oder abgebrochene Zähne wiederherzustellen, große alte Füllungen zu ersetzen, einen wurzelbehandelten Zahn zu schützen und eine Brücke zu tragen. Wegen ihrer Belastbarkeit wird sie häufig für Seitenzähne, längere Brücken und Situationen gewählt, in denen hohe Stabilität bei geringeren Kosten im Vordergrund steht.',
        'Der wichtigste Nachteil ist ästhetischer Natur. Metall lässt das Licht nicht so durch wie ein natürlicher Zahn, daher kann die Krone etwas weniger lebendig wirken als eine Vollkeramikkrone. Geht das Zahnfleisch mit der Zeit zurück, kann zudem am Kronenrand ein grauer Streifen sichtbar werden. Im Frontzahnbereich wird deshalb oft Zirkon bevorzugt.',
        'Die Behandlung umfasst in der Regel zwei oder mehr Termine und erfolgt unter örtlicher Betäubung. Häufig wird zunächst das Metallgerüst einprobiert, um die Passform zu prüfen, bevor die Keramik aufgebracht wird. Eine leichte Empfindlichkeit in den ersten Tagen nach dem Einsetzen ist normal. Die Pflege entspricht der eines natürlichen Zahns: regelmäßiges Putzen, Reinigung der Zahnzwischenräume und Kontrolltermine. Vermeiden Sie das Kauen auf sehr harten Gegenständen wie Eis, da die Keramik abplatzen kann; wenn Sie nachts mit den Zähnen knirschen, kann Ihr Zahnarzt eine Aufbissschiene empfehlen. Bei guter Pflege halten diese Kronen viele Jahre.',
      ],
      steps: [
        { title: 'Beratung und Röntgen', text: 'Wir untersuchen den Zahn, fertigen ein Röntgenbild an und besprechen, ob eine Metallkeramikkrone zu Ihrem Zahn und Ihren Wünschen passt.' },
        { title: 'Präparation des Zahns', text: 'Unter örtlicher Betäubung wird der Zahn beschliffen, um Platz für Metall und Keramik zu schaffen.' },
        { title: 'Abformung und Provisorium', text: 'Wir nehmen eine Abformung oder einen digitalen Scan, bestimmen die Farbe und setzen ein Provisorium ein.' },
        { title: 'Gerüsteinprobe', text: 'Bei Bedarf probieren wir das Metallgerüst ein, um vor dem Aufbringen der Keramik eine genaue Passform zu sichern.' },
        { title: 'Endgültiges Einsetzen', text: 'Wir probieren die fertige Krone ein, passen den Biss an und befestigen sie dauerhaft.' },
        { title: 'Nachsorge', text: 'Wir erklären die Pflege zu Hause, planen Kontrollen und empfehlen bei Zähneknirschen eine Aufbissschiene.' },
      ],
      faq: [
        { q: 'Warum eine Metallkeramikkrone wählen?', a: 'Sie ist eine stabile, seit vielen Jahren bewährte Lösung und meist günstiger als Zirkon. Besonders gut eignet sie sich für Seitenzähne und Brücken.' },
        { q: 'Ist das Metall sichtbar?', a: 'Das Metall ist vollständig von zahnfarbener Keramik bedeckt. Geht das Zahnfleisch mit der Zeit zurück, kann am Zahnfleischrand ein grauer Streifen sichtbar werden.' },
        { q: 'Eignet sich eine Metallkeramikkrone für Frontzähne?', a: 'Sie ist möglich, doch im Frontzahnbereich fällt ein grauer Rand, der bei Zahnfleischrückgang entstehen kann, stärker auf. Für sichtbare Zähne ist eine metallfreie Zirkonkrone oft die ästhetisch bessere Wahl.' },
        { q: 'Wie lange hält eine Metallkeramikkrone?', a: 'Bei guter Mundhygiene und regelmäßigen Kontrollen halten Metallkeramikkronen in der Regel viele Jahre. Die Haltbarkeit hängt von Ihrem Biss, Gewohnheiten wie Zähneknirschen und der Gesundheit von Zahnfleisch und Zahn unter der Krone ab.' },
        { q: 'Kann ich allergisch auf das Metall reagieren?', a: 'Allergische Reaktionen sind selten, aber bitte informieren Sie uns über eine bekannte Metallempfindlichkeit. In diesem Fall kann eine metallfreie Zirkonkrone die bessere Wahl sein.' },
        { q: 'Wie pflege ich meine Krone?', a: 'Putzen Sie zweimal täglich, reinigen Sie die Zahnzwischenräume und nehmen Sie regelmäßige Kontrollen wahr. Vermeiden Sie das Kauen auf sehr harten Gegenständen, damit die Keramik nicht abplatzt.' },
      ],
      seoDescription: 'Metallkeramikkronen in Prishtina: eine bewährte, stabile und günstige Lösung für Seitenzähne und Zahnbrücken.',
    },
  },
};

export default content;
