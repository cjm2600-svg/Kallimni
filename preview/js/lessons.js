/*
 * Kallimni lesson data — Beginner Egyptian Arabic (Masri / عامية مصرية).
 *
 * TO ADD A LESSON: append an object to KALLIMNI_LESSONS below. Nothing else
 * needs to change — the home screen, flashcards, quiz and progress tracking
 * all read from this list.
 *
 * Phrase fields:
 *   id      unique, stable string (progress is saved against it — never reuse)
 *   ar      Arabic script as Egyptians say it (colloquial, not MSA)
 *   tr      transliteration (see TRANSLIT_KEY)
 *   en      English meaning
 *   note    optional usage tip (gender forms, reply, register)
 *   audio   optional path to a native-speaker recording, e.g. "audio/l1-01.mp3".
 *           When present it is played instead of the device voice.
 *   say     optional text to hand to a text-to-speech voice when it differs
 *           from `ar` (e.g. to add vowel marks that help the voice).
 */
window.TRANSLIT_KEY = [
  ["ʿ", "ع — a tight throat sound (Egyptians often write it as 3)"],
  ["'", "ء / Cairene ق — a quick catch in the throat, like the break in “uh-oh”"],
  ["ḥ", "ح — a breathy h from deep in the throat (often written 7)"],
  ["kh", "خ — like Scottish “loch”"],
  ["gh", "غ — a soft gargled g, like French r"],
  ["g", "ج — always a hard g in Cairo (gamal, not jamal)"],
  ["aa, ii, ee, oo", "long vowels — hold them a little longer"]
];

window.KALLIMNI_LESSONS = [
  {
    id: "l1",
    title: "Greetings",
    arTitle: "التحيات",
    icon: "👋",
    blurb: "Say hello and goodbye like a Cairene.",
    phrases: [
      { id: "l1p1", ar: "السلام عليكم", tr: "is-salaamu ʿaleekum", en: "Peace be upon you (hello)",
        note: "The all-purpose greeting. Works anywhere, any time of day." },
      { id: "l1p2", ar: "وعليكم السلام", tr: "wa ʿaleekum is-salaam", en: "And upon you peace (reply)",
        note: "The standard answer to is-salaamu ʿaleekum." },
      { id: "l1p3", ar: "أهلاً", tr: "ahlan", en: "Hi / welcome",
        note: "Casual hello. Reply: ahlan biik (to a man) / ahlan biiki (to a woman)." },
      { id: "l1p4", ar: "صباح الخير", tr: "ṣabaaḥ il-kheer", en: "Good morning",
        note: "Literally “morning of goodness”." },
      { id: "l1p5", ar: "صباح النور", tr: "ṣabaaḥ in-nuur", en: "Good morning (reply)",
        note: "“Morning of light” — the classic answer to ṣabaaḥ il-kheer." },
      { id: "l1p6", ar: "مساء الخير", tr: "masaa' il-kheer", en: "Good evening",
        note: "Reply: masaa' in-nuur." },
      { id: "l1p7", ar: "إزيك؟", tr: "izzayyak? / izzayyik?", en: "How are you?",
        note: "izzayyak to a man, izzayyik to a woman. Very Egyptian!" },
      { id: "l1p8", ar: "الحمد لله", tr: "il-ḥamdu lillaah", en: "Thank God (I'm fine)",
        note: "The usual answer to “how are you?”." },
      { id: "l1p9", ar: "مع السلامة", tr: "maʿa s-salaama", en: "Goodbye",
        note: "Literally “with safety”. Reply: allaah yisallimak / yisallimik." }
    ]
  },
  {
    id: "l2",
    title: "Polite Basics",
    arTitle: "كلمات مهمة",
    icon: "🙏",
    blurb: "Please, thanks, yes, no — the words you'll use all day.",
    phrases: [
      { id: "l2p1", ar: "من فضلك", tr: "min faḍlak / min faḍlik", en: "Please",
        note: "faḍlak to a man, faḍlik to a woman." },
      { id: "l2p2", ar: "شكراً", tr: "shukran", en: "Thank you" },
      { id: "l2p3", ar: "عفواً", tr: "ʿafwan", en: "You're welcome / excuse me",
        note: "Also used to get attention politely." },
      { id: "l2p4", ar: "أيوه", tr: "aywa", en: "Yes",
        note: "Everyday Egyptian “yes” (MSA would be naʿam)." },
      { id: "l2p5", ar: "لأ", tr: "la'", en: "No",
        note: "Short and sharp, with a catch at the end." },
      { id: "l2p6", ar: "ماشي", tr: "maashi", en: "OK / alright",
        note: "Literally “walking” — Egyptians say it constantly." },
      { id: "l2p7", ar: "معلش", tr: "maʿlesh", en: "Never mind / sorry / it's OK",
        note: "One of the most useful words in Egypt." },
      { id: "l2p8", ar: "آسف", tr: "aasif / asfa", en: "I'm sorry",
        note: "aasif if you are a man, asfa if you are a woman." },
      { id: "l2p9", ar: "إن شاء الله", tr: "in shaa' allaah", en: "God willing",
        note: "Used for anything in the future, big or small." }
    ]
  },
  {
    id: "l3",
    title: "Introductions",
    arTitle: "التعارف",
    icon: "🤝",
    blurb: "Name, where you're from, and nice to meet you.",
    phrases: [
      { id: "l3p1", ar: "اسمك إيه؟", tr: "ismak eh? / ismik eh?", en: "What's your name?",
        note: "Egyptian puts the question word last: “your name what?”." },
      { id: "l3p2", ar: "اسمي ...", tr: "ismi ...", en: "My name is ..." },
      { id: "l3p3", ar: "انت منين؟", tr: "inta mineen? / inti mineen?", en: "Where are you from?",
        note: "inta to a man, inti to a woman." },
      { id: "l3p4", ar: "أنا من أمريكا", tr: "ana min amriika", en: "I'm from America",
        note: "Swap in your country: ana min kanada, ana min ingiltira…" },
      { id: "l3p5", ar: "تشرفنا", tr: "itsharrafna", en: "Nice to meet you",
        note: "Literally “we are honored”." },
      { id: "l3p6", ar: "فرصة سعيدة", tr: "furṣa saʿiida", en: "Pleased to meet you",
        note: "“A happy opportunity” — often said when parting." },
      { id: "l3p7", ar: "بتتكلم عربي؟", tr: "bititkallim ʿarabi?", en: "Do you speak Arabic?",
        note: "To a woman: bititkallimi ʿarabi?" },
      { id: "l3p8", ar: "شوية", tr: "shwayya", en: "A little",
        note: "ana batkallim ʿarabi shwayya — I speak a little Arabic." },
      { id: "l3p9", ar: "مش فاهم", tr: "mish faahim / mish fahma", en: "I don't understand",
        note: "faahim if you are a man, fahma if you are a woman." }
    ]
  }
];
