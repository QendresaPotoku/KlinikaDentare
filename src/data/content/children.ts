import type { TreatmentContent } from './types';

const content: Record<string, TreatmentContent> = {
  children: {
    sq: {
      intro: 'Dentistria për fëmijë kujdeset për dhëmbët e fëmijës suaj që nga dhëmbi i parë, me fokus te parandalimi, trajtimi i butë dhe krijimi i zakoneve të mira që herët. Çdo hap ua shpjegojmë juve dhe fëmijës para se të fillojmë.',
      body: [
        'Dhëmbët e qumështit janë më të rëndësishëm se sa mendojnë shumë prindër. Me ta fëmija përtyp ushqimin dhe mëson të flasë qartë, dhe secili prej tyre ruan hapësirën për dhëmbin e përhershëm që rritet poshtë tij. Nëse një dhëmb qumështi humbet para kohe nga kariesi, dhëmbët fqinjë mund të zhvendosen drejt hapësirës dhe dhëmbi i përhershëm mund të dalë i shtrembër. Vizita e parë zakonisht rekomandohet kur del dhëmbi i parë ose rreth ditëlindjes së parë, pastaj kontrolle afërsisht çdo gjashtë muaj, ose aq shpesh sa ju këshillon mjeku.',
        'Parandalimi është thelbi i punës sonë me fëmijët: larja e dhëmbëve dy herë në ditë me pastë me fluor, në sasinë që i përshtatet moshës, më pak pije dhe ushqime të ëmbla mes vakteve, aplikimi i fluorit në klinikë dhe mbyllja e fisurave (silantët), që mbrojnë brazdat e thella të dhëmbëve të pasmë. Kur gjendet karies, dhëmbi i qumështit zakonisht riparohet me mbushje. Nëse kariesi ka arritur te nervi, trajtimi i nervit shpesh mund ta ruajë dhëmbin derisa të bjerë vetë. Një dhëmb qumështi hiqet vetëm kur nuk mund të ruhet, për shembull për shkak të një infeksioni të madh ose thyerjeje, ose kur pengon daljen e dhëmbit të përhershëm.',
        'U japim fëmijëve kohë të mësohen me karrigen, dritën dhe instrumentet, dhe ritmin e përshtatim sipas secilit fëmijë. Çdo fëmijë reagon ndryshe, prandaj nuk nxitojmë dhe bisedojmë me ju se çfarë funksionon më mirë. Edhe ju mund të ndihmoni në shtëpi: flisni për vizitën me qetësi dhe thjeshtë, shmangni fjalë që e frikësojnë, si dhimbje ose gjilpërë, lexoni bashkë një libër për dentistin dhe zgjidhni një orë kur fëmija është i pushuar. Shpesh, qëndrimi juaj i qetë ndihmon më shumë se gjithçka.',
      ],
      steps: [
        { title: 'Njohja me klinikën', text: 'Fëmija njihet me ekipin dhe ulet në karrige me ritmin e vet, me ju pranë.' },
        { title: 'Kontrolli i butë', text: 'Mjeku kontrollon dhëmbët, mishrat dhe kafshimin, dhe bën radiografi vetëm kur nevojitet.' },
        { title: 'Parandalimi', text: 'Sipas moshës dhe rrezikut për karies, dhëmbët mund të pastrohen dhe të mbrohen me fluor ose me mbyllje fisurash.' },
        { title: 'Trajtimi', text: 'Nëse ka karies, fillimisht ju shpjegojmë mundësitë, pastaj e trajtojmë dhëmbin, me anestezi lokale kur nevojitet.' },
        { title: 'Këshilla për shtëpi', text: 'Merrni këshilla praktike për larjen e dhëmbëve, sasinë e pastës dhe ushqimin, sipas moshës së fëmijës.' },
        { title: 'Kontrollet e rregullta', text: 'Kontrollet, zakonisht rreth çdo gjashtë muaj, ndihmojnë që problemet të zbulohen herët, kur janë ende të vogla.' },
      ],
      faq: [
        { q: 'Kur duhet ta çoj fëmijën për herë të parë te dentisti?', a: 'Zakonisht kur del dhëmbi i parë ose rreth ditëlindjes së parë. Vizitat e para janë të shkurtra dhe kryesisht e ndihmojnë fëmijën të mësohet me dentistin, ndërsa ju merrni këshilla për kujdesin në shtëpi.' },
        { q: 'Pse të trajtohen dhëmbët e qumështit, kur gjithsesi bien?', a: 'Disa dhëmballë qumështi qëndrojnë në gojë deri rreth moshës 10 deri 12 vjeç. Kariesi i patrajtuar mund të shkaktojë dhimbje dhe infeksion, dhe mund të ndikojë te dhëmbi i përhershëm poshtë tij dhe te hapësira që i duhet.' },
        { q: 'Çfarë janë silantët (mbyllja e fisurave)?', a: 'Janë një shtresë e hollë mbrojtëse që vendoset në brazdat përtypëse të dhëmbëve të pasmë, ku mblidhen ushqimi dhe bakteret. Zakonisht vendosen në dhëmballët e përhershme pak pasi dalin, rreth moshës 6 dhe rreth 12 vjeç, pa shpim dhe pa injeksion. Në kontrollet e rregullta shohim nëse janë ende të plota.' },
        { q: 'A është i sigurt fluori për fëmijët?', a: 'I përdorur në sasinë e duhur, fluori konsiderohet i sigurt dhe është një nga mënyrat më efektive për të parandaluar kariesin. Te fëmijët e vegjël mjafton pastë me fluor sa një kokërr orizi, më vonë sa një bizele, sipas këshillës së mjekut; ndihmojeni fëmijën ta pështyjë pastën e mos ta gëlltisë.' },
        { q: 'Çfarë është trajtimi i nervit te dhëmbi i qumështit?', a: 'Kur kariesi arrin te nervi, mjeku, me anestezi lokale, heq indin e nervit të inflamuar ose të infektuar, pastron brendinë e dhëmbit, e mbush me një material të përshtatshëm për dhëmbët e qumështit dhe pastaj e rindërton dhëmbin. Kështu dhëmbi mund të qëndrojë në vend derisa të bjerë natyrshëm.' },
        { q: 'Po nëse fëmija ka shumë frikë?', a: 'Na tregoni paraprakisht. Ecim me ritmin e fëmijës dhe ndonjëherë një vizitë e shkurtër vetëm për t’u njohur është fillimi më i mirë. Nëse trajtimi nuk mund të bëhet me qetësi, mjeku bisedon me ju për mundësitë e tjera.' },
      ],
      seoDescription: 'Dentistri për fëmijë në Prishtinë: kontrolle të buta, fluor, silantë, mbushje dhe trajtim nervi për dhëmbët e qumështit, me këshilla praktike për prindërit.',
    },
    en: {
      intro: 'Children’s dentistry looks after your child’s teeth from the very first tooth, with a focus on prevention, gentle care and building good habits early. We explain each step to you and your child before we begin.',
      body: [
        'Baby teeth matter more than many parents think. Children use them to chew and to learn to speak clearly, and each one holds the space for the adult tooth growing underneath. If a baby tooth is lost too early to decay, neighbouring teeth can drift into the gap and the adult tooth may come through crooked. A first visit is usually recommended when the first tooth appears or by around the first birthday, followed by check-ups roughly every six months, or as often as your dentist advises.',
        'Prevention is at the heart of our work with children: brushing twice a day with fluoride toothpaste in an amount suited to your child’s age, fewer sugary drinks and snacks between meals, fluoride applied at the clinic, and fissure sealants that protect the deep grooves of the back teeth. When decay is found, a baby tooth can usually be repaired with a filling. If decay has reached the nerve, nerve treatment can often keep the tooth until it falls out naturally. A baby tooth is taken out only when it cannot be saved, for example because of a large infection or a break, or when it is blocking the adult tooth.',
        'We give children time to get used to the chair, the light and the instruments, and we adapt the pace to each child. Every child reacts differently, so we do not rush and we talk with you about what works best. You can help at home: talk about the visit calmly and simply, avoid words that may frighten, such as pain or needle, read a book about going to the dentist together, and choose a time of day when your child is rested. Your own calm attitude often helps most of all.',
      ],
      steps: [
        { title: 'Getting to know us', text: 'Your child meets the team and sits in the chair at their own pace, with you close by.' },
        { title: 'Gentle examination', text: 'The dentist checks the teeth, gums and bite, and takes an X-ray only when it is needed.' },
        { title: 'Prevention', text: 'Depending on age and decay risk, the teeth may be cleaned and protected with fluoride or fissure sealants.' },
        { title: 'Treatment', text: 'If there is decay, we first explain the options to you, then treat the tooth, with local anaesthetic where needed.' },
        { title: 'Advice for home', text: 'You receive practical tips on brushing, toothpaste amount and diet that suit your child’s age.' },
        { title: 'Regular check-ups', text: 'Check-ups, usually about every six months, help catch problems early, while they are still small.' },
      ],
      faq: [
        { q: 'When should my child first see a dentist?', a: 'Usually when the first tooth comes through or by around the first birthday. Early visits are short and mainly help your child get used to the dentist, while you receive advice on care at home.' },
        { q: 'Why treat baby teeth if they fall out anyway?', a: 'Some baby back teeth stay in the mouth until around the age of 10 to 12. Untreated decay can cause pain and infection, and may affect the adult tooth underneath and the space it needs.' },
        { q: 'What are fissure sealants?', a: 'A thin protective coating placed on the chewing grooves of the back teeth, where food and bacteria collect. They are usually applied to the permanent molars soon after they come through, around the age of 6 and again around 12, without drilling or injections. At check-ups we make sure they are still intact.' },
        { q: 'Is fluoride safe for children?', a: 'Used in the right amount, fluoride is considered safe and is one of the most effective ways to prevent decay. Young children need only a rice-grain smear of fluoride toothpaste, and later a pea-sized amount, as your dentist advises; help your child spit the toothpaste out rather than swallow it.' },
        { q: 'What is nerve treatment of a baby tooth?', a: 'When decay reaches the nerve, the dentist numbs the area, removes the inflamed or infected nerve tissue, cleans the inside of the tooth, fills it with a material suited to baby teeth and then rebuilds the tooth. This allows it to stay in place until it falls out naturally.' },
        { q: 'What if my child is very anxious?', a: 'Please let us know in advance. We follow your child’s pace, and sometimes a short first visit just to look around is the best start. If treatment cannot be done calmly, your dentist will talk with you about other options.' },
      ],
      seoDescription: 'Children’s dentistry in Prishtina: gentle check-ups, fluoride, fissure sealants, fillings and nerve treatment for baby teeth, with practical tips for parents.',
    },
    de: {
      intro: 'Die Kinderzahnheilkunde begleitet die Zähne Ihres Kindes vom ersten Zahn an, mit Schwerpunkt auf Vorsorge, behutsamer Behandlung und guten Gewohnheiten von Anfang an. Jeden Schritt erklären wir Ihnen und Ihrem Kind, bevor wir beginnen.',
      body: [
        'Milchzähne sind wichtiger, als viele Eltern denken. Mit ihnen kaut Ihr Kind und lernt, deutlich zu sprechen, und jeder Milchzahn hält den Platz für den bleibenden Zahn frei, der darunter heranwächst. Geht ein Milchzahn durch Karies zu früh verloren, können die Nachbarzähne in die Lücke wandern, und der bleibende Zahn bricht womöglich schief durch. Ein erster Besuch wird meist empfohlen, wenn der erste Zahn durchbricht, oder um den ersten Geburtstag, danach Kontrollen etwa alle sechs Monate oder so oft, wie Ihr Zahnarzt es empfiehlt.',
        'Vorsorge steht bei Kindern im Mittelpunkt: zweimal täglich Zähneputzen mit fluoridhaltiger Zahnpasta in altersgerechter Menge, weniger zuckerhaltige Getränke und Snacks zwischen den Mahlzeiten, Fluoridierung in der Praxis und Fissurenversiegelungen, die die tiefen Rillen der Backenzähne schützen. Wird Karies entdeckt, lässt sich ein Milchzahn meist mit einer Füllung versorgen. Hat die Karies den Nerv erreicht, kann eine Nervbehandlung den Zahn oft erhalten, bis er von selbst ausfällt. Ein Milchzahn wird nur entfernt, wenn er nicht zu retten ist, etwa bei einer ausgedehnten Entzündung oder einem Bruch, oder wenn er den Durchbruch des bleibenden Zahns behindert.',
        'Wir geben Kindern Zeit, sich an den Stuhl, das Licht und die Instrumente zu gewöhnen, und passen das Tempo jedem Kind an. Jedes Kind reagiert anders, deshalb drängen wir nicht und besprechen mit Ihnen, was am besten passt. Auch Sie können zu Hause helfen: Sprechen Sie ruhig und einfach über den Besuch, vermeiden Sie Wörter, die Angst machen, etwa Schmerz oder Spritze, lesen Sie gemeinsam ein Buch über den Zahnarztbesuch und wählen Sie eine Tageszeit, zu der Ihr Kind ausgeruht ist. Oft hilft Ihre eigene Gelassenheit am meisten.',
      ],
      steps: [
        { title: 'Kennenlernen', text: 'Ihr Kind lernt das Team kennen und setzt sich in seinem eigenen Tempo auf den Stuhl, während Sie dabei sind.' },
        { title: 'Sanfte Untersuchung', text: 'Der Zahnarzt prüft Zähne, Zahnfleisch und Biss und fertigt nur dann ein Röntgenbild an, wenn es nötig ist.' },
        { title: 'Vorsorge', text: 'Je nach Alter und Kariesrisiko werden die Zähne gereinigt und mit Fluorid oder einer Fissurenversiegelung geschützt.' },
        { title: 'Behandlung', text: 'Bei Karies erklären wir Ihnen zuerst die Möglichkeiten und behandeln den Zahn dann, bei Bedarf unter örtlicher Betäubung.' },
        { title: 'Tipps für zu Hause', text: 'Sie erhalten praktische Hinweise zum Putzen, zur Zahnpastamenge und zur Ernährung, passend zum Alter Ihres Kindes.' },
        { title: 'Regelmäßige Kontrollen', text: 'Kontrollen, meist etwa alle sechs Monate, helfen, Probleme früh zu erkennen, solange sie noch klein sind.' },
      ],
      faq: [
        { q: 'Wann sollte mein Kind zum ersten Mal zum Zahnarzt?', a: 'Meist, wenn der erste Zahn durchbricht, oder um den ersten Geburtstag. Die ersten Besuche sind kurz und helfen vor allem dabei, dass sich Ihr Kind an den Zahnarzt gewöhnt; Sie erhalten dabei Tipps für die Pflege zu Hause.' },
        { q: 'Warum Milchzähne behandeln, wenn sie ohnehin ausfallen?', a: 'Einige Milchbackenzähne bleiben bis etwa zum 10. bis 12. Lebensjahr im Mund. Unbehandelte Karies kann Schmerzen und Entzündungen verursachen und den bleibenden Zahn darunter sowie den Platz, den er braucht, beeinträchtigen.' },
        { q: 'Was ist eine Fissurenversiegelung?', a: 'Eine dünne Schutzschicht, die auf die Kaurillen der Backenzähne aufgetragen wird, wo sich Speisereste und Bakterien sammeln. Sie wird meist kurz nach dem Durchbruch der bleibenden Backenzähne aufgebracht, etwa mit 6 und mit 12 Jahren, ohne Bohren und ohne Spritze. Bei den Kontrollen prüfen wir, ob sie noch intakt ist.' },
        { q: 'Ist Fluorid für Kinder sicher?', a: 'In der richtigen Menge gilt Fluorid als sicher und gehört zu den wirksamsten Mitteln gegen Karies. Bei kleinen Kindern genügt eine reiskorngroße Menge fluoridhaltiger Zahnpasta, später eine erbsengroße, je nach Empfehlung Ihres Zahnarztes; helfen Sie Ihrem Kind, die Zahnpasta auszuspucken statt sie zu schlucken.' },
        { q: 'Was ist eine Nervbehandlung am Milchzahn?', a: 'Reicht die Karies bis zum Nerv, entfernt der Zahnarzt unter örtlicher Betäubung das entzündete oder infizierte Nervengewebe, reinigt das Zahninnere, füllt es mit einem für Milchzähne geeigneten Material und baut den Zahn wieder auf. So kann der Zahn erhalten bleiben, bis er natürlich ausfällt.' },
        { q: 'Was, wenn mein Kind große Angst hat?', a: 'Sagen Sie uns das bitte vorher. Wir richten uns nach dem Tempo Ihres Kindes, und manchmal ist ein kurzer erster Besuch nur zum Kennenlernen der beste Anfang. Lässt sich eine Behandlung nicht in Ruhe durchführen, bespricht der Zahnarzt mit Ihnen andere Möglichkeiten.' },
      ],
      seoDescription: 'Kinderzahnheilkunde in Prishtina: behutsame Kontrollen, Fluoridierung, Fissurenversiegelung, Füllungen und Nervbehandlung an Milchzähnen, mit Tipps für Eltern.',
    },
  },
};

export default content;
