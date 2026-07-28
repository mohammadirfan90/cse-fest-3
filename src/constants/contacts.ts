export interface CoordinatorContact {
  coordinator: string;
  phone: string;
}

export const SEGMENT_CONTACTS: Record<string, CoordinatorContact> = {
  "software-project-showcase": {
    coordinator: "Mohammad Irfan",
    phone: "01400748802",
  },
  "iot-robotics-project-showcase": {
    coordinator: "Ahabab Murshed",
    phone: "01813028748",
  },
  "idea-showcase-contest": {
    coordinator: "Miftahul Jannat Trishna",
    phone: "01581637509",
  },
  "programming-contest": {
    coordinator: "Tariqul Huda",
    phone: "01931847414",
  },
  "datathon": {
    coordinator: "Shahriar Emon",
    phone: "01759137428",
  },
  "capture-the-flag": {
    coordinator: "Antu Debnath",
    phone: "01862101158",
  },
  "robo-soccer": {
    coordinator: "Shajid Hasan",
    phone: "01717236342",
  },
  "line-follower-robot-lfr": {
    coordinator: "Junayed Hassan Shuvo",
    phone: "01964607957",
  },
  "game-fest-valorant": {
    coordinator: "Fahim Muntasir",
    phone: "01610307678",
  },
  "game-fest-fc-25": {
    coordinator: "Md. Redwan Hossain",
    phone: "01314018801",
  },
};


export const DEFAULT_CONTACT: CoordinatorContact = {
  coordinator: "Coordination Desk",
  phone: "+8801937309224",
};

export function getCompetitionContact(comp?: { id?: string; name?: string; slug?: string }): CoordinatorContact {
  if (!comp) return DEFAULT_CONTACT;
  
  // 1. Try matching by slug
  if (comp.slug && SEGMENT_CONTACTS[comp.slug.toLowerCase()]) {
    return SEGMENT_CONTACTS[comp.slug.toLowerCase()];
  }
  
  // 2. Try matching by id
  if (comp.id && SEGMENT_CONTACTS[comp.id.toLowerCase()]) {
    return SEGMENT_CONTACTS[comp.id.toLowerCase()];
  }
  
  // 3. Try matching by normalized name
  if (comp.name) {
    const normalizedName = comp.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (SEGMENT_CONTACTS[normalizedName]) {
      return SEGMENT_CONTACTS[normalizedName];
    }
    
    // Check partial name match as fallback
    for (const key of Object.keys(SEGMENT_CONTACTS)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return SEGMENT_CONTACTS[key];
      }
    }
  }
  
  return DEFAULT_CONTACT;
}
