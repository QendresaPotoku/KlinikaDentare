import type { TreatmentContent } from './types';

const content: Record<string, TreatmentContent> = {
  periodontology: {
    sq: {
      intro:
        'Mishrat e shëndetshëm janë themeli i buzëqeshjes dhe i çdo trajtimi tjetër dentar. Ne parandalojmë, diagnostikojmë dhe trajtojmë sëmundjet e mishrave dhe kryejmë procedura për të rregulluar formën e tyre.',
      body: [
        'Parodontologjia merret me mishrat dhe indet që i mbajnë dhëmbët në vend, përfshirë kockën. Sëmundja e mishrave zakonisht fillon si gingivit: mishra të skuqur, të fryrë ose që gjakosin gjatë larjes. Nëse nuk trajtohet, mund të kalojë në parodontit, ku dobësohet lidhja e dhëmbit me kockën dhe dhëmbët mund të lëvizin. Mishrat e shëndetshëm janë gjithashtu kusht për kurora, implante dhe ortodonci të qëndrueshme. Kur nevojitet më shumë dhëmb i zbuluar ose një vijë më e harmonishme e mishrave, zgjatja e kurorës ose gingivektomia me laser mund të jenë zgjidhja.',
        'Vizita e parë përfshin një kontroll të kujdesshëm të mishrave, matjen e xhepave rreth dhëmbëve dhe, sipas nevojës, radiografi. Gingiviti shpesh përmirësohet me një pastrim profesional dhe higjienë më të mirë në shtëpi. Parodontiti kërkon pastrim më të thellë nën mishra, zakonisht me anestezi lokale, dhe kontrolle të rregullta më pas. Sëmundja e mishrave në shumicën e rasteve mund të mbahet nën kontroll, por kërkon kujdes të vazhdueshëm; mjeku juaj do t’ju këshillojë sa shpesh të vini për mirëmbajtje.',
      ],
      steps: [
        { title: 'Kontrolli i mishrave', text: 'Ekzaminojmë mishrat, masim xhepat rreth dhëmbëve dhe bëjmë radiografi kur nevojitet.' },
        { title: 'Diagnoza dhe plani', text: 'Ju shpjegojmë gjendjen e mishrave dhe opsionet e trajtimit, hap pas hapi.' },
        { title: 'Pastrimi profesional', text: 'Largojmë gurëzat dhe pllakën mbi dhe nën vijën e mishrave.' },
        { title: 'Trajtimi i synuar', text: 'Kur nevojitet, kryejmë pastrim të thellë, zgjatje të kurorës ose rikonturim të mishrave me laser.' },
        { title: 'Kujdesi në shtëpi', text: 'Ju tregojmë si të pastroni dhëmbët dhe hapësirat mes tyre në mënyrë efektive.' },
        { title: 'Kontrollet e rregullta', text: 'Vizitat e mirëmbajtjes ndihmojnë që mishrat të mbeten të shëndetshëm me kalimin e kohës.' },
      ],
      faq: [
        {
          q: 'Pse më gjakosin mishrat kur laj dhëmbët?',
          a: 'Gjakosja është shpesh shenja e parë e gingivitit, e shkaktuar nga pllaka përgjatë vijës së mishrave. Nuk duhet injoruar; një kontroll dhe një pastrim profesional zakonisht e përmirësojnë gjendjen shpejt.',
        },
        {
          q: 'A dhemb trajtimi i mishrave?',
          a: 'Pastrimi i zakonshëm zakonisht shkakton vetëm pak ndjeshmëri. Për pastrimin e thellë dhe procedurat kirurgjikale përdorim anestezi lokale, kështu që gjatë trajtimit ndjeni kryesisht presion.',
        },
        {
          q: 'A mund të shërohet parodontiti?',
          a: 'Kocka e humbur zakonisht nuk rikthehet plotësisht, por sëmundja mund të ndalet dhe të mbahet nën kontroll me trajtim dhe kujdes të rregullt.',
        },
        {
          q: 'Si ta di cila procedurë më përshtatet?',
          a: 'Zgjatja e kurorës zbulon më shumë dhëmb, shpesh për një kurorë ose mbushje, ndërsa gingivektomia me laser rikonturon mishrat e tepërt. Pas ekzaminimit, mjeku juaj do t’ju këshillojë.',
        },
      ],
      seoDescription:
        'Parodontologji në Prishtinë: trajtimi i gingivitit dhe parodontitit, zgjatja e kurorës dhe gingivektomia me laser për mishra të shëndetshëm.',
    },
    en: {
      intro:
        'Healthy gums are the foundation of your smile and of every other dental treatment. We prevent, diagnose and treat gum disease, and carry out procedures to reshape the gum line where needed.',
      body: [
        'Periodontology looks after the gums and the tissues that hold the teeth in place, including the bone. Gum disease usually begins as gingivitis: red, swollen gums that bleed when you brush. Left untreated, it can progress to periodontitis, where the attachment between tooth and bone breaks down and teeth may loosen. Healthy gums are also essential for crowns, implants and orthodontics to last. When more tooth needs to be exposed, or the gum line needs reshaping, crown lengthening or laser gingivectomy may be the right option.',
        'Your first visit includes a careful gum check, measurement of the pockets around each tooth and, if needed, X-rays. Gingivitis often improves with a professional clean and better home care. Periodontitis calls for deeper cleaning below the gum line, usually under local anaesthetic, followed by regular reviews. In most cases gum disease can be kept under control, but it needs ongoing care; your dentist will advise how often you should return for maintenance.',
      ],
      steps: [
        { title: 'Gum check', text: 'We examine your gums, measure the pockets around your teeth and take X-rays where needed.' },
        { title: 'Diagnosis and plan', text: 'We explain the state of your gums and your treatment options, step by step.' },
        { title: 'Professional clean', text: 'We remove tartar and plaque above and below the gum line.' },
        { title: 'Targeted treatment', text: 'Where needed, we carry out deep cleaning, crown lengthening or laser reshaping of the gums.' },
        { title: 'Home care', text: 'We show you how to clean your teeth and the spaces between them effectively.' },
        { title: 'Regular reviews', text: 'Maintenance visits help keep your gums healthy over the long term.' },
      ],
      faq: [
        {
          q: 'Why do my gums bleed when I brush?',
          a: 'Bleeding is often the first sign of gingivitis, caused by plaque along the gum line. It should not be ignored; a check-up and professional clean usually improve things quickly.',
        },
        {
          q: 'Is gum treatment painful?',
          a: 'A routine clean usually causes only mild sensitivity. For deep cleaning and surgical procedures we use local anaesthetic, so during treatment you mainly feel pressure.',
        },
        {
          q: 'Can periodontitis be cured?',
          a: 'Lost bone usually does not grow back fully, but the disease can be stopped and kept under control with treatment and regular care.',
        },
        {
          q: 'How do I know which procedure suits me?',
          a: 'Crown lengthening exposes more tooth, often to support a crown or filling, while laser gingivectomy reshapes excess gum tissue. After an examination, your dentist will advise which is right for you.',
        },
      ],
      seoDescription:
        'Periodontology in Prishtina: treatment of gingivitis and periodontitis, crown lengthening and laser gingivectomy for healthy, well-shaped gums.',
    },
    de: {
      intro:
        'Gesundes Zahnfleisch ist die Grundlage Ihres Lächelns und jeder weiteren Zahnbehandlung. Wir beugen Zahnfleischerkrankungen vor, erkennen und behandeln sie und korrigieren bei Bedarf den Zahnfleischverlauf.',
      body: [
        'Die Parodontologie befasst sich mit dem Zahnfleisch und dem Gewebe, das die Zähne im Kiefer hält, einschließlich des Knochens. Eine Zahnfleischerkrankung beginnt meist als Gingivitis: gerötetes, geschwollenes Zahnfleisch, das beim Putzen blutet. Unbehandelt kann daraus eine Parodontitis werden, bei der sich die Verbindung zwischen Zahn und Knochen löst und Zähne locker werden können. Gesundes Zahnfleisch ist zudem Voraussetzung für haltbare Kronen, Implantate und Kieferorthopädie. Muss mehr Zahn freigelegt oder der Zahnfleischrand korrigiert werden, kommen Kronenverlängerung oder Laser-Gingivektomie in Frage.',
        'Beim ersten Termin untersuchen wir Ihr Zahnfleisch sorgfältig, messen die Zahnfleischtaschen und fertigen bei Bedarf Röntgenaufnahmen an. Eine Gingivitis bessert sich oft schon durch eine professionelle Reinigung und eine gründlichere Pflege zu Hause. Eine Parodontitis erfordert eine tiefere Reinigung unterhalb des Zahnfleischrands, meist unter örtlicher Betäubung, und anschließend regelmäßige Kontrollen. In den meisten Fällen lässt sich die Erkrankung gut kontrollieren, sie braucht jedoch dauerhafte Betreuung; Ihr Zahnarzt berät Sie zu den passenden Abständen.',
      ],
      steps: [
        { title: 'Zahnfleischbefund', text: 'Wir untersuchen Ihr Zahnfleisch, messen die Zahnfleischtaschen und röntgen bei Bedarf.' },
        { title: 'Diagnose und Plan', text: 'Wir erklären Ihnen den Zustand Ihres Zahnfleischs und die Behandlungsmöglichkeiten Schritt für Schritt.' },
        { title: 'Professionelle Reinigung', text: 'Wir entfernen Zahnstein und Beläge oberhalb und unterhalb des Zahnfleischrands.' },
        { title: 'Gezielte Behandlung', text: 'Bei Bedarf folgen eine Tiefenreinigung, eine Kronenverlängerung oder eine Konturierung mit dem Laser.' },
        { title: 'Pflege zu Hause', text: 'Wir zeigen Ihnen, wie Sie Zähne und Zahnzwischenräume wirksam reinigen.' },
        { title: 'Regelmäßige Kontrollen', text: 'Nachsorgetermine helfen, Ihr Zahnfleisch langfristig gesund zu halten.' },
      ],
      faq: [
        {
          q: 'Warum blutet mein Zahnfleisch beim Zähneputzen?',
          a: 'Zahnfleischbluten ist oft das erste Anzeichen einer Gingivitis, verursacht durch Beläge am Zahnfleischrand. Sie sollten es nicht ignorieren; eine Kontrolle und professionelle Reinigung bessern den Zustand meist rasch.',
        },
        {
          q: 'Ist die Behandlung des Zahnfleischs schmerzhaft?',
          a: 'Eine normale Reinigung verursacht meist nur eine leichte Empfindlichkeit. Für Tiefenreinigung und chirurgische Eingriffe verwenden wir eine örtliche Betäubung, sodass Sie während der Behandlung vor allem Druck spüren.',
        },
        {
          q: 'Ist Parodontitis heilbar?',
          a: 'Verlorener Knochen wächst in der Regel nicht vollständig nach, doch die Erkrankung lässt sich mit Behandlung und regelmäßiger Nachsorge stoppen und unter Kontrolle halten.',
        },
        {
          q: 'Welcher Eingriff ist der richtige für mich?',
          a: 'Die Kronenverlängerung legt mehr Zahnsubstanz frei, oft als Grundlage für eine Krone oder Füllung, während die Laser-Gingivektomie überschüssiges Zahnfleisch formt. Nach der Untersuchung berät Sie Ihr Zahnarzt.',
        },
      ],
      seoDescription:
        'Parodontologie in Prishtina: Behandlung von Gingivitis und Parodontitis, Kronenverlängerung und Laser-Gingivektomie für gesundes Zahnfleisch.',
    },
  },

  'crown-lengthening': {
    sq: {
      intro:
        'Zgjatja e kurorës zbulon më shumë pjesë të shëndetshme të dhëmbit mbi mishrat, për të mbështetur një restaurim të qëndrueshëm ose për një buzëqeshje më të harmonishme.',
      body: [
        'Kjo procedurë kryhet për dy arsye kryesore. E para është funksionale: kur një dhëmb është thyer ose ka karies nën vijën e mishrave, nuk mbetet mjaftueshëm strukturë e dukshme për një kurorë ose mbushje. Duke rikonturuar mishrat dhe, në disa raste, një sasi të vogël kocke, krijojmë hapësirë për një restaurim që përshtatet mirë. E dyta është estetike: kur dhëmbët duken të shkurtër për shkak të mishrave të tepërt, e ashtuquajtura buzëqeshje gingivale.',
        'Mishrat kanë nevojë për një hapësirë të vogël natyrale lidhjeje midis skajit të restaurimit dhe kockës poshtë tij. Nëse skaji i një kurore ose mbushjeje ndodhet shumë thellë, mishrat përreth priren të mbeten të inflamuar. Zgjatja e kurorës e rikthen këtë hapësirë dhe lë mjaftueshëm mur të fortë dhëmbi që kurora të mbahet mirë, gjë që ndihmon restaurimin të zgjasë. Ajo nuk është e përshtatshme për çdo dhëmb: nëse rrënja është e shkurtër, sëmundja e mishrave nuk është ende nën kontroll ose një gjendje e përgjithshme shëndetësore, si diabeti i pakontrolluar, ndikon në shërim, mjeku juaj mund të sugjerojë një zgjidhje tjetër.',
        'Procedura kryhet me anestezi lokale dhe zakonisht zgjat nga gjysmë ore deri në rreth një orë, në varësi të numrit të dhëmbëve. Sipas rastit, mishrat rikonturohen me instrumente të imta kirurgjikale ose, në disa raste, me laser dentar. Pas saj mund të ketë ënjtje dhe ndjeshmëri për disa ditë, që zakonisht menaxhohen me qetësues të zakonshëm të dhimbjes dhe me shpëlarje antiseptike. Shpesh vendosen qepje, të cilat hiqen pas rreth një jave. Sipërfaqja e mishrave zakonisht shërohet brenda një deri në dy javë, por indet kanë nevojë për disa javë, ndonjëherë më gjatë në zonën e përparme, që të stabilizohen para vendosjes së restaurimit përfundimtar.',
      ],
      steps: [
        { title: 'Ekzaminimi dhe planifikimi', text: 'Vlerësojmë dhëmbin, mishrat dhe kockën me ekzaminim dhe radiografi, dhe caktojmë sa duhet zbuluar.' },
        { title: 'Procedura', text: 'Me anestezi lokale rikonturojmë mishrat dhe, kur nevojitet, pak kockë, pastaj e qepim zonën.' },
        { title: 'Shërimi dhe restaurimi', text: 'Pas disa javësh shërimi, kur mishrat janë stabilizuar, vendoset kurora ose mbushja përfundimtare.' },
      ],
      faq: [
        {
          q: 'A dhemb zgjatja e kurorës?',
          a: 'Gjatë procedurës zona është e mpirë, prandaj zakonisht ndjeni vetëm presion. Pas saj mund të keni ndjeshmëri për disa ditë, e cila zakonisht menaxhohet me qetësues të zakonshëm të dhimbjes.',
        },
        {
          q: 'Sa kohë duhet të pres para kurorës përfundimtare?',
          a: 'Zakonisht disa javë, dhe në zonat e dukshme ndonjëherë më gjatë, që vija e mishrave të stabilizohet. Ndërkohë mund të mbani një kurorë të përkohshme.',
        },
        {
          q: 'Si kujdesem pas procedurës?',
          a: 'Shmangni larjen e fortë në zonën e trajtuar për disa ditë, hani ushqime të buta dhe ndiqni udhëzimet për shpëlarje. Mos pini duhan, sepse ngadalëson shërimin.',
        },
        {
          q: 'A ka alternativa?',
          a: 'Në disa raste dhëmbi mund të ngrihet gradualisht me aparat ortodontik, ose mund të merret në konsideratë nxjerrja dhe një implant. Për buzëqeshjen gingivale, kur nuk nevojitet rikonturim i kockës, gingivektomia me laser mund të mjaftojë.',
        },
        {
          q: 'A ka rreziqe?',
          a: 'Si në çdo procedurë të mishrave, mund të ketë ënjtje të përkohshme, dhe dhëmbët e trajtuar mund të duken pak më të gjatë ose të jenë më të ndjeshëm ndaj të ftohtit për një kohë. Infeksioni ose shërimi i ngadaltë janë të rralla, dhe planifikimi i kujdesshëm ndihmon që vija e mishrave të mbetet e rregullt.',
        },
        {
          q: 'A mund të bëhet nëse kam sëmundje të mishrave?',
          a: 'Inflamacioni i mishrave duhet trajtuar më parë, sepse ndërhyrja shërohet më mirë dhe më parashikueshëm në ind të shëndetshëm. Zakonisht mjeku juaj bën fillimisht një pastrim dhe kontrollon që mishrat të jenë qetësuar para se të planifikojë procedurën.',
        },
      ],
      seoDescription:
        'Zgjatja e kurorës në Prishtinë: zbulimi i më shumë dhëmbi për një kurorë të qëndrueshme ose për korrigjimin e buzëqeshjes gingivale.',
    },
    en: {
      intro:
        'Crown lengthening exposes more healthy tooth above the gum line, either to support a lasting restoration or to create a more balanced smile.',
      body: [
        'This procedure is done for two main reasons. The first is functional: when a tooth has broken or decayed below the gum line, there is not enough visible structure to hold a crown or filling securely. By reshaping the gum and, in some cases, a small amount of bone, we create room for a restoration that fits well and gums that stay healthy around it. The second is aesthetic: when teeth look short because they are covered by too much gum, often called a gummy smile.',
        'Gums need a small natural zone of attachment between the edge of a restoration and the bone beneath it. If the edge of a crown or filling sits too deep, the gum around it tends to stay inflamed. Crown lengthening restores that space and leaves enough firm tooth wall for the crown to grip, which helps the restoration last. It is not right for every tooth: if the root is short, gum disease is not yet under control, or a general health condition such as poorly controlled diabetes affects healing, your dentist may suggest another option.',
        'The procedure is carried out under local anaesthetic and usually takes between half an hour and about an hour, depending on how many teeth are involved. Depending on the situation, the gum is reshaped with fine surgical instruments or, in some cases, a dental laser. Afterwards you may have some swelling and tenderness for a few days, usually managed with ordinary pain relief and an antiseptic mouthwash. Stitches are often placed and removed after about a week. The gum surface usually heals within one to two weeks, but the tissues need several weeks, sometimes longer at the front of the mouth, to settle before the final restoration is made.',
      ],
      steps: [
        { title: 'Assessment and planning', text: 'We assess the tooth, gums and bone with an examination and X-rays, and plan how much tooth to expose.' },
        { title: 'The procedure', text: 'Under local anaesthetic we reshape the gum and, where needed, a little bone, then close the area with stitches.' },
        { title: 'Healing and restoration', text: 'After several weeks of healing, once the gums have settled, the final crown or filling is placed.' },
      ],
      faq: [
        {
          q: 'Does crown lengthening hurt?',
          a: 'The area is numbed during the procedure, so you usually feel only pressure. You may be tender for a few days afterwards, which ordinary pain relief usually manages well.',
        },
        {
          q: 'How long before I can have my final crown?',
          a: 'Usually several weeks, and sometimes longer in visible areas, so that the gum line can stabilise. A temporary crown can be worn in the meantime.',
        },
        {
          q: 'How should I care for the area afterwards?',
          a: 'Avoid brushing the treated area firmly for a few days, choose soft foods and follow the rinsing instructions you are given. Avoid smoking, as it slows healing.',
        },
        {
          q: 'Are there alternatives?',
          a: 'In some cases the tooth can be gradually brought up with orthodontics, or extraction and an implant may be considered. For a gummy smile where no bone reshaping is needed, laser gingivectomy may be enough.',
        },
        {
          q: 'Are there any risks?',
          a: 'As with any gum procedure, there may be temporary swelling, and the treated teeth can look slightly longer or feel more sensitive to cold for a while. Infection or slow healing is uncommon, and careful planning helps keep the gum line even.',
        },
        {
          q: 'Can it be done if I have gum disease?',
          a: 'Gum inflammation should be treated first, because surgery heals better and more predictably in healthy tissue. Your dentist will usually arrange a clean and check that the gums have settled before planning the procedure.',
        },
      ],
      seoDescription:
        'Crown lengthening in Prishtina: exposing more tooth to support a lasting crown or filling, or to correct a gummy smile.',
    },
    de: {
      intro:
        'Die Kronenverlängerung legt mehr gesunde Zahnsubstanz oberhalb des Zahnfleischs frei, um eine haltbare Versorgung zu ermöglichen oder ein harmonischeres Lächeln zu schaffen.',
      body: [
        'Der Eingriff hat zwei Hauptgründe. Der erste ist funktionell: Ist ein Zahn unterhalb des Zahnfleischrands abgebrochen oder kariös, bleibt nicht genug sichtbare Substanz, um eine Krone oder Füllung sicher zu verankern. Indem wir das Zahnfleisch und in manchen Fällen etwas Knochen neu formen, schaffen wir Platz für eine passgenaue Versorgung und gesundes Zahnfleisch darum herum. Der zweite ist ästhetisch: Wirken die Zähne kurz, weil sie von zu viel Zahnfleisch bedeckt sind, spricht man von einem Gummy Smile.',
        'Das Zahnfleisch braucht zwischen dem Rand einer Versorgung und dem darunterliegenden Knochen eine kleine natürliche Haftzone. Liegt der Rand einer Krone oder Füllung zu tief, bleibt das Zahnfleisch darum herum häufig entzündet. Die Kronenverlängerung stellt diesen Abstand wieder her und lässt genug feste Zahnwand stehen, an der die Krone Halt findet, was die Haltbarkeit der Versorgung unterstützt. Sie ist nicht für jeden Zahn geeignet: Ist die Wurzel kurz, ist eine Zahnfleischerkrankung noch nicht unter Kontrolle oder beeinträchtigt eine Allgemeinerkrankung wie ein schlecht eingestellter Diabetes die Heilung, schlägt Ihr Zahnarzt möglicherweise eine andere Lösung vor.',
        'Der Eingriff erfolgt unter örtlicher Betäubung und dauert meist zwischen einer halben und etwa einer Stunde, je nach Anzahl der Zähne. Je nach Situation wird das Zahnfleisch mit feinen chirurgischen Instrumenten oder in manchen Fällen mit einem zahnärztlichen Laser geformt. Danach können einige Tage lang Schwellung und Empfindlichkeit auftreten, die sich meist mit gängigen Schmerzmitteln und einer antiseptischen Mundspülung gut lindern lassen. Häufig wird genäht; die Fäden werden nach etwa einer Woche entfernt. Die Zahnfleischoberfläche heilt meist innerhalb von ein bis zwei Wochen, das Gewebe braucht jedoch mehrere Wochen, im Frontbereich manchmal länger, bis es sich stabilisiert hat und die endgültige Versorgung angefertigt werden kann.',
      ],
      steps: [
        { title: 'Befund und Planung', text: 'Wir beurteilen Zahn, Zahnfleisch und Knochen durch Untersuchung und Röntgen und planen, wie viel Zahn freigelegt wird.' },
        { title: 'Der Eingriff', text: 'Unter örtlicher Betäubung formen wir Zahnfleisch und bei Bedarf etwas Knochen neu und vernähen anschließend den Bereich.' },
        { title: 'Heilung und Versorgung', text: 'Nach einigen Wochen Heilung, wenn sich das Zahnfleisch stabilisiert hat, wird die endgültige Krone oder Füllung eingesetzt.' },
      ],
      faq: [
        {
          q: 'Tut eine Kronenverlängerung weh?',
          a: 'Während des Eingriffs ist der Bereich betäubt, Sie spüren daher meist nur Druck. Danach kann die Stelle einige Tage empfindlich sein, was sich mit gängigen Schmerzmitteln meist gut behandeln lässt.',
        },
        {
          q: 'Wie lange muss ich auf die endgültige Krone warten?',
          a: 'In der Regel mehrere Wochen, in sichtbaren Bereichen manchmal länger, damit sich der Zahnfleischrand stabilisiert. In der Zwischenzeit können Sie ein Provisorium tragen.',
        },
        {
          q: 'Worauf sollte ich nach dem Eingriff achten?',
          a: 'Putzen Sie den behandelten Bereich einige Tage nur sanft, bevorzugen Sie weiche Kost und halten Sie sich an die Spülanweisungen. Verzichten Sie auf das Rauchen, da es die Heilung verzögert.',
        },
        {
          q: 'Gibt es Alternativen?',
          a: 'In manchen Fällen kann der Zahn kieferorthopädisch langsam herausbewegt werden, oder eine Entfernung mit anschließendem Implantat wird erwogen. Bei einem Gummy Smile ohne notwendige Knochenkorrektur kann eine Laser-Gingivektomie ausreichen.',
        },
        {
          q: 'Gibt es Risiken?',
          a: 'Wie bei jedem Eingriff am Zahnfleisch kann es vorübergehend zu Schwellungen kommen, und die behandelten Zähne können etwas länger wirken oder eine Zeit lang empfindlicher auf Kälte reagieren. Infektionen oder eine verzögerte Heilung sind selten, und eine sorgfältige Planung hilft, einen gleichmäßigen Zahnfleischverlauf zu erhalten.',
        },
        {
          q: 'Ist der Eingriff bei einer Zahnfleischerkrankung möglich?',
          a: 'Eine Zahnfleischentzündung sollte zuerst behandelt werden, denn in gesundem Gewebe heilt der Eingriff besser und vorhersehbarer. Meist führt Ihr Zahnarzt zunächst eine Reinigung durch und prüft, ob sich das Zahnfleisch beruhigt hat, bevor der Eingriff geplant wird.',
        },
      ],
      seoDescription:
        'Kronenverlängerung in Prishtina: mehr Zahnsubstanz freilegen für eine haltbare Krone oder Füllung oder zur Korrektur eines Gummy Smile.',
    },
  },

  'laser-gingivectomy': {
    sq: {
      intro:
        'Gingivektomia me laser heq ose rikonturon mishrat e tepërt me një laser dentar, për një vijë mishrash më të rregullt dhe dhëmbë që duken në përmasat e tyre natyrale.',
      body: [
        'Kjo procedurë u përshtatet pacientëve me buzëqeshje gingivale, me vijë të parregullt të mishrave ose me mishra të rritur tepër, për shembull nga inflamacioni, nga disa medikamente ose gjatë trajtimit ortodontik. Mishrat e rritur tepër mund të krijojnë edhe xhepa të thellë rreth dhëmbëve ku grumbullohet pllaka; heqja e indit të tepërt i bën këto zona më të lehta për t’u pastruar. Laseri pret indin e butë me saktësi dhe njëkohësisht mbyll enët e vogla të gjakut. Kjo zakonisht do të thotë më pak gjakderdhje, dhe shpesh nevojiten pak qepje ose aspak. Nëse duhet ndryshuar edhe niveli i kockës, mjeku mund të rekomandojë zgjatjen e kurorës.',
        'Trajtimi bëhet me anestezi lokale dhe, kur përfshin disa dhëmbë, zakonisht zgjat më pak se një orë. Pas tij mishrat mund të jenë të ndjeshëm dhe pak të fryrë për disa ditë, por shumica e pacientëve kthehen në aktivitetet e zakonshme të nesërmen. Qetësuesit e zakonshëm të dhimbjes dhe një shpëlarje antiseptike, nëse jua rekomandon mjeku, ndihmojnë që të ndiheni rehat dhe zona të mbetet e pastër. Shërimi fillestar zgjat rreth një deri në dy javë, ndërsa forma përfundimtare vendoset gjatë disa javëve. Me higjienë të mirë dhe kontrolle të rregullta, rezultati zakonisht mbetet i qëndrueshëm, veçanërisht kur shkaku i rritjes së mishrave është nën kontroll.',
      ],
      steps: [
        { title: 'Konsultimi', text: 'Ekzaminojmë mishrat dhe kockën dhe diskutojmë sa ind duhet hequr dhe si do të duket vija e re.' },
        { title: 'Rikonturimi me laser', text: 'Pas anestezisë lokale, laseri heq indin e tepërt dhe formëson vijën e mishrave.' },
        { title: 'Shërimi dhe kontrolli', text: 'Ju japim udhëzime për kujdesin në shtëpi dhe kontrollojmë shërimin në vizitën pasuese.' },
      ],
      faq: [
        {
          q: 'A është trajtimi me laser më i rehatshëm?',
          a: 'Shumë pacientë e përjetojnë si më të lehtë, sepse zakonisht ka më pak gjakderdhje dhe ënjtje. Megjithatë zona mpihet me anestezi lokale dhe pas trajtimit mund të ketë ndjeshmëri për disa ditë.',
        },
        {
          q: 'A është i sigurt trajtimi me laser?',
          a: 'Kur përdoret nga një dentist i trajnuar, laseri dentar është një mënyrë e njohur dhe e sigurt për trajtimin e mishrave. Energjia drejtohet vetëm te indi që trajtohet, dhe gjatë procedurës ju dhe stafi mbani syze mbrojtëse.',
        },
        {
          q: 'A mund të rriten sërish mishrat?',
          a: 'Nëse rritja e mishrave vjen nga inflamacioni ose nga medikamentet, ajo mund të përsëritet pa kujdes të mirë. Higjiena e rregullt dhe kontrollet ndihmojnë ta ruani rezultatin.',
        },
        {
          q: 'Çfarë duhet të ha pas procedurës?',
          a: 'Për disa ditë preferoni ushqime të buta dhe jo shumë të nxehta ose pikante, dhe pastroni zonën butësisht sipas udhëzimeve.',
        },
        {
          q: 'Kur nuk mjafton gingivektomia me laser?',
          a: 'Nëse kocka është shumë afër sipërfaqes së dhëmbit ose buzëqeshja gingivale ka shkak tjetër, si lëvizja e tepërt e buzës, mund të nevojitet zgjatja e kurorës ose një qasje tjetër. Mjeku juaj do t’ju këshillojë pas ekzaminimit.',
        },
      ],
      seoDescription:
        'Gingivektomia me laser në Prishtinë: rikonturim i saktë i mishrave për buzëqeshje gingivale ose vijë të parregullt, zakonisht me pak gjakderdhje.',
    },
    en: {
      intro:
        'Laser gingivectomy removes or reshapes excess gum tissue with a dental laser, giving a more even gum line and letting your teeth show at their natural size.',
      body: [
        'This procedure suits patients with a gummy smile, an uneven gum line or overgrown gums, for example due to inflammation, certain medications or orthodontic treatment. Overgrown gum can also form deep pockets around the teeth that trap plaque; removing the excess tissue makes these areas easier to keep clean. The laser cuts soft tissue precisely while sealing small blood vessels as it goes. This usually means less bleeding, and often few or no stitches are needed. If the bone level also needs to change, your dentist may recommend crown lengthening instead.',
        'Treatment is done under local anaesthetic and, for several teeth, usually takes less than an hour. Afterwards the gums may feel tender and slightly swollen for a few days, but most patients return to normal activities the next day. Ordinary pain relief and, if your dentist recommends one, an antiseptic mouthwash help keep you comfortable and the area clean. Initial healing takes around one to two weeks, and the final shape settles over several weeks. With good oral hygiene and regular check-ups the result usually stays stable, especially when the cause of the gum overgrowth is under control.',
      ],
      steps: [
        { title: 'Consultation', text: 'We examine your gums and bone and discuss how much tissue to remove and how the new gum line will look.' },
        { title: 'Laser reshaping', text: 'After local anaesthetic, the laser removes excess tissue and shapes the gum line.' },
        { title: 'Healing and review', text: 'We give you home care instructions and check your healing at a follow-up visit.' },
      ],
      faq: [
        {
          q: 'Is laser treatment more comfortable?',
          a: 'Many patients find it easier, as there is usually less bleeding and swelling. The area is still numbed with local anaesthetic, and you may feel some tenderness for a few days afterwards.',
        },
        {
          q: 'Is laser treatment safe?',
          a: 'In the hands of a trained dentist, a dental laser is an established and safe way to treat gum tissue. The energy is directed only at the tissue being treated, and you and the team wear protective glasses during the procedure.',
        },
        {
          q: 'Can the gums grow back?',
          a: 'If the overgrowth was caused by inflammation or medication, it can return without good care. Regular hygiene and check-ups help you keep the result.',
        },
        {
          q: 'What should I eat after the procedure?',
          a: 'For a few days, choose soft foods that are not too hot or spicy, and clean the area gently as instructed.',
        },
        {
          q: 'When is laser gingivectomy not enough?',
          a: 'If the bone sits too close to the tooth surface, or the gummy smile has another cause such as an overactive upper lip, crown lengthening or a different approach may be needed. Your dentist will advise after an examination.',
        },
      ],
      seoDescription:
        'Laser gingivectomy in Prishtina: precise gum reshaping for a gummy smile or uneven gum line, usually with minimal bleeding.',
    },
    de: {
      intro:
        'Bei der Laser-Gingivektomie wird überschüssiges Zahnfleisch mit einem zahnärztlichen Laser entfernt oder geformt, für einen gleichmäßigeren Zahnfleischverlauf und Zähne in ihrer natürlichen Größe.',
      body: [
        'Der Eingriff eignet sich bei einem Gummy Smile, einem ungleichmäßigen Zahnfleischrand oder wucherndem Zahnfleisch, etwa durch Entzündungen, bestimmte Medikamente oder eine kieferorthopädische Behandlung. Wucherndes Zahnfleisch kann zudem tiefe Taschen um die Zähne bilden, in denen sich Beläge sammeln; die Entfernung des überschüssigen Gewebes erleichtert die Reinigung dieser Bereiche. Der Laser schneidet Weichgewebe präzise und verschließt dabei gleichzeitig kleine Blutgefäße. Das bedeutet meist weniger Blutung, und oft sind nur wenige oder gar keine Nähte nötig. Muss auch das Knochenniveau verändert werden, empfiehlt Ihr Zahnarzt unter Umständen eine Kronenverlängerung.',
        'Die Behandlung erfolgt unter örtlicher Betäubung und dauert bei mehreren Zähnen meist weniger als eine Stunde. Danach kann das Zahnfleisch einige Tage empfindlich und leicht geschwollen sein, die meisten Patienten gehen jedoch am nächsten Tag ihrem gewohnten Alltag nach. Gängige Schmerzmittel und, falls Ihr Zahnarzt sie empfiehlt, eine antiseptische Mundspülung sorgen für mehr Komfort und halten den Bereich sauber. Die erste Heilung dauert etwa ein bis zwei Wochen, die endgültige Form stellt sich im Laufe mehrerer Wochen ein. Bei guter Mundhygiene und regelmäßigen Kontrollen bleibt das Ergebnis meist stabil, besonders wenn die Ursache der Wucherung behandelt ist.',
      ],
      steps: [
        { title: 'Beratung', text: 'Wir untersuchen Zahnfleisch und Knochen und besprechen, wie viel Gewebe entfernt wird und wie der neue Zahnfleischverlauf aussehen soll.' },
        { title: 'Konturierung mit Laser', text: 'Nach der örtlichen Betäubung entfernt der Laser überschüssiges Gewebe und formt den Zahnfleischrand.' },
        { title: 'Heilung und Kontrolle', text: 'Sie erhalten Pflegehinweise für zu Hause, und wir prüfen die Heilung bei einem Kontrolltermin.' },
      ],
      faq: [
        {
          q: 'Ist die Laserbehandlung angenehmer?',
          a: 'Viele Patienten empfinden sie als schonender, da es meist weniger blutet und schwillt. Der Bereich wird dennoch örtlich betäubt, und danach kann er einige Tage empfindlich sein.',
        },
        {
          q: 'Ist die Laserbehandlung sicher?',
          a: 'In der Hand eines geschulten Zahnarztes ist der zahnärztliche Laser ein bewährtes und sicheres Instrument zur Behandlung des Zahnfleischs. Die Energie wird gezielt nur auf das behandelte Gewebe gerichtet, und Sie sowie das Team tragen während des Eingriffs Schutzbrillen.',
        },
        {
          q: 'Kann das Zahnfleisch wieder nachwachsen?',
          a: 'Wurde die Wucherung durch Entzündungen oder Medikamente ausgelöst, kann sie ohne gute Pflege wiederkehren. Regelmäßige Mundhygiene und Kontrollen helfen, das Ergebnis zu erhalten.',
        },
        {
          q: 'Was darf ich nach dem Eingriff essen?',
          a: 'Bevorzugen Sie einige Tage weiche Speisen, die nicht zu heiß oder scharf sind, und reinigen Sie den Bereich sanft nach Anweisung.',
        },
        {
          q: 'Wann reicht eine Laser-Gingivektomie nicht aus?',
          a: 'Liegt der Knochen zu nah an der Zahnoberfläche oder hat das Gummy Smile eine andere Ursache, etwa eine sehr bewegliche Oberlippe, kann eine Kronenverlängerung oder ein anderes Vorgehen nötig sein. Ihr Zahnarzt berät Sie nach der Untersuchung.',
        },
      ],
      seoDescription:
        'Laser-Gingivektomie in Prishtina: präzise Konturierung des Zahnfleischs bei Gummy Smile oder ungleichmäßigem Rand, meist mit wenig Blutung.',
    },
  },
};

export default content;
