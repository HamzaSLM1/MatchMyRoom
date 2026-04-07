const questions = [
  // University (FIRST — determines theme)
  { id: "university", question: "Are you a McGill or Concordia student?", icon: "🏫", options: ["McGill", "Concordia"] },

  // Housing situation (SECOND — determines path)
  { id: "hasApartment", question: "Do you already have an apartment in Montréal?", icon: "🏠", options: ["Yes, I have a place", "No, I'm looking for one"] },

  // ── HAS APARTMENT branch ──
  { id: "apartmentLocation", question: "Where is your apartment located?", icon: "📍", options: ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Côte-des-Neiges", "Mile End", "Other"], allowCustom: true, conditional: { dependsOn: "hasApartment", showIfValue: 0 } },
  { id: "apartmentRent", question: "Monthly rent per person (each roommate's share)?", icon: "💰", options: ["$700–$1000", "$1000–$1300", "$1300–$1500", "$1500+", "Custom amount"], allowCustom: true, conditional: { dependsOn: "hasApartment", showIfValue: 0 } },
  { id: "apartmentRooms", question: "How many bedrooms does your apartment have?", icon: "🛏️", options: ["Studio / 1.5", "2 bedrooms", "3 bedrooms", "4+ bedrooms"], conditional: { dependsOn: "hasApartment", showIfValue: 0 } },
  { id: "spotsAvailable", question: "How many roommates are you looking for?", icon: "👥", options: ["1 roommate", "2 roommates", "3+ roommates"], conditional: { dependsOn: "hasApartment", showIfValue: 0 } },
  { id: "apartmentAvailable", question: "When is your place available?", icon: "📅", options: ["August", "January", "May", "ASAP / Now"], conditional: { dependsOn: "hasApartment", showIfValue: 0 } },

  // ── LOOKING FOR PLACE branch ──
  { id: "livingLocation", question: "Where are you planning to live?", icon: "🏘️", options: ["University Residence", "Off-campus apartment/house"], conditional: { dependsOn: "hasApartment", hideIfValue: 0 } },

  // McGill residences (McGill + Residence + looking)
  { id: "mcgillResidence", question: "Which McGill residence?", icon: "🏠", options: ["Upper Rez (Gardner, McConnell, Molson)", "New Rez", "Solin Hall", "La Citadelle", "RVC", "Campus 1", "Carrefour Sherbrooke"], conditional: [{ dependsOn: "university", showIfValue: 0 }, { dependsOn: "livingLocation", showIfValue: 0 }, { dependsOn: "hasApartment", hideIfValue: 0 }] },

  // Concordia residences (Concordia + Residence + looking)
  { id: "concordiaResidence", question: "Which Concordia residence?", icon: "🏠", options: ["Grey Nuns Residence", "Hingston Hall"], conditional: [{ dependsOn: "university", showIfValue: 1 }, { dependsOn: "livingLocation", showIfValue: 0 }, { dependsOn: "hasApartment", hideIfValue: 0 }] },

  // Year
  { id: "year", question: "What year are you in?", icon: "📆", options: ["U0", "U1", "U2", "U3", "U4", "Masters", "PhD", "Other"] },

  // Dealbreakers
  { id: "gender", question: "What is your gender?", icon: "👤", options: ["Male", "Female", "Prefer not to say"] },
  { id: "genderPreference", question: "Preferred roommate gender?", icon: "🤝", options: ["Male", "Female", "No preference"] },
  { id: "age", question: "What is your age?", icon: "🎂", options: ["18-20", "21-23", "24-26", "27+"] },
  { id: "program", question: "What are you studying?", icon: "🎓", options: ["Arts", "Science", "Engineering", "Commerce/Management", "Medicine", "Law", "Education", "Music", "Other"], allowCustom: true },

  // Budget (hidden if university residence OR already has apartment)
  { id: "budget", question: "Monthly rent budget (your share)?", icon: "💰", options: ["$700–$1000", "$1000–$1300", "$1300–$1500", "$1500+", "Custom amount"], allowCustom: true, conditional: [{ dependsOn: "livingLocation", hideIfValue: 0 }, { dependsOn: "hasApartment", hideIfValue: 0 }] },

  // Location preference (hidden if university residence OR already has apartment)
  { id: "location", question: "Preferred area in Montréal?", icon: "📍", options: ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Côte-des-Neiges", "Mile End", "Flexible / no preference"], conditional: [{ dependsOn: "livingLocation", hideIfValue: 0 }, { dependsOn: "hasApartment", hideIfValue: 0 }] },

  { id: "religion", question: "Religion or spiritual preference?", icon: "🕊️", options: ["No preference", "Christian", "Muslim", "Jewish", "Hindu", "Atheist/Agnostic", "Other"], allowCustom: true },

  // Lifestyle Compatibility
  { id: "sleepSchedule", question: "What's your typical sleep schedule?", icon: "🌙", options: ["Early bird (before 10pm)", "Night owl (after midnight)", "Somewhere in between", "Irregular / varies"] },
  { id: "noise", question: "Your ideal noise level at home?", icon: "🔊", options: ["Library silence", "Background music is fine", "I like it lively", "Depends on the day"] },
  { id: "guests", question: "How do you feel about having guests over?", icon: "🚪", options: ["Rarely / never", "Occasionally with notice", "Friends welcome anytime", "The more the merrier"] },
  { id: "study", question: "Where do you usually study?", icon: "📚", options: ["Always at home", "Libraries & cafés", "Mix of both", "I study on the go"] },
  { id: "dietary", question: "Any dietary considerations?", icon: "🍽️", options: ["None", "Vegetarian", "Vegan", "Halal/Kosher", "Allergies"] },
  { id: "language", question: "Preferred language at home?", icon: "🗣️", options: ["English", "French", "Bilingual", "No preference"] },

  // Move-in date (hidden for "has apartment" users — they answer apartmentAvailable instead)
  { id: "moveIn", question: "When are you looking to move in?", icon: "📅", options: ["August", "January", "May", "ASAP / Flexible"], conditional: { dependsOn: "hasApartment", hideIfValue: 0 } },
];

export default questions;
