import type { TreatmentContent } from './types';

const content: Record<string, TreatmentContent> = {
  orthodontics: {
    sq: {
      intro:
        'Ortodoncia korrigjon dhëmbët e shtrembër, hapësirat, mbipopullimin dhe problemet e kafshimit, për një buzëqeshje më të rregullt dhe një kafshim që funksionon mirë.',
      body: [
        'Dhëmbët e shtrembër, hapësirat mes dhëmbëve ose një kafshim i parregullt nuk janë vetëm çështje estetike. Ato mund ta vështirësojnë pastrimin, të shkaktojnë konsumim të pabarabartë dhe ndonjëherë tension në nofull. Trajtimi ortodontik u përshtatet fëmijëve, adoleshentëve dhe të rriturve, sepse dhëmbët mund të lëvizin në çdo moshë kur mishrat dhe kocka janë të shëndetshme. Dy mundësitë kryesore janë mbajtëset transparente Invisalign dhe aparatet fikse me braketa; dentisti juaj do t’ju ndihmojë të zgjidhni sipas rastit dhe mënyrës suaj të jetesës.',
        'Kohëzgjatja varet nga kompleksiteti i rastit dhe zakonisht shkon nga disa muaj deri në rreth dy vjet. Në ditët e para pas fillimit ose pas një rregullimi mund të ndjeni presion të lehtë, i cili zakonisht kalon shpejt. Gjatë trajtimit higjiena e kujdesshme dhe kontrollet e rregullta janë të rëndësishme. Pas përfundimit, mbajtëset e retencionit (retainer) ndihmojnë që dhëmbët të mos kthehen në pozicionin e vjetër, prandaj rezultati varet shumë edhe nga përdorimi i tyre.',
      ],
      steps: [
        { title: 'Konsultë dhe ekzaminim', text: 'Kontrollojmë dhëmbët, kafshimin dhe mishrat dhe dëgjojmë çfarë dëshironi të ndryshoni.' },
        { title: 'Skanim dhe radiografi', text: 'Me skanim digjital dhe radiografi marrim një pamje të plotë të dhëmbëve dhe nofullave.' },
        { title: 'Plani i trajtimit', text: 'Shpjegojmë opsionet, kohëzgjatjen e pritshme dhe ju ndihmojmë të zgjidhni mes mbajtëseve transparente dhe aparatit fiks.' },
        { title: 'Fillimi i trajtimit', text: 'Vendosen aparatet ose merrni setin e parë të mbajtëseve, së bashku me udhëzime për kujdesin e përditshëm.' },
        { title: 'Kontrolle të rregullta', text: 'Në vizita periodike ndjekim lëvizjen e dhëmbëve dhe bëjmë rregullimet e nevojshme.' },
        { title: 'Retencioni', text: 'Pas përfundimit merrni mbajtëse retencioni që e ruajnë pozicionin e ri të dhëmbëve.' },
      ],
      faq: [
        { q: 'A jam shumë i vjetër për ortodonci?', a: 'Zakonisht jo. Dhëmbët mund të lëvizin edhe tek të rriturit, për sa kohë që mishrat dhe kocka mbështetëse janë të shëndetshme.' },
        { q: 'Kur duhet të bëjë fëmija kontrollin e parë ortodontik?', a: 'Shpesh rekomandohet një kontroll rreth moshës 7 vjeç, kur disa probleme të kafshimit mund të vërehen herët. Kjo nuk do të thotë se trajtimi fillon menjëherë.' },
        { q: 'Si të zgjedh mes Invisalign dhe aparatit fiks?', a: 'Invisalign është më diskret dhe hiqet për të ngrënë, por kërkon disiplinë. Aparatet fikse punojnë vazhdimisht dhe shpesh u përshtaten më mirë rasteve më komplekse; dentisti do t’ju këshillojë sipas rastit tuaj.' },
        { q: 'A dhemb trajtimi ortodontik?', a: 'Zakonisht ndihet presion ose ndjeshmëri e lehtë për disa ditë pas fillimit ose pas rregullimeve. Kjo zakonisht qetësohet vetë ose me një qetësues të zakonshëm.' },
      ],
      seoDescription:
        'Ortodonci në Prishtinë për fëmijë, adoleshentë dhe të rritur: Invisalign ose aparate fikse për dhëmbë të shtrembër, hapësira dhe probleme kafshimi.',
    },
    en: {
      intro:
        'Orthodontics corrects crooked teeth, gaps, crowding and bite problems, giving you a more even smile and a bite that works comfortably.',
      body: [
        'Crooked or crowded teeth, gaps and an uneven bite are not only a cosmetic concern. They can make cleaning harder, cause uneven wear and sometimes put strain on the jaw. Orthodontic treatment suits children, teenagers and adults alike, because teeth can move at any age as long as the gums and bone are healthy. The two main options are Invisalign clear aligners and fixed braces with brackets; your dentist will help you choose based on your case and your lifestyle.',
        'Treatment time depends on how complex the case is and usually ranges from several months to around two years. You may feel mild pressure in the first days and after adjustments, which normally settles quickly. Careful oral hygiene and regular check-ups matter throughout. Once treatment ends, retainers keep your teeth from drifting back, so the long-term result depends a great deal on wearing them as advised.',
      ],
      steps: [
        { title: 'Consultation and examination', text: 'We check your teeth, bite and gums and listen to what you would like to change.' },
        { title: 'Scan and X-rays', text: 'A digital scan and X-rays give us a complete picture of your teeth and jaws.' },
        { title: 'Treatment plan', text: 'We explain your options and the expected timeline, and help you decide between clear aligners and fixed braces.' },
        { title: 'Starting treatment', text: 'Your braces are fitted or you receive your first aligners, along with clear instructions for daily care.' },
        { title: 'Regular check-ups', text: 'At periodic visits we follow how your teeth are moving and make any adjustments needed.' },
        { title: 'Retention', text: 'When treatment is complete, you receive retainers that hold your teeth in their new position.' },
      ],
      faq: [
        { q: 'Am I too old for orthodontic treatment?', a: 'Usually not. Teeth can be moved in adults too, provided the gums and supporting bone are healthy.' },
        { q: 'When should my child have a first orthodontic check?', a: 'A check at around age 7 is often recommended, as some bite problems can be spotted early. This does not mean treatment has to start straight away.' },
        { q: 'How do I choose between Invisalign and braces?', a: 'Invisalign is more discreet and comes out for eating, but it needs discipline. Fixed braces work all the time and are often better suited to more complex cases; your dentist will advise you on what fits your situation.' },
        { q: 'Does orthodontic treatment hurt?', a: 'Most people feel pressure or mild tenderness for a few days after starting and after adjustments. This usually eases on its own or with a standard over-the-counter painkiller.' },
      ],
      seoDescription:
        'Orthodontics in Prishtina for children, teens and adults: Invisalign or fixed braces for crooked teeth, gaps, crowding and bite problems.',
    },
    de: {
      intro:
        'Die Kieferorthopädie korrigiert schiefe Zähne, Lücken, Engstände und Bissfehler – für ein gleichmäßigeres Lächeln und einen Biss, der gut funktioniert.',
      body: [
        'Schiefe oder eng stehende Zähne, Lücken und ein unregelmäßiger Biss sind nicht nur eine Frage der Ästhetik. Sie können die Reinigung erschweren, zu ungleichmäßiger Abnutzung führen und mitunter den Kiefer belasten. Eine kieferorthopädische Behandlung eignet sich für Kinder, Jugendliche und Erwachsene, denn Zähne lassen sich in jedem Alter bewegen, sofern Zahnfleisch und Knochen gesund sind. Die zwei wichtigsten Möglichkeiten sind transparente Invisalign-Aligner und feste Zahnspangen mit Brackets; Ihr Zahnarzt hilft Ihnen, die passende Lösung für Ihren Fall und Ihren Alltag zu finden.',
        'Die Behandlungsdauer hängt vom Schweregrad ab und liegt in der Regel zwischen einigen Monaten und etwa zwei Jahren. In den ersten Tagen und nach Anpassungen spüren Sie möglicherweise einen leichten Druck, der meist rasch nachlässt. Während der gesamten Behandlung sind eine sorgfältige Mundhygiene und regelmäßige Kontrollen wichtig. Nach Abschluss verhindern Retainer, dass die Zähne in ihre alte Stellung zurückwandern – das langfristige Ergebnis hängt daher stark davon ab, dass Sie diese wie empfohlen tragen.',
      ],
      steps: [
        { title: 'Beratung und Untersuchung', text: 'Wir untersuchen Zähne, Biss und Zahnfleisch und besprechen, was Sie verändern möchten.' },
        { title: 'Scan und Röntgen', text: 'Ein digitaler Scan und Röntgenaufnahmen geben uns ein vollständiges Bild von Zähnen und Kiefer.' },
        { title: 'Behandlungsplan', text: 'Wir erläutern Ihre Möglichkeiten und die voraussichtliche Dauer und helfen Ihnen bei der Wahl zwischen Alignern und fester Zahnspange.' },
        { title: 'Behandlungsbeginn', text: 'Die Zahnspange wird eingesetzt oder Sie erhalten Ihre ersten Aligner, zusammen mit Hinweisen zur täglichen Pflege.' },
        { title: 'Regelmäßige Kontrollen', text: 'Bei regelmäßigen Terminen verfolgen wir die Zahnbewegung und nehmen nötige Anpassungen vor.' },
        { title: 'Retention', text: 'Nach Abschluss erhalten Sie Retainer, die die Zähne in ihrer neuen Position halten.' },
      ],
      faq: [
        { q: 'Bin ich für eine Zahnspange zu alt?', a: 'In der Regel nicht. Auch bei Erwachsenen lassen sich Zähne bewegen, sofern Zahnfleisch und Kieferknochen gesund sind.' },
        { q: 'Wann sollte mein Kind zum ersten Mal kieferorthopädisch untersucht werden?', a: 'Häufig wird eine Untersuchung im Alter von etwa 7 Jahren empfohlen, da manche Bissprobleme früh erkennbar sind. Das bedeutet nicht, dass die Behandlung sofort beginnen muss.' },
        { q: 'Wie entscheide ich mich zwischen Invisalign und fester Zahnspange?', a: 'Invisalign ist unauffälliger und wird zum Essen herausgenommen, erfordert aber Disziplin. Feste Zahnspangen wirken rund um die Uhr und eignen sich oft besser für komplexere Fälle; Ihr Zahnarzt berät Sie, was zu Ihrer Situation passt.' },
        { q: 'Ist die Behandlung schmerzhaft?', a: 'Die meisten Patienten spüren nach dem Einsetzen und nach Anpassungen einige Tage lang Druck oder eine leichte Empfindlichkeit. Das lässt meist von selbst oder mit einem gängigen Schmerzmittel nach.' },
      ],
      seoDescription:
        'Kieferorthopädie in Prishtina für Kinder, Jugendliche und Erwachsene: Invisalign oder feste Zahnspangen bei schiefen Zähnen, Lücken und Bissfehlern.',
    },
  },

  invisalign: {
    sq: {
      intro:
        'Invisalign i drejton dhëmbët me një seri mbajtëse transparente të punuara për ju, që mezi duken dhe hiqen kur hani ose lani dhëmbët.',
      body: [
        'Invisalign përdor mbajtëse të holla plastike, transparente, të bëra sipas skanimit digjital të dhëmbëve tuaj. Çdo set i lëviz dhëmbët pak nga pak drejt pozicionit të planifikuar. Kjo metodë u përshtatet shumë të rriturve dhe adoleshentëve me dhëmbë të shtrembër, hapësira, mbipopullim të lehtë deri mesatar, disa probleme kafshimi si kafshimi i thellë, i kundërt, i kryqëzuar ose i hapur, si dhe me dhëmbë që janë zhvendosur sërish pas një aparati të mëparshëm. Mishrat dhe kocka mbështetëse duhet të jenë të shëndetshme. Rastet shumë komplekse ose mospërputhjet e theksuara të nofullave mund të trajtohen më mirë me aparat fiks ose me një qasje të kombinuar; dentisti do të vlerësojë çfarë ju përshtatet.',
        'Mbajtëset duhet të mbahen rreth 20–22 orë në ditë dhe zakonisht ndërrohen çdo një deri në dy javë. Hiqen vetëm për të ngrënë, për të pirë diçka tjetër përveç ujit dhe për të larë dhëmbët. Me një set të ri mund të ndjeni presion të lehtë për një ose dy ditë. Trajtimi zakonisht zgjat nga disa muaj deri në rreth një vit e gjysmë, me kontrolle periodike. Në fund, mbajtëset e retencionit e ruajnë rezultatin.',
        'Shumë pacientë e vlerësojnë që mbajtëset janë të lëmuara, pa braketa apo tela që gërvishtin faqet ose që mund të shkëputen, dhe që ngrënia e pastrimi mbeten të thjeshta. Plani digjital ju lejon gjithashtu ta shihni rezultatin e pritshëm para se të filloni. Nga ana tjetër, kjo kërkon përgjegjësi: mbajtëset funksionojnë vetëm kur janë në gojë, prandaj ju duhet disiplinë, dhe ato duhen trajtuar me kujdes. Kur i hiqni, mbajini gjithmonë në kutinë e tyre, sepse humbja ose dëmtimi i tyre mund ta vonojë trajtimin.',
      ],
      steps: [
        { title: 'Konsultë', text: 'Ekzaminojmë dhëmbët dhe kafshimin dhe vlerësojmë nëse Invisalign është i përshtatshëm për ju.' },
        { title: 'Skanim digjital', text: 'Në vend të masave tradicionale, bëjmë një skanim digjital të saktë të dhëmbëve.' },
        { title: 'Plani dhe simulimi', text: 'Përgatisim planin e trajtimit dhe ju tregojmë një simulim të lëvizjes së dhëmbëve dhe të rezultatit të pritshëm.' },
        { title: 'Mbajtëset e para', text: 'Merrni setin e parë dhe udhëzime për vendosjen, heqjen dhe pastrimin e tyre.' },
        { title: 'Ndërrimi dhe kontrollet', text: 'Ndërroni setin çdo një deri në dy javë, ndërsa në kontrolle ndjekim përparimin.' },
        { title: 'Retencioni', text: 'Pas setit të fundit merrni mbajtëse retencioni për ta ruajtur pozicionin e ri.' },
      ],
      faq: [
        { q: 'A duken mbajtëset kur flas ose buzëqesh?', a: 'Ato janë transparente dhe në shumicën e rasteve vështirë se vërehen nga të tjerët. Në disa raste ngjiten atashmente të vogla me ngjyrën e dhëmbit për t’i ndihmuar lëvizjet.' },
        { q: 'Çfarë ndodh nëse nuk i mbaj mjaftueshëm?', a: 'Dhëmbët lëvizin më ngadalë se sa është planifikuar dhe setet e ardhshme mund të mos përshtaten mirë. Kjo mund ta zgjasë trajtimin, prandaj rekomandohen rreth 20–22 orë në ditë.' },
        { q: 'A mund të ha dhe pi normalisht?', a: 'Po, sepse mbajtëset i hiqni gjatë ngrënies. Para se t’i vendosni përsëri, lani dhëmbët, dhe me mbajtëset në gojë pini vetëm ujë.' },
        { q: 'Si i pastroj mbajtëset?', a: 'Shpëlajini me ujë të vakët dhe pastrojini butësisht me furçë të butë. Shmangni ujin e nxehtë, sepse mund t’i deformojë.' },
        { q: 'A dhemb Invisalign?', a: 'Shumica e njerëzve ndiejnë presion ose shtrëngim për një ose dy ditë kur kalojnë te një set i ri, që tregon se dhëmbët po lëvizin. Zakonisht kalon shpejt dhe rrallë nevojitet më shumë se një qetësues i zakonshëm.' },
        { q: 'Dhëmbët m’u zhvendosën pas aparatit të mëparshëm. A mund të ndihmojë Invisalign?', a: 'Shpesh po, nëse zhvendosja është e lehtë deri mesatare dhe mishrat janë të shëndetshëm. Dentisti do të vlerësojë nëse mjaftojnë vetëm mbajtëset, ndërsa pas trajtimit mbajtësja e retencionit ndihmon që kjo të mos përsëritet.' },
      ],
      seoDescription:
        'Invisalign në Prishtinë: mbajtëse transparente, pothuajse të padukshme, me skanim digjital dhe plan trajtimi të personalizuar për dhëmbë më të drejtë.',
    },
    en: {
      intro:
        'Invisalign straightens teeth with a series of custom clear aligners that are barely noticeable and come out when you eat or brush.',
      body: [
        'Invisalign uses thin, clear plastic aligners made from a digital scan of your teeth. Each set moves your teeth a small step towards the planned position. It suits many adults and teenagers with crooked teeth, gaps, mild to moderate crowding, certain bite problems such as an overbite, underbite, crossbite or open bite, and teeth that have shifted again after earlier braces. Your gums and supporting bone need to be healthy first. Very complex cases or marked jaw discrepancies may be better treated with fixed braces or a combined approach, and your dentist will assess what fits you.',
        'Aligners need to be worn for around 20–22 hours a day and are usually changed every one to two weeks. You take them out only to eat, to drink anything other than water and to clean your teeth. A new set may feel tight for a day or two. Treatment usually takes from several months to around eighteen months, with periodic check-ups along the way. At the end, retainers help to keep the result.',
        'Many patients appreciate that the aligners are smooth, with no brackets or wires to rub the cheeks or come loose, and that eating and cleaning stay simple. The digital plan also lets you see the expected result before you begin. The other side is responsibility: aligners only work while they are in your mouth, so discipline is essential, and they need careful handling. Keep them in their case whenever they are out, as lost or damaged aligners can delay treatment.',
      ],
      steps: [
        { title: 'Consultation', text: 'We examine your teeth and bite and assess whether Invisalign is a good fit for you.' },
        { title: 'Digital scan', text: 'Instead of traditional impressions, we take a precise digital scan of your teeth.' },
        { title: 'Plan and simulation', text: 'We prepare your treatment plan and show you a simulation of how your teeth are expected to move and the likely result.' },
        { title: 'First aligners', text: 'You receive your first set with instructions on putting them in, taking them out and keeping them clean.' },
        { title: 'Changes and check-ups', text: 'You switch to a new set every one to two weeks, and we review your progress at check-ups.' },
        { title: 'Retention', text: 'After your final set, you receive retainers to hold your teeth in their new position.' },
      ],
      faq: [
        { q: 'Will people notice the aligners?', a: 'They are clear and in most cases hard for others to spot. Some treatments use small tooth-coloured attachments bonded to certain teeth to help with specific movements.' },
        { q: 'What if I do not wear them enough?', a: 'Your teeth will move more slowly than planned and later sets may not fit properly, which can lengthen treatment. That is why around 20–22 hours a day is recommended.' },
        { q: 'Can I eat and drink normally?', a: 'Yes, because you take the aligners out to eat. Brush your teeth before putting them back in, and drink only water while wearing them.' },
        { q: 'How do I clean my aligners?', a: 'Rinse them in lukewarm water and brush them gently with a soft toothbrush. Avoid hot water, as it can warp the plastic.' },
        { q: 'Does Invisalign hurt?', a: 'Most people feel pressure or tightness for a day or two when they switch to a new set, which shows the teeth are moving. It usually fades quickly and rarely needs more than an ordinary painkiller.' },
        { q: 'My teeth moved after earlier braces. Can Invisalign help?', a: 'Often yes, if the shift is mild to moderate and your gums are healthy. Your dentist will check whether aligners alone are enough, and afterwards a retainer helps stop it happening again.' },
      ],
      seoDescription:
        'Invisalign in Prishtina: clear, almost invisible aligners with a digital scan and a personalised treatment plan for straighter teeth.',
    },
    de: {
      intro:
        'Invisalign begradigt die Zähne mit einer Reihe individuell angefertigter, transparenter Aligner, die kaum auffallen und zum Essen und Zähneputzen herausgenommen werden.',
      body: [
        'Bei Invisalign kommen dünne, transparente Kunststoffschienen zum Einsatz, die auf Grundlage eines digitalen Scans Ihrer Zähne gefertigt werden. Jedes Schienenpaar bewegt die Zähne ein kleines Stück in Richtung der geplanten Position. Die Methode eignet sich für viele Erwachsene und Jugendliche mit schiefen Zähnen, Lücken, leichten bis mittleren Engständen, bestimmten Bissfehlern wie Überbiss, Unterbiss, Kreuzbiss oder offenem Biss sowie bei Zähnen, die sich nach einer früheren Zahnspange wieder verschoben haben. Voraussetzung sind gesundes Zahnfleisch und ein stabiler Kieferknochen. Sehr komplexe Fälle oder ausgeprägte Kieferfehlstellungen lassen sich oft besser mit einer festen Zahnspange oder einem kombinierten Vorgehen behandeln; Ihr Zahnarzt prüft, was für Sie passt.',
        'Die Aligner sollten etwa 20–22 Stunden täglich getragen werden und werden in der Regel alle ein bis zwei Wochen gewechselt. Sie nehmen sie nur zum Essen, zum Trinken von anderen Getränken als Wasser und zur Zahnpflege heraus. Ein neues Paar kann sich ein bis zwei Tage straff anfühlen. Die Behandlung dauert meist einige Monate bis etwa eineinhalb Jahre, mit regelmäßigen Kontrollen. Zum Abschluss helfen Retainer, das Ergebnis zu erhalten.',
        'Viele Patienten schätzen, dass die Aligner glatt sind, ohne Brackets oder Drähte, die an der Wange reiben oder sich lösen können, und dass Essen und Zahnpflege unkompliziert bleiben. Dank der digitalen Planung sehen Sie das voraussichtliche Ergebnis schon vor Beginn. Die Kehrseite ist die Eigenverantwortung: Die Aligner wirken nur, solange sie im Mund sind, daher ist Disziplin entscheidend, und sie wollen sorgfältig behandelt werden. Bewahren Sie sie immer in ihrer Box auf, wenn Sie sie herausnehmen, denn verlorene oder beschädigte Aligner können die Behandlung verzögern.',
      ],
      steps: [
        { title: 'Beratung', text: 'Wir untersuchen Zähne und Biss und prüfen, ob Invisalign für Sie infrage kommt.' },
        { title: 'Digitaler Scan', text: 'Statt herkömmlicher Abdrücke erstellen wir einen präzisen digitalen Scan Ihrer Zähne.' },
        { title: 'Plan und Simulation', text: 'Wir erstellen Ihren Behandlungsplan und zeigen Ihnen eine Simulation der geplanten Zahnbewegung und des voraussichtlichen Ergebnisses.' },
        { title: 'Erste Aligner', text: 'Sie erhalten Ihr erstes Schienenpaar mit Hinweisen zum Einsetzen, Herausnehmen und Reinigen.' },
        { title: 'Wechsel und Kontrollen', text: 'Alle ein bis zwei Wochen wechseln Sie zum nächsten Paar, bei Kontrollterminen verfolgen wir den Fortschritt.' },
        { title: 'Retention', text: 'Nach dem letzten Schienenpaar erhalten Sie Retainer, die die neue Zahnstellung sichern.' },
      ],
      faq: [
        { q: 'Sieht man die Aligner?', a: 'Sie sind transparent und für andere in den meisten Fällen kaum zu erkennen. Manchmal werden kleine zahnfarbene Attachments auf einzelne Zähne geklebt, um bestimmte Bewegungen zu unterstützen.' },
        { q: 'Was passiert, wenn ich sie nicht lange genug trage?', a: 'Die Zähne bewegen sich langsamer als geplant und die folgenden Schienen passen womöglich nicht richtig, was die Behandlung verlängern kann. Deshalb werden etwa 20–22 Stunden täglich empfohlen.' },
        { q: 'Kann ich normal essen und trinken?', a: 'Ja, denn die Aligner werden zum Essen herausgenommen. Putzen Sie vor dem Wiedereinsetzen die Zähne und trinken Sie mit Alignern nur Wasser.' },
        { q: 'Wie reinige ich die Aligner?', a: 'Spülen Sie sie mit lauwarmem Wasser ab und reinigen Sie sie vorsichtig mit einer weichen Zahnbürste. Vermeiden Sie heißes Wasser, da es den Kunststoff verformen kann.' },
        { q: 'Tut Invisalign weh?', a: 'Die meisten Patienten spüren beim Wechsel auf ein neues Schienenpaar ein bis zwei Tage Druck oder ein Spannungsgefühl – ein Zeichen, dass sich die Zähne bewegen. Das lässt meist rasch nach und erfordert selten mehr als ein gängiges Schmerzmittel.' },
        { q: 'Meine Zähne haben sich nach einer früheren Zahnspange wieder verschoben. Kann Invisalign helfen?', a: 'Oft ja, wenn die Verschiebung leicht bis mittelgradig und das Zahnfleisch gesund ist. Ihr Zahnarzt prüft, ob Aligner allein ausreichen; danach hilft ein Retainer, einen erneuten Rückfall zu vermeiden.' },
      ],
      seoDescription:
        'Invisalign in Prishtina: transparente, nahezu unsichtbare Aligner mit digitalem Scan und individuellem Behandlungsplan für gerade Zähne.',
    },
  },

  braces: {
    sq: {
      intro:
        'Aparatet fikse përdorin braketa të ngjitura në dhëmbë dhe një tel që rregullohet gradualisht, një metodë e provuar edhe për rastet më komplekse.',
      body: [
        'Tek aparati fiks, braketa të vogla ngjiten në sipërfaqen e dhëmbëve dhe lidhen me një tel ortodontik. Duke e rregulluar telin në vizita të rregullta, dhëmbët lëvizin ngadalë në pozicionin e duhur. Braketat mund të jenë metalike ose qeramike me ngjyrën e dhëmbit, që duken më pak. Meqë aparati punon gjatë gjithë kohës dhe nuk varet nga mbajtja e tij, shpesh u përshtatet mirë rasteve më komplekse të kafshimit dhe mbipopullimit, si dhe fëmijëve, adoleshentëve dhe të rriturve.',
        'Trajtimi zakonisht zgjat nga një deri në dy vjet, varësisht nga rasti. Pas vendosjes dhe pas çdo rregullimi mund të ndjeni ndjeshmëri për disa ditë, ndërsa buzët dhe faqet mësohen shpejt me braketat. Pastrimi rreth braketave kërkon më shumë kujdes, me furça ndërdhëmbore dhe fill dentar. Ushqimet shumë të forta ose ngjitëse duhen shmangur, sepse mund t’i shkëputin braketat. Pas heqjes, mbajtëset e retencionit e ruajnë rezultatin.',
        'Aparati fiks punon me presion të butë e të vazhdueshëm. Teli mbahet në secilën braketë me një lidhëse të vogël elastike ose metalike, dhe ndërsa shtyn dhëmbët, kocka përreth riformohet ngadalë, duke i lejuar dhëmbët të lëvizin. Kur nevojitet, përdoren edhe ndihmesa si llastiqe mes dhëmbëve të sipërm e të poshtëm ose susta të vogla për lëvizje të caktuara. Braketat qeramike duken pak, por janë më të brishta se ato metalike, mund të krijojnë pak më shumë fërkim dhe lidhëset e tyre mund të njollosen nga kafeja, çaji ose duhani, prandaj kërkojnë më shumë kujdes.',
      ],
      steps: [
        { title: 'Konsultë dhe diagnozë', text: 'Me ekzaminim, radiografi dhe skanim vlerësojmë dhëmbët, kafshimin dhe nofullat.' },
        { title: 'Plani dhe zgjedhja', text: 'Shpjegojmë planin e trajtimit dhe bashkë zgjedhim mes braketave metalike dhe atyre qeramike.' },
        { title: 'Vendosja e aparatit', text: 'Braketat ngjiten në dhëmbë dhe lidhen me telin, një procedurë që nuk kërkon anestezi.' },
        { title: 'Rregullimet periodike', text: 'Zakonisht çdo 4–8 javë kontrollojmë përparimin dhe rregullojmë ose ndërrojmë telin.' },
        { title: 'Heqja e aparatit', text: 'Kur dhëmbët arrijnë pozicionin e planifikuar, braketat hiqen dhe dhëmbët pastrohen e lëmohen.' },
        { title: 'Retencioni', text: 'Merrni mbajtëse retencioni, fikse ose të lëvizshme, për ta ruajtur rezultatin.' },
      ],
      faq: [
        { q: 'A dhemb vendosja e aparatit?', a: 'Vendosja e braketave zakonisht nuk dhemb. Në ditët e para mund të ndjeni presion dhe ndjeshmëri, që zakonisht kalojnë vetë.' },
        { q: 'Cilat ushqime duhet t’i shmang?', a: 'Shmangni ushqimet shumë të forta, si arrat e plota ose akulli, dhe ato ngjitëse, si karamelet dhe çamçakëzi. Frutat e forta si molla është mirë t’i prisni në copa të vogla.' },
        { q: 'Metalike apo qeramike?', a: 'Braketat metalike janë shumë të qëndrueshme dhe praktike, ndërsa ato qeramike kanë ngjyrën e dhëmbit dhe duken më pak. Dentisti do t’ju këshillojë se cila përshtatet më mirë me rastin tuaj.' },
        { q: 'Si i pastroj dhëmbët me aparat?', a: 'Lani dhëmbët me kujdes pas çdo vakti, duke pastruar rreth secilës braketë; një furçë ortodontike ose elektrike e lehtëson këtë. Filli dentar me futës të veçantë ose pastruesi me ujë, si dhe furçat ndërdhëmbore, ndihmojnë të hiqen mbetjet nën tel, ndërsa dentisti mund t’ju rekomandojë edhe një shpëlarës goje me fluor.' },
        { q: 'Çfarë bëj nëse një braketë ose teli më gërvisht gojën?', a: 'Vendosni pak dyll ortodontik mbi vendin që të mbrohet faqja ose buza derisa të qetësohet; acarimi zakonisht kalon në javët e para. Nëse teli del jashtë ose një braketë shkëputet, kontaktoni klinikën që ta rregullojmë.' },
        { q: 'A mund të merrem me sport me aparat?', a: 'Po. Për sportet me kontakt ose aktivitetet ku goja mund të goditet, mbani një mbrojtëse goje të përshtatshme për aparatin fiks.' },
      ],
      seoDescription:
        'Aparate fikse në Prishtinë me braketa metalike ose qeramike, për drejtimin e dhëmbëve dhe korrigjimin e kafshimit edhe në rastet komplekse.',
    },
    en: {
      intro:
        'Fixed braces use brackets bonded to your teeth and a wire that is adjusted step by step, a well-proven method that also handles more complex cases.',
      body: [
        'With fixed braces, small brackets are bonded to the surface of your teeth and connected by an orthodontic wire. As the wire is adjusted at regular visits, your teeth move gradually into the right position. Brackets can be metal or tooth-coloured ceramic, which is less noticeable. Because braces work around the clock and do not depend on you remembering to wear them, they often suit more complex bite and crowding problems, as well as children, teenagers and adults.',
        'Treatment usually lasts from one to two years, depending on your case. After fitting and after each adjustment you may feel some tenderness for a few days, and your lips and cheeks soon get used to the brackets. Cleaning around the brackets takes extra care, with interdental brushes and floss. Very hard or sticky foods are best avoided, as they can loosen brackets. After removal, retainers help to keep the result.',
        'Braces work through gentle, steady pressure. The wire is held in each bracket by a small elastic or metal tie, and as it presses on the teeth the surrounding bone slowly remodels, allowing each tooth to move. Where needed, extras such as elastics between the upper and lower teeth or small springs guide particular movements. Ceramic brackets are discreet but more brittle than metal, can add a little friction, and their elastic ties may pick up stains from coffee, tea or smoking, so they call for careful habits.',
      ],
      steps: [
        { title: 'Consultation and diagnosis', text: 'An examination, X-rays and a scan let us assess your teeth, bite and jaws.' },
        { title: 'Plan and choice', text: 'We explain the treatment plan and choose together between metal and ceramic brackets.' },
        { title: 'Fitting the braces', text: 'The brackets are bonded to your teeth and linked with the wire, a procedure that does not need an injection.' },
        { title: 'Regular adjustments', text: 'Usually every 4–8 weeks we check progress and adjust or change the wire.' },
        { title: 'Removing the braces', text: 'Once your teeth reach the planned position, the brackets are removed and your teeth are cleaned and polished.' },
        { title: 'Retention', text: 'You receive a fixed or removable retainer to hold the result in place.' },
      ],
      faq: [
        { q: 'Does having braces fitted hurt?', a: 'Bonding the brackets is usually not painful. You may feel pressure and tenderness for the first few days, which generally settles on its own.' },
        { q: 'Which foods should I avoid?', a: 'Avoid very hard foods such as whole nuts or ice, and sticky ones such as toffee and chewing gum. Hard fruit like apples is best cut into small pieces.' },
        { q: 'Metal or ceramic brackets?', a: 'Metal brackets are very durable and practical, while ceramic brackets are tooth-coloured and less visible. Your dentist will advise which suits your case best.' },
        { q: 'How do I clean my teeth with braces?', a: 'Brush carefully after every meal, working around each bracket; an orthodontic or electric toothbrush makes this easier. A floss threader or water flosser and interdental brushes help clear food from under the wire, and your dentist may also suggest a fluoride mouthwash.' },
        { q: 'What if a bracket or wire rubs my mouth?', a: 'Press a little orthodontic wax over the spot to protect your cheek or lip while it settles; irritation usually eases within the first few weeks. If a wire pokes out or a bracket comes loose, contact the clinic so it can be put right.' },
        { q: 'Can I play sports with braces?', a: 'Yes. For contact sports or any activity where a blow to the mouth is possible, wear a mouthguard suitable for use with braces.' },
      ],
      seoDescription:
        'Fixed braces in Prishtina with metal or ceramic brackets, to straighten teeth and correct the bite, including more complex cases.',
    },
    de: {
      intro:
        'Feste Zahnspangen arbeiten mit Brackets, die auf die Zähne geklebt werden, und einem Draht, der schrittweise angepasst wird – eine bewährte Methode auch für komplexere Fälle.',
      body: [
        'Bei einer festen Zahnspange werden kleine Brackets auf die Zahnoberfläche geklebt und mit einem kieferorthopädischen Draht verbunden. Durch Anpassungen des Drahtes bei regelmäßigen Terminen bewegen sich die Zähne allmählich in die richtige Position. Die Brackets können aus Metall oder aus zahnfarbener Keramik sein, die weniger auffällt. Da die Spange rund um die Uhr wirkt und nicht vom Tragen abhängt, eignet sie sich oft gut für komplexere Biss- und Engstandsprobleme sowie für Kinder, Jugendliche und Erwachsene.',
        'Die Behandlung dauert je nach Fall meist ein bis zwei Jahre. Nach dem Einsetzen und nach jeder Anpassung können die Zähne einige Tage empfindlich sein; Lippen und Wangen gewöhnen sich rasch an die Brackets. Die Reinigung rund um die Brackets erfordert besondere Sorgfalt, mit Interdentalbürsten und Zahnseide. Sehr harte oder klebrige Speisen sollten Sie meiden, da sich Brackets lösen können. Nach dem Entfernen helfen Retainer, das Ergebnis zu erhalten.',
        'Eine feste Zahnspange wirkt durch sanften, gleichmäßigen Druck. Der Draht wird in jedem Bracket mit einer kleinen Gummi- oder Drahtligatur gehalten; während er auf die Zähne drückt, baut sich der umgebende Knochen langsam um, sodass sich jeder Zahn bewegen kann. Bei Bedarf unterstützen Hilfsmittel wie Gummizüge zwischen Ober- und Unterkiefer oder kleine Federn bestimmte Bewegungen. Keramikbrackets sind unauffällig, aber spröder als Metall, können etwas mehr Reibung verursachen, und ihre Gummiligaturen können sich durch Kaffee, Tee oder Rauchen verfärben – sie erfordern daher mehr Sorgfalt.',
      ],
      steps: [
        { title: 'Beratung und Diagnose', text: 'Mit Untersuchung, Röntgenaufnahmen und Scan beurteilen wir Zähne, Biss und Kiefer.' },
        { title: 'Plan und Auswahl', text: 'Wir erläutern den Behandlungsplan und wählen gemeinsam zwischen Metall- und Keramikbrackets.' },
        { title: 'Einsetzen der Spange', text: 'Die Brackets werden auf die Zähne geklebt und mit dem Draht verbunden – eine Betäubung ist dafür nicht nötig.' },
        { title: 'Regelmäßige Anpassungen', text: 'Meist alle 4–8 Wochen kontrollieren wir den Fortschritt und passen den Draht an oder wechseln ihn.' },
        { title: 'Entfernen der Spange', text: 'Haben die Zähne die geplante Position erreicht, werden die Brackets entfernt und die Zähne gereinigt und poliert.' },
        { title: 'Retention', text: 'Sie erhalten einen festen oder herausnehmbaren Retainer, der das Ergebnis sichert.' },
      ],
      faq: [
        { q: 'Tut das Einsetzen der Zahnspange weh?', a: 'Das Aufkleben der Brackets ist in der Regel nicht schmerzhaft. In den ersten Tagen können Druck und Empfindlichkeit auftreten, die meist von selbst abklingen.' },
        { q: 'Welche Lebensmittel sollte ich meiden?', a: 'Meiden Sie sehr harte Speisen wie ganze Nüsse oder Eiswürfel sowie klebrige wie Karamell und Kaugummi. Hartes Obst wie Äpfel schneiden Sie am besten in kleine Stücke.' },
        { q: 'Metall oder Keramik?', a: 'Metallbrackets sind sehr robust und praktisch, Keramikbrackets sind zahnfarben und weniger sichtbar. Ihr Zahnarzt berät Sie, was für Ihren Fall am besten geeignet ist.' },
        { q: 'Wie putze ich meine Zähne mit Zahnspange?', a: 'Putzen Sie nach jeder Mahlzeit sorgfältig rund um jedes Bracket; eine kieferorthopädische oder elektrische Zahnbürste erleichtert das. Zahnseide mit Einfädelhilfe oder eine Munddusche sowie Interdentalbürsten entfernen Speisereste unter dem Draht, und Ihr Zahnarzt empfiehlt eventuell zusätzlich eine Fluorid-Mundspülung.' },
        { q: 'Was tun, wenn ein Bracket oder Draht scheuert?', a: 'Drücken Sie etwas kieferorthopädisches Wachs auf die Stelle, damit Wange oder Lippe zur Ruhe kommen; die Reizung lässt meist in den ersten Wochen nach. Steht ein Draht ab oder löst sich ein Bracket, melden Sie sich bitte in der Praxis, damit es behoben werden kann.' },
        { q: 'Kann ich mit Zahnspange Sport treiben?', a: 'Ja. Bei Kontaktsportarten oder wenn ein Schlag auf den Mund möglich ist, sollten Sie einen für Zahnspangen geeigneten Mundschutz tragen.' },
      ],
      seoDescription:
        'Feste Zahnspangen in Prishtina mit Metall- oder Keramikbrackets – zum Begradigen der Zähne und Korrigieren des Bisses, auch bei komplexen Fällen.',
    },
  },
};

export default content;
