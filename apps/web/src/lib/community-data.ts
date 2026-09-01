export type CommunityDataEntry = {
  religion: string
  name: string
  aliases?: string[]
  subcastes?: string[]
}

export type GotraDataEntry = {
  religion?: string
  name: string
  aliases?: string[]
}

export const COMMUNITY_MASTER_DATA: {
  communities: CommunityDataEntry[]
  gotras: GotraDataEntry[]
} = {
  communities: [
    {
      religion: "Hindu",
      name: "Brahmin",
      aliases: ["brahman", "brahmin", "tamil brahmin"],
      subcastes: [
        "Iyer", "Iyengar", "Vadama", "Vathima", "Gurukkal", "Namboodiri",
        "Gaur", "Kanyakubj", "Saraswat", "Smartha", "Havyaka", "Madhwa",
        "Vadakalai Iyengar", "Thenkalai Iyengar", "Deshastha", "Konkanastha",
        "Chitpawan", "Anavil", "Audichya", "Barendra", "Maithil", "Rarhi",
        "Saryupari", "Tyagi", "Bhumihar", "Pushkarna", "Mohyal", "Daivadnya",
        "Shivalli", "Sthanika", "Hoysala Karnataka", "Dravida", "Adi Shaiva",
        "Nagar", "Modh", "Vaidiki", "Niyogi",
      ],
    },
    {
      religion: "Hindu",
      name: "Agarwal",
      aliases: ["agarwal", "aggarwal", "agrawal", "garg"],
      subcastes: ["Garg", "Bansal", "Goyal", "Jindal", "Kansal", "Mangal", "Mittal", "Singhal"],
    },
    { religion: "Hindu", name: "Arora", aliases: ["arora"], subcastes: [] },
    { religion: "Hindu", name: "Baidya", aliases: ["baidya", "vaidya"], subcastes: [] },
    {
      religion: "Hindu",
      name: "Baniya",
      aliases: ["baniya", "vaishya", "bania", "vaish"],
      subcastes: ["Agrawal", "Gupta", "Maheshwari", "Oswal", "Porwal", "Khandelwal"],
    },
    { religion: "Hindu", name: "Banjara", aliases: ["banjara", "lambadi", "lambani"], subcastes: [] },
    { religion: "Hindu", name: "Bhandari", aliases: ["bhandari"], subcastes: [] },
    { religion: "Hindu", name: "Bhatia", aliases: ["bhatia"], subcastes: [] },
    { religion: "Hindu", name: "Billava", aliases: ["billava", "billawas"], subcastes: [] },
    { religion: "Hindu", name: "Bunt", aliases: ["bunt", "bunts"], subcastes: ["Nadava", "Jain Bunt"] },
    {
      religion: "Hindu",
      name: "Chettiar",
      aliases: ["chettiyar", "chetty", "nagarathar", "chettiar"],
      subcastes: ["Nagarathar", "Vaniya Chettiar", "Arya Vysya", "Devanga Chettiar", "Nattukotai Chettiar"],
    },
    { religion: "Hindu", name: "CKP", aliases: ["ckp", "chandraseniya kayastha prabhu"], subcastes: [] },
    { religion: "Hindu", name: "Devanga", aliases: ["devanga"], subcastes: [] },
    { religion: "Hindu", name: "Dhobi", aliases: ["dhobi", "rajak"], subcastes: [] },
    { religion: "Hindu", name: "Ezhava", aliases: ["ezhava", "thiyya", "izhuva"], subcastes: ["Thiyya", "Billava"] },
    { religion: "Hindu", name: "Garhwali", aliases: ["garhwali", "pahari"], subcastes: ["Garhwali Rajput", "Garhwali Brahmin"] },
    {
      religion: "Hindu",
      name: "Gounder",
      aliases: ["gounder", "goundar", "kongu vellala gounder"],
      subcastes: ["Kongu Vellala Gounder", "Urali Gounder", "Vettuva Gounder", "Nattu Gounder", "Padayachi Gounder"],
    },
    { religion: "Hindu", name: "Gowda", aliases: ["gowda", "gauda", "vokkaliga"], subcastes: ["Vokkaliga", "Lingayat Gowda", "Edigar"] },
    { religion: "Hindu", name: "Gujjar", aliases: ["gujjar", "gurjar"], subcastes: [] },
    { religion: "Hindu", name: "Gupta", aliases: ["gupta"], subcastes: [] },
    { religion: "Hindu", name: "Jat", aliases: ["jat", "jatt"], subcastes: ["Dahiya", "Malik", "Sheoran", "Sangwan", "Hooda"] },
    { religion: "Hindu", name: "Kalwar", aliases: ["kalwar", "kalal"], subcastes: [] },
    { religion: "Hindu", name: "Kamboj", aliases: ["kamboj", "kamboh"], subcastes: [] },
    { religion: "Hindu", name: "Kamma", aliases: ["kamma", "chowdary"], subcastes: ["Chowdary", "Naidu Kamma"] },
    { religion: "Hindu", name: "Kapu", aliases: ["kapu", "telaga"], subcastes: ["Telaga", "Balija", "Ontari", "Munnuru Kapu"] },
    { religion: "Hindu", name: "Kayastha", aliases: ["kayastha", "kayasth"], subcastes: ["Srivastava", "Saxena", "Mathur", "Nigam", "Bhatnagar"] },
    { religion: "Hindu", name: "Khandayat", aliases: ["khandayat", "khandait"], subcastes: [] },
    { religion: "Hindu", name: "Khatri", aliases: ["khatri"], subcastes: [] },
    { religion: "Hindu", name: "Koiri", aliases: ["koiri", "koeri", "kushwaha"], subcastes: ["Kushwaha"] },
    { religion: "Hindu", name: "Koli", aliases: ["koli"], subcastes: ["Mahadev Koli", "Son Koli", "Dhor Koli"] },
    { religion: "Hindu", name: "Kshatriya", aliases: ["kshatriya"], subcastes: [] },
    { religion: "Hindu", name: "Kumhar", aliases: ["kumhar", "kumbhar", "prajapati"], subcastes: ["Prajapati"] },
    { religion: "Hindu", name: "Kunbi", aliases: ["kunbi", "kunabi"], subcastes: ["Tirole", "Leva Kunbi"] },
    { religion: "Hindu", name: "Kurmi", aliases: ["kurmi", "kurmi kshatriya"], subcastes: ["Patel", "Awadhiya"] },
    { religion: "Hindu", name: "Kuruba", aliases: ["kuruba", "kuruma", "kurumba"], subcastes: [] },
    { religion: "Hindu", name: "Leva Patel", aliases: ["leva patel", "leuva patel", "leuva"], subcastes: [] },
    { religion: "Hindu", name: "Lingayat", aliases: ["lingayat", "veerashaiva"], subcastes: ["Veerashaiva", "Panchamasali", "Jangam", "Ganiga", "Sadar"] },
    { religion: "Hindu", name: "Lohana", aliases: ["lohana"], subcastes: [] },
    { religion: "Hindu", name: "Mahajan", aliases: ["mahajan"], subcastes: [] },
    { religion: "Hindu", name: "Mahar", aliases: ["mahar"], subcastes: [] },
    { religion: "Hindu", name: "Maheshwari", aliases: ["maheshwari"], subcastes: [] },
    { religion: "Hindu", name: "Mali", aliases: ["mali", "maalee", "phulmali"], subcastes: [] },
    { religion: "Hindu", name: "Maratha", aliases: ["maratha", "marathi"], subcastes: ["96 Kuli Maratha", "Maratha Kunbi"] },
    { religion: "Hindu", name: "Meena", aliases: ["meena", "mina"], subcastes: [] },
    { religion: "Hindu", name: "Mudaliar", aliases: ["mudaliar", "mudaliyar"], subcastes: ["Saiva Mudaliar", "Senguntha Mudaliar", "Thuluva Vellala", "Arcot Mudaliar", "Agamudayar Mudaliar"] },
    { religion: "Hindu", name: "Nadar", aliases: ["nadar", "shanar"], subcastes: ["Sanar", "Nadan", "Gramani"] },
    { religion: "Hindu", name: "Naicker", aliases: ["naicker", "naick", "nayak"], subcastes: ["Vanniya Naicker", "Kammavar Naicker"] },
    { religion: "Hindu", name: "Naidu", aliases: ["naidu", "balija naidu"], subcastes: ["Balija", "Telaga", "Kapu", "Gavara", "Kamma Naidu"] },
    { religion: "Hindu", name: "Nair", aliases: ["nair", "nairs", "menon"], subcastes: ["Nambiar", "Menon", "Kurup", "Panicker", "Pillai Nair", "Tharakan"] },
    { religion: "Hindu", name: "Nai", aliases: ["nai", "nayi", "nayee", "hajam"], subcastes: [] },
    { religion: "Hindu", name: "Okkaliga", aliases: ["okkaliga", "vokkaligar"], subcastes: [] },
    { religion: "Hindu", name: "Padmashali", aliases: ["padmashali", "padmasali"], subcastes: [] },
    { religion: "Hindu", name: "Patel", aliases: ["patel", "patidar"], subcastes: ["Leuva Patel", "Kadva Patel", "Anjana Patel"] },
    { religion: "Hindu", name: "Pillai", aliases: ["pillai", "pillais"], subcastes: ["Saiva Pillai", "Vellala Pillai", "Nair Pillai", "Kerala Pillai"] },
    { religion: "Hindu", name: "Rajput", aliases: ["rajput", "rajpoot"], subcastes: ["Chauhan", "Rathore", "Solanki", "Sisodiya", "Bundela", "Chandel", "Tomara", "Parmar", "Bais"] },
    { religion: "Hindu", name: "Reddy", aliases: ["reddy", "reddys", "kapu reddy"], subcastes: ["Kapu", "Reddy Kapu", "Panta Reddy", "Motati Reddy", "Deshmukh Reddy"] },
    { religion: "Hindu", name: "Saini", aliases: ["saini", "mali saini", "shoorsaini"], subcastes: [] },
    { religion: "Hindu", name: "Scheduled Caste", aliases: ["sc", "dalit", "adi dravida"], subcastes: ["Adi Dravida", "Paraiyar", "Pallar", "Arunthathiyar", "Chamar", "Jatav", "Valmiki", "Mahar", "Madiga", "Mala"] },
    { religion: "Hindu", name: "Scheduled Tribe", aliases: ["st", "adivasi", "tribal"], subcastes: ["Bhil", "Gond", "Santhal", "Munda", "Oraon", "Irula", "Toda"] },
    { religion: "Hindu", name: "Shimpi", aliases: ["shimpi", "namdev shimpi"], subcastes: [] },
    { religion: "Hindu", name: "Sonar", aliases: ["sonar", "sunar", "soni"], subcastes: [] },
    { religion: "Hindu", name: "Teli", aliases: ["teli", "gandla"], subcastes: [] },
    { religion: "Hindu", name: "Thakur", aliases: ["thakur"], subcastes: [] },
    { religion: "Hindu", name: "Thevar", aliases: ["thevar", "mukkulathor"], subcastes: ["Agamudayar", "Kallar", "Maravar", "Pramalai Kallar"] },
    { religion: "Hindu", name: "Vanniyar", aliases: ["vanniyar", "vanniya kula kshatriya"], subcastes: ["Vanniya Kula Kshatriya", "Padayachi", "Naicker"] },
    { religion: "Hindu", name: "Velama", aliases: ["velama", "padmanayaka"], subcastes: [] },
    { religion: "Hindu", name: "Vellalar", aliases: ["vellalar", "vellala"], subcastes: ["Saiva Vellalar", "Thuluva Vellalar", "Kongu Vellalar", "Chozhia Vellalar", "Karkathar"] },
    { religion: "Hindu", name: "Vishwakarma", aliases: ["vishwakarma", "viswakarma"], subcastes: ["Goldsmith", "Blacksmith", "Carpenter", "Sculptor", "Coppersmith"] },
    { religion: "Hindu", name: "Vysya", aliases: ["vysya", "arya vysya", "komati"], subcastes: ["Arya Vysya", "Komati"] },
    { religion: "Hindu", name: "Yadav", aliases: ["yadav", "ahir"], subcastes: ["Ahir", "Gwala", "Nandavanshi", "Yaduvanshi"] },
    { religion: "Hindu", name: "OBC", aliases: ["obc", "other backward class"], subcastes: [] },
    { religion: "Hindu", name: "Other Hindu", aliases: ["hindu other", "other"], subcastes: [] },

    // Muslim
    { religion: "Muslim", name: "Sunni", aliases: ["sunni muslim", "sunni"], subcastes: ["Hanafi", "Shafi", "Hanbali", "Maliki"] },
    { religion: "Muslim", name: "Shia", aliases: ["shia muslim", "shia"], subcastes: ["Twelver", "Ismaili"] },
    { religion: "Muslim", name: "Ansari", aliases: ["ansari", "momin ansari"], subcastes: [] },
    { religion: "Muslim", name: "Bohra", aliases: ["bohra", "dawoodi bohra"], subcastes: ["Dawoodi Bohra", "Sulemani Bohra"] },
    { religion: "Muslim", name: "Khoja", aliases: ["khoja"], subcastes: [] },
    { religion: "Muslim", name: "Lebbai", aliases: ["lebbai", "labbai"], subcastes: [] },
    { religion: "Muslim", name: "Malik", aliases: ["malik"], subcastes: [] },
    { religion: "Muslim", name: "Mapilla", aliases: ["mapilla", "mappila"], subcastes: [] },
    { religion: "Muslim", name: "Memon", aliases: ["memon"], subcastes: ["Halai Memon", "Kutchi Memon"] },
    { religion: "Muslim", name: "Pathan", aliases: ["pathan", "pashtun"], subcastes: ["Yusufzai", "Afridi"] },
    { religion: "Muslim", name: "Qureshi", aliases: ["qureshi"], subcastes: [] },
    { religion: "Muslim", name: "Rajput Muslim", aliases: ["rajput muslim"], subcastes: [] },
    { religion: "Muslim", name: "Rowther", aliases: ["rowther"], subcastes: [] },
    { religion: "Muslim", name: "Shaikh", aliases: ["shaikh", "sheikh"], subcastes: ["Siddiqui", "Farooqi"] },
    { religion: "Muslim", name: "Syed", aliases: ["syed", "sayyid"], subcastes: ["Rizvi", "Naqvi", "Zaidi"] },
    { religion: "Muslim", name: "Mughal", aliases: ["mughal"], subcastes: [] },
    { religion: "Muslim", name: "Other Muslim", aliases: ["muslim other"], subcastes: [] },

    // Christian
    { religion: "Christian", name: "Roman Catholic", aliases: ["catholic", "rc"], subcastes: ["Latin Catholic", "Syro-Malabar", "Syro-Malankara", "Anglo-Indian"] },
    { religion: "Christian", name: "CSI", aliases: ["csi", "church of south india"], subcastes: [] },
    { religion: "Christian", name: "CNI", aliases: ["cni", "church of north india"], subcastes: [] },
    { religion: "Christian", name: "Pentecostal", aliases: ["pentecost"], subcastes: [] },
    { religion: "Christian", name: "Marthoma", aliases: ["marthoma"], subcastes: [] },
    { religion: "Christian", name: "Jacobite", aliases: ["jacobite"], subcastes: [] },
    { religion: "Christian", name: "Protestant", aliases: ["protestant"], subcastes: [] },
    { religion: "Christian", name: "Orthodox Syrian", aliases: ["orthodox syrian"], subcastes: [] },
    { religion: "Christian", name: "Born Again", aliases: ["born again"], subcastes: [] },
    { religion: "Christian", name: "Knanaya", aliases: ["knanaya"], subcastes: ["Knanaya Catholic", "Knanaya Jacobite"] },
    { religion: "Christian", name: "Methodist", aliases: ["methodist"], subcastes: [] },
    { religion: "Christian", name: "Seventh Day Adventist", aliases: ["sda"], subcastes: [] },
    { religion: "Christian", name: "Other Christian", aliases: ["christian other"], subcastes: [] },

    // Sikh
    { religion: "Sikh", name: "Jat Sikh", aliases: ["jat sikh"], subcastes: [] },
    { religion: "Sikh", name: "Khatri", aliases: ["khatri sikh"], subcastes: [] },
    { religion: "Sikh", name: "Ramgarhia", aliases: ["ramgarhia"], subcastes: [] },
    { religion: "Sikh", name: "Ahluwalia", aliases: ["ahluwalia"], subcastes: [] },
    { religion: "Sikh", name: "Arora Sikh", aliases: ["arora sikh"], subcastes: [] },
    { religion: "Sikh", name: "Bhapa Sikh", aliases: ["bhapa sikh"], subcastes: [] },
    { religion: "Sikh", name: "Lubana", aliases: ["lubana"], subcastes: [] },
    { religion: "Sikh", name: "Majhabi", aliases: ["majhabi"], subcastes: [] },
    { religion: "Sikh", name: "Saini Sikh", aliases: ["saini sikh"], subcastes: [] },

    // Jain
    { religion: "Jain", name: "Digambar", aliases: ["digambar"], subcastes: [] },
    { religion: "Jain", name: "Shwetambar", aliases: ["shwetambar"], subcastes: [] },
    { religion: "Jain", name: "Agarwal Jain", aliases: ["agarwal jain"], subcastes: [] },
    { religion: "Jain", name: "Khandelwal", aliases: ["khandelwal"], subcastes: [] },
    { religion: "Jain", name: "Oswal", aliases: ["oswal"], subcastes: [] },
    { religion: "Jain", name: "Porwal", aliases: ["porwal"], subcastes: [] },
    { religion: "Jain", name: "Parwar", aliases: ["parwar"], subcastes: [] },

    // Buddhist
    { religion: "Buddhist", name: "Navayana", aliases: ["neo buddhist"], subcastes: [] },
    { religion: "Buddhist", name: "Mahayana", aliases: ["mahayana"], subcastes: [] },
    { religion: "Buddhist", name: "Theravada", aliases: ["theravada"], subcastes: [] },
    { religion: "Buddhist", name: "Other Buddhist", aliases: ["buddhist other"], subcastes: [] },

    // Parsi / Jewish / Spiritual / Other
    { religion: "Parsi", name: "Parsi", aliases: ["parsi", "zoroastrian"], subcastes: [] },
    { religion: "Parsi", name: "Irani", aliases: ["irani"], subcastes: [] },
    { religion: "Jewish", name: "Jewish", aliases: ["jewish"], subcastes: ["Cochin Jewish", "Bene Israel"] },
    { religion: "Spiritual", name: "Spiritual", aliases: ["spiritual"], subcastes: [] },
    { religion: "Other", name: "Inter-caste", aliases: ["intercaste"], subcastes: [] },
    { religion: "Other", name: "Caste no bar", aliases: ["caste no bar"], subcastes: [] },
    { religion: "Other", name: "No Religion", aliases: ["no religion", "atheist"], subcastes: [] },
  ],
  gotras: [
    { religion: "Hindu", name: "Agastya" },
    { religion: "Hindu", name: "Aghamarsana" },
    { religion: "Hindu", name: "Angirasa" },
    { religion: "Hindu", name: "Atri" },
    { religion: "Hindu", name: "Avatsara" },
    { religion: "Hindu", name: "Badarayana" },
    { religion: "Hindu", name: "Bharadwaja" },
    { religion: "Hindu", name: "Bhrigu" },
    { religion: "Hindu", name: "Chyavana" },
    { religion: "Hindu", name: "Dalabhya" },
    { religion: "Hindu", name: "Dhananjaya" },
    { religion: "Hindu", name: "Galava" },
    { religion: "Hindu", name: "Garga" },
    { religion: "Hindu", name: "Gautama" },
    { religion: "Hindu", name: "Harita" },
    { religion: "Hindu", name: "Jabali" },
    { religion: "Hindu", name: "Jamadagni" },
    { religion: "Hindu", name: "Kanva" },
    { religion: "Hindu", name: "Kapishtala" },
    { religion: "Hindu", name: "Kashyapa" },
    { religion: "Hindu", name: "Katyayana" },
    { religion: "Hindu", name: "Kaundinya" },
    { religion: "Hindu", name: "Kaushika" },
    { religion: "Hindu", name: "Kratu" },
    { religion: "Hindu", name: "Kutsa" },
    { religion: "Hindu", name: "Lokaksha" },
    { religion: "Hindu", name: "Maitreya" },
    { religion: "Hindu", name: "Mandavya" },
    { religion: "Hindu", name: "Marichi" },
    { religion: "Hindu", name: "Markandeya" },
    { religion: "Hindu", name: "Moudgalya" },
    { religion: "Hindu", name: "Naidhruva" },
    { religion: "Hindu", name: "Parashara" },
    { religion: "Hindu", name: "Pulaha" },
    { religion: "Hindu", name: "Pulastya" },
    { religion: "Hindu", name: "Salihotra" },
    { religion: "Hindu", name: "Sandilya" },
    { religion: "Hindu", name: "Sankrithi" },
    { religion: "Hindu", name: "Savarni" },
    { religion: "Hindu", name: "Shandilya" },
    { religion: "Hindu", name: "Shounaka" },
    { religion: "Hindu", name: "Suparna" },
    { religion: "Hindu", name: "Upamanyu" },
    { religion: "Hindu", name: "Valmiki" },
    { religion: "Hindu", name: "Vasishta" },
    { religion: "Hindu", name: "Vatsa" },
    { religion: "Hindu", name: "Vishwamitra" },
    { religion: "Hindu", name: "Yaska" },
    { religion: "Hindu", name: "Don't know / Not applicable" },
    { religion: "Jain", name: "Atri" },
    { religion: "Jain", name: "Kashyapa" },
    { religion: "Jain", name: "Gautama" },
    { religion: "Jain", name: "Don't know / Not applicable" },
  ],
}

export function getCommunitiesForReligion(religion: string): string[] {
  if (!religion) return []
  const matches = COMMUNITY_MASTER_DATA.communities
    .filter((c) => c.religion.toLowerCase() === religion.toLowerCase() || c.religion === "Other")
    .map((c) => c.name)

  const unique = Array.from(new Set(matches)).sort((a, b) => a.localeCompare(b))
  return unique
}

export function getSubcastesForCommunity(communityName: string, religion?: string): string[] {
  if (!communityName) return []
  const match = COMMUNITY_MASTER_DATA.communities.find(
    (c) =>
      c.name.toLowerCase() === communityName.toLowerCase() &&
      (!religion || c.religion.toLowerCase() === religion.toLowerCase()),
  )
  if (!match || !match.subcastes || match.subcastes.length === 0) return []
  return match.subcastes.slice().sort((a, b) => a.localeCompare(b))
}

export function getGotrasForReligion(religion?: string): string[] {
  const matches = COMMUNITY_MASTER_DATA.gotras
    .filter((g) => !g.religion || !religion || g.religion.toLowerCase() === religion.toLowerCase())
    .map((g) => g.name)

  const unique = Array.from(new Set(matches)).sort((a, b) => {
    if (a.includes("Don't know")) return 1
    if (b.includes("Don't know")) return -1
    return a.localeCompare(b)
  })
  return unique
}
