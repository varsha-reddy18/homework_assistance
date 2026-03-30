function loadUser(){
  const user = localStorage.getItem("user_id") || "Student";
  const userNameEl = document.getElementById("userName");
  if (userNameEl) userNameEl.innerText = user;
}
function logout(){
  localStorage.clear();
  window.location.href = "login.html";
}
window.addEventListener("load", loadUser);

/* ================= SECTION SWITCH ================= */
function showSection(id){
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

let isLoading = false;

function updateStreak(){
  const today = new Date().toDateString();
  let lastLogin = localStorage.getItem("lastLoginDate");
  let streak = parseInt(localStorage.getItem("streak")) || 0;
  if(lastLogin !== today){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streak = (lastLogin === yesterday.toDateString()) ? streak + 1 : 1;
    localStorage.setItem("lastLoginDate", today);
    localStorage.setItem("streak", streak);
  }
  const el = document.getElementById("streakCount");
  if(el) el.innerText = streak;
}

/* ================= SUBJECT CHAT SYSTEM ================= */
let selectedSubject = "";
let currentChatId = null;

function openSubject(subject){
  selectedSubject = subject;
  showSection("ask");
  let savedChat = localStorage.getItem(subject + "_currentChatId");
  if(savedChat){
    currentChatId = savedChat;
  } else {
    currentChatId = "chat_" + Date.now();
    localStorage.setItem(subject + "_currentChatId", currentChatId);
    localStorage.setItem(subject + "_" + currentChatId, JSON.stringify([]));
  }
  loadChat(currentChatId);
  renderChatList();
}

function createNewChat(){
  if(!selectedSubject){ alert("Please select a subject first!"); return; }
  const chatId = "chat_" + Date.now();
  currentChatId = chatId;
  localStorage.setItem(selectedSubject + "_currentChatId", chatId);
  localStorage.setItem(selectedSubject + "_" + chatId, JSON.stringify([]));
  document.getElementById("chatArea").innerHTML = `<div class="subject-banner">📘 ${selectedSubject} Mode Activated</div>`;
  renderChatList();
}

function renderChatList(){
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = "";
  if(!selectedSubject){
    chatList.innerHTML = `<div class="chat-empty">Select a subject first</div>`;
    return;
  }
  Object.keys(localStorage).forEach(key => {
    if(key.startsWith(selectedSubject + "_chat_")){
      const chatId = key.replace(selectedSubject + "_", "");
      chatList.innerHTML += `<div class="chat-item ${chatId === currentChatId ? 'active' : ''}" onclick="loadChat('${chatId}')">💬 ${selectedSubject} Chat ${chatId.slice(-4)}</div>`;
    }
  });
}

function loadChat(chatId){
  currentChatId = chatId;
  localStorage.setItem(selectedSubject + "_currentChatId", chatId);
  let chatData = JSON.parse(localStorage.getItem(selectedSubject + "_" + chatId)) || [];
  let chatArea = document.getElementById("chatArea");
  chatArea.innerHTML = `<div class="subject-banner">📘 ${selectedSubject} Mode Activated</div>`;
  chatData.forEach(msg => {
    chatArea.innerHTML += `<div class="user-msg"><div class="msg-text">${msg.q}</div></div><div class="ai-msg">${msg.a}</div>`;
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

/* ================================================================
   UNIFIED Q&A DATABASE  (object-based for fast lookup)
   ================================================================ */
const qaDatabase = {
  math: {
    "2+2": "2 + 2 = 4", "2 + 2": "2 + 2 = 4", "2+2=": "2 + 2 = 4",
    "what is pi": "π (Pi) ≈ 3.14159. It is the ratio of a circle's circumference to its diameter.",
    "value of pi": "The value of π (Pi) ≈ 3.14159265...",
    "what is pythagoras": "Pythagoras theorem: In a right-angled triangle, a² + b² = c², where c is the hypotenuse.",
    "pythagoras theorem": "Pythagoras theorem: a² + b² = c²",
    "what is (a+b)2": "(a+b)² = a² + 2ab + b²",
    "(a+b)^2": "(a+b)² = a² + 2ab + b²",
    "a+b whole square": "(a+b)² = a² + 2ab + b²",
    "what is (a-b)2": "(a-b)² = a² - 2ab + b²",
    "(a-b)^2": "(a-b)² = a² - 2ab + b²",
    "solve 2x+3=11": "2x + 3 = 11 → 2x = 8 → x = 4",
    "2x+3=11": "2x + 3 = 11 → 2x = 8 → x = 4",
    "x+7=12": "x + 7 = 12 → x = 5",
    "5x=20": "5x = 20 → x = 4",
    "quadratic formula": "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
    "what is quadratic": "A quadratic equation has the form ax² + bx + c = 0.",
    "quadratic equation": "A quadratic equation: ax² + bx + c = 0. Solve by factoring or quadratic formula.",
    "area of circle": "Area of a circle = πr²  (r = radius)",
    "area of rectangle": "Area of rectangle = length × breadth",
    "area of triangle": "Area of triangle = ½ × base × height",
    "perimeter of rectangle": "Perimeter of rectangle = 2(l + b)",
    "circumference of circle": "Circumference = 2πr",
    "what is hcf": "HCF = Highest Common Factor — the largest number dividing two numbers exactly. E.g. HCF(12,18) = 6",
    "what is lcm": "LCM = Least Common Multiple — smallest number divisible by both. E.g. LCM(4,6) = 12",
    "lcm of 4 and 6": "LCM of 4 and 6 = 12",
    "hcf of 12 and 18": "HCF of 12 and 18 = 6",
    "what is mean": "Mean = Sum of all values ÷ Number of values",
    "what is median": "Median = The middle value when data is arranged in order.",
    "what is mode": "Mode = The value that appears most often in a data set.",
    "what is probability": "Probability = Favourable outcomes ÷ Total outcomes. Range: 0 to 1.",
    "what is percentage": "Percentage = (Part ÷ Whole) × 100",
    "simple interest formula": "Simple Interest = (P × T × R) / 100",
    "what is fraction": "A fraction represents a part of a whole. Example: 3/4 means 3 parts out of 4.",
    "what is ratio": "A ratio compares two quantities. Example: 3:2 means 3 for every 2.",
    "what is prime number": "A prime number is divisible only by 1 and itself. Examples: 2, 3, 5, 7, 11...",
    "prime number": "A prime number is divisible only by 1 and itself. Examples: 2, 3, 5, 7, 11...",
    "what is even number": "Even numbers are divisible by 2. Examples: 2, 4, 6, 8...",
    "what is odd number": "Odd numbers are NOT divisible by 2. Examples: 1, 3, 5, 7...",
    "square root of 144": "√144 = 12", "square root of 25": "√25 = 5", "square root of 64": "√64 = 8",
    "what is slope": "Slope = (y₂ - y₁) / (x₂ - x₁)",
    "slope formula": "Slope = (y₂ - y₁) / (x₂ - x₁)",
    "what is matrix": "A matrix is a rectangular array of numbers arranged in rows and columns.",
    "matrix": "A matrix is a rectangular array of numbers.",
    "mean": "Mean = Sum of all values ÷ Number of values",
    "probability": "Probability = Favourable outcomes ÷ Total outcomes. Range: 0 to 1.",
  },
  physics: {
    "what is force": "Force = Mass × Acceleration (F = ma). Unit: Newton (N).",
    "force": "Force = Mass × Acceleration (F = ma). Unit: Newton (N).",
    "formula for force": "F = ma (Force = mass × acceleration). Unit: Newton.",
    "what is velocity": "Velocity is speed in a specific direction. Unit: m/s.",
    "velocity": "Velocity is speed in a specific direction. Unit: m/s.",
    "what is speed": "Speed = Distance ÷ Time. Unit: m/s.",
    "speed formula": "Speed = Distance ÷ Time",
    "what is acceleration": "Acceleration = Change in Velocity ÷ Time  (a = (v-u)/t). Unit: m/s².",
    "acceleration": "Acceleration = Change in Velocity ÷ Time. a = (v-u)/t. Unit: m/s².",
    "what is newton first law": "An object remains at rest or in motion unless acted upon by an external force.",
    "newton first law": "An object remains at rest or in motion unless acted upon by an external force.",
    "newton's first law": "An object remains at rest or in motion unless acted upon by an external force.",
    "what is newton second law": "F = ma. Force equals mass times acceleration.",
    "newton second law": "F = ma — Force = mass × acceleration.",
    "newton's second law": "F = ma — Force = mass × acceleration.",
    "what is newton third law": "For every action there is an equal and opposite reaction.",
    "newton third law": "For every action there is an equal and opposite reaction.",
    "newton's third law": "For every action there is an equal and opposite reaction.",
    "newton's laws": "1st Law: Inertia — objects stay at rest/motion unless force acts.\n2nd Law: F = ma\n3rd Law: Every action has equal & opposite reaction.",
    "newtons laws": "1st Law: Inertia — objects stay at rest/motion unless force acts.\n2nd Law: F = ma\n3rd Law: Every action has equal & opposite reaction.",
    "what is gravity": "Gravity is the force attracting objects toward Earth. g = 9.8 m/s². F = mg.",
    "gravity": "Gravity is the force attracting objects toward Earth. g = 9.8 m/s². F = mg.",
    "what is g": "g = acceleration due to gravity = 9.8 m/s² on Earth's surface.",
    "value of g": "g = 9.8 m/s² (approximately 10 m/s²) on Earth.",
    "what is work": "Work = Force × Distance. W = Fd. Unit: Joule (J).",
    "work formula": "Work = Force × Distance. Unit: Joule.",
    "what is power": "Power = Work ÷ Time. P = W/T. Unit: Watt (W).",
    "power formula": "Power = Work ÷ Time. Unit: Watt (W).",
    "what is energy": "Energy = ability to do work. KE = ½mv², PE = mgh. Unit: Joule.",
    "energy": "Energy = ability to do work. KE = ½mv², PE = mgh. Unit: Joule.",
    "what is pressure": "Pressure = Force ÷ Area. P = F/A. Unit: Pascal (Pa).",
    "pressure": "Pressure = Force ÷ Area. P = F/A. Unit: Pascal (Pa).",
    "ohm's law": "Ohm's Law: V = IR (Voltage = Current × Resistance).",
    "what is ohms law": "Ohm's Law: V = IR. Voltage = Current × Resistance. Unit of R: Ohm (Ω).",
    "speed of light": "Speed of light = 3 × 10⁸ m/s.",
    "speed of sound": "Speed of sound in air ≈ 340 m/s. Fastest in solids.",
    "what is reflection": "Reflection = bouncing back of light when it hits a surface.",
    "what is refraction": "Refraction = bending of light as it passes from one medium to another.",
    "unit of force": "SI unit of force = Newton (N).",
    "unit of energy": "SI unit of energy = Joule (J).",
    "unit of power": "SI unit of power = Watt (W).",
    "unit of pressure": "SI unit of pressure = Pascal (Pa).",
    "unit of resistance": "SI unit of resistance = Ohm (Ω).",
    "what is resistance": "Resistance opposes current flow. R = V/I. Unit: Ohm (Ω).",
    "resistance": "Resistance = opposition to current flow. R = V/I. Unit: Ohm (Ω).",
  },
  chemistry: {
    "what is atom": "An atom is the smallest unit of matter. Has protons (+), neutrons (neutral), electrons (-).",
    "atom": "An atom is the smallest unit of matter. Has protons (+), neutrons (neutral), electrons (-).",
    "what is molecule": "A molecule is a group of atoms bonded together. E.g. H₂O = 2 hydrogen + 1 oxygen.",
    "molecule": "A molecule is a group of atoms bonded together.",
    "what is element": "An element is a pure substance made of one type of atom. E.g. Gold (Au), Iron (Fe).",
    "what is compound": "A compound forms when two or more elements chemically combine. E.g. H₂O, NaCl.",
    "compound": "A compound forms when two or more elements chemically combine.",
    "formula of water": "Water = H₂O",
    "formula of salt": "Salt = NaCl (Sodium Chloride)",
    "formula of co2": "Carbon Dioxide = CO₂",
    "what is ph": "pH 0–14. pH < 7 = Acid, pH = 7 = Neutral, pH > 7 = Base.",
    "ph of water": "pH of water = 7 (Neutral)",
    "what is acid": "An acid donates H⁺ ions. Examples: HCl, H₂SO₄. pH < 7.",
    "acid": "An acid donates H⁺ ions. Examples: HCl, H₂SO₄. pH < 7.",
    "what is base": "A base accepts H⁺ ions. Examples: NaOH. pH > 7.",
    "base": "A base accepts H⁺ ions. Examples: NaOH. pH > 7.",
    "what is periodic table": "The periodic table has 118 elements organized by atomic number.",
    "periodic table": "The periodic table has 118 elements organized by atomic number.",
    "what is valency": "Valency = combining capacity of an element. H=1, O=2, N=3, C=4.",
    "valency": "Valency = combining capacity of an element. H=1, O=2, N=3, C=4.",
    "what is oxidation": "Oxidation = loss of electrons. OIL RIG: Oxidation Is Loss.",
    "oxidation": "Oxidation = loss of electrons.",
    "what is reduction": "Reduction = gain of electrons. OIL RIG: Reduction Is Gain.",
    "reduction": "Reduction = gain of electrons.",
    "what is ionic bond": "Ionic bond forms between metal + non-metal. Example: NaCl.",
    "ionic bond": "Ionic bond: metal + non-metal. Example: NaCl (Na⁺ + Cl⁻).",
    "what is covalent bond": "Covalent bond forms between two non-metals sharing electrons. Example: H₂O.",
    "covalent bond": "Covalent bond = two non-metals sharing electrons. Example: H₂O, CO₂.",
    "atomic number of carbon": "Atomic number of Carbon = 6.",
    "atomic number of oxygen": "Atomic number of Oxygen = 8.",
    "what is mixture": "A mixture contains substances NOT chemically combined. Example: Salt + water.",
    "what is solution": "A solution is a homogeneous mixture — solute dissolved in solvent. Example: Saltwater.",
  },
  biology: {
    "what is cell": "A cell is the basic unit of life. Plant cells have cell wall + chloroplasts; animal cells have centrioles.",
    "cell": "A cell is the basic unit of life. Plant cells have cell wall; animal cells don't.",
    "what is photosynthesis": "Photosynthesis: 6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂. Occurs in chloroplasts.",
    "photosynthesis": "Photosynthesis: 6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂.",
    "photosynthesis equation": "6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂",
    "what is respiration": "Aerobic respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy (ATP).",
    "respiration": "Aerobic respiration: glucose + oxygen → carbon dioxide + water + ATP energy.",
    "what is dna": "DNA = Deoxyribonucleic Acid. Carries the genetic information of organisms.",
    "dna": "DNA = Deoxyribonucleic Acid. Carries genetic information. Humans have 46 chromosomes.",
    "full form of dna": "DNA = Deoxyribonucleic Acid",
    "what is gene": "A gene is a segment of DNA that codes for a specific protein or trait.",
    "how many chromosomes": "Humans have 46 chromosomes (23 pairs).",
    "what is mitosis": "Mitosis = cell division producing 2 identical daughter cells. Used for growth.",
    "what is meiosis": "Meiosis = cell division producing 4 genetically different cells. Used in reproduction.",
    "what is enzyme": "An enzyme is a biological catalyst that speeds up reactions. E.g. Amylase, Pepsin.",
    "enzyme": "An enzyme is a biological catalyst. E.g. Amylase (starch), Pepsin (protein).",
    "what is tissue": "A tissue is a group of similar cells working together. E.g. Muscle tissue.",
    "tissue": "A tissue is a group of similar cells. E.g. Muscle tissue, Nerve tissue.",
    "what is organ": "An organ is a group of tissues with a specific function. E.g. Heart, Liver.",
    "organ": "An organ is a group of tissues doing a specific job. E.g. Heart, Liver, Kidney.",
    "largest organ": "The largest organ in the human body is the Skin.",
    "largest gland": "The largest gland is the Liver.",
    "what is ecosystem": "An ecosystem = living organisms interacting with their environment.",
    "ecosystem": "An ecosystem includes all living + non-living things in an environment.",
    "what is digestion": "Digestion: Mouth → Oesophagus → Stomach → Small Intestine → Large Intestine.",
    "digestion": "Digestion: Mouth → Oesophagus → Stomach → Small Intestine → Large Intestine.",
    "what is blood": "Blood: RBC carries O₂, WBC fights infection, Platelets clot blood.",
    "blood": "Blood: RBC carries O₂, WBC fights infection, Platelets clot blood.",
    "what is heart": "Heart has 4 chambers: 2 Atria + 2 Ventricles. Pumps blood around the body.",
    "what is mitochondria": "Mitochondria = powerhouse of the cell. Produces ATP energy via respiration.",
    "mitochondria": "Mitochondria = powerhouse of the cell. Produces ATP energy.",
    "powerhouse of cell": "Mitochondria is the powerhouse of the cell.",
  },
  english: {
    "what is noun": "A noun names a person, place, thing, or idea. Types: Common, Proper, Abstract, Collective.",
    "noun": "A noun names a person, place, thing, or idea. Types: Common, Proper, Abstract, Collective.",
    "what is verb": "A verb expresses an action or state. Examples: run, jump, is, think.",
    "verb": "A verb expresses an action or state. Examples: run, jump, is, think.",
    "what is adjective": "An adjective describes a noun. Examples: big, red, happy, beautiful.",
    "adjective": "An adjective describes a noun. Examples: big, red, happy, beautiful.",
    "what is adverb": "An adverb modifies a verb/adjective/adverb. Examples: quickly, very, silently.",
    "adverb": "An adverb modifies a verb or adjective. Examples: quickly, very, silently.",
    "what is pronoun": "A pronoun replaces a noun. Examples: I, you, he, she, it, they, we.",
    "pronoun": "A pronoun replaces a noun. Examples: I, you, he, she, it, they, we.",
    "what is preposition": "A preposition shows relationship. Examples: in, on, at, under, between.",
    "preposition": "A preposition shows relationship. Examples: in, on, at, under, between.",
    "what is conjunction": "A conjunction joins words or clauses. FANBOYS: For, And, Nor, But, Or, Yet, So.",
    "conjunction": "A conjunction joins words or clauses. FANBOYS: For, And, Nor, But, Or, Yet, So.",
    "what is interjection": "An interjection expresses emotion. Examples: Wow!, Ouch!, Hurray!",
    "what is article": "Articles: 'a' (consonant sound), 'an' (vowel sound), 'the' (specific noun).",
    "articles": "Articles: A, An, The. 'a' before consonant, 'an' before vowel sounds.",
    "what is tense": "Tense shows time of action. 3 main tenses: Present, Past, Future.",
    "tense": "Tense shows time of action. Present / Past / Future.",
    "what is active voice": "Active voice: subject performs action. Example: Ram ate food.",
    "active voice": "Active voice: subject does the action. Example: The dog chased the cat.",
    "what is passive voice": "Passive voice: subject receives action. Example: Food was eaten by Ram.",
    "passive voice": "Passive voice: subject receives the action. Example: The cat was chased by the dog.",
    "what is synonym": "A synonym has similar meaning. Fast → Quick, Happy → Joyful.",
    "synonym": "A synonym has similar meaning. Fast → Quick, Happy → Joyful.",
    "what is antonym": "An antonym has opposite meaning. Fast → Slow, Happy → Sad.",
    "antonym": "An antonym has opposite meaning. Fast → Slow, Happy → Sad.",
    "what is sentence": "A sentence = Subject + Verb + (Object). Types: Simple, Compound, Complex.",
    "sentence": "A sentence = Subject + Verb + (Object). Types: Simple, Compound, Complex.",
    "parts of speech": "8 Parts of Speech: Noun, Pronoun, Verb, Adjective, Adverb, Preposition, Conjunction, Interjection.",
    "what is simile": "A simile compares using 'like' or 'as'. Example: She runs like the wind.",
    "what is metaphor": "A metaphor compares without 'like/as'. Example: Life is a journey.",
  },
  telugu: {
    "నామవాచకం అంటే ఏమిటి": "నామవాచకం (Noun): వ్యక్తి, స్థలం, వస్తువు పేరు. ఉదా: రాముడు, హైదరాబాద్.",
    "నామవాచకం": "నామవాచకం (Noun): వ్యక్తి, స్థలం, వస్తువు పేరు.",
    "క్రియ అంటే ఏమిటి": "క్రియ (Verb): చర్యను చూపించే పదం. ఉదా: చదువు, ఆడు, నడు.",
    "క్రియ": "క్రియ (Verb): చర్యను చూపించే పదం.",
    "విశేషణం": "విశేషణం (Adjective): నామవాచకాన్ని వివరించే పదం. ఉదా: పెద్ద, చిన్న.",
  },
  hindi: {
    "संज्ञा क्या है": "संज्ञा (Noun): किसी व्यक्ति, स्थान या वस्तु का नाम। उदा: राम, दिल्ली, किताब।",
    "संज्ञा": "संज्ञा (Noun): व्यक्ति, स्थान या वस्तु का नाम।",
    "क्रिया क्या है": "क्रिया (Verb): काम को दर्शाने वाला शब्द। उदा: खाना, पीना, पढ़ना।",
    "क्रिया": "क्रिया (Verb): काम को दर्शाने वाला शब्द।",
    "विशेषण": "विशेषण (Adjective): संज्ञा को बताने वाला शब्द। उदा: अच्छा, बुरा, सुंदर।",
  },
};

/* ================================================================
   SUBJECT MAP
   ================================================================ */
const SUBJECT_MAP = {
  "maths":"math", "math":"math", "physics":"physics",
  "chemistry":"chemistry", "biology":"biology", "english":"english",
  "telugu":"telugu", "hindi":"hindi", "social":"english", "computer":"english",
};

/* ================================================================
   NORMALIZE  — strips noise for reliable matching
   ================================================================ */
function normalizeQ(q) {
  return q.toLowerCase().trim()
    .replace(/['"''""]/g, "")
    .replace(/[=?!.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ================================================================
   LOOKUP  — checks qaDatabase with exact + partial match
   ================================================================ */
function lookupLocal(question) {
  if (!selectedSubject) return null;
  const subjectKey = SUBJECT_MAP[selectedSubject.toLowerCase()] || selectedSubject.toLowerCase();
  const db = qaDatabase[subjectKey];
  if (!db) return null;

  const q = normalizeQ(question);
  const qNoSpace = q.replace(/\s+/g, "");

  // 1. Exact match
  if (db[q]) return db[q];

  // 2. Exact match without spaces (catches "2+2" vs "2 + 2")
  for (const key of Object.keys(db)) {
    if (key.replace(/\s+/g, "") === qNoSpace) return db[key];
  }

  // 3. Partial match — question contains key OR key contains question
  for (const key of Object.keys(db)) {
    if (q.includes(key) || key.includes(q)) return db[key];
  }

  // 4. Word overlap — any key word appears in question
  for (const key of Object.keys(db)) {
    const keyWords = key.split(" ").filter(w => w.length > 3);
    if (keyWords.length > 0 && keyWords.every(w => q.includes(w))) return db[key];
  }

  return null;
}

/* ================================================================
   MATH EVALUATOR
   ================================================================ */
function tryMathEval(expr) {
  try {
    const cleaned = normalizeQ(expr);
    const safe = cleaned.replace(/[^0-9+\-*/.()%^ ]/g, "");
    if (!safe.trim()) return null;
    const result = Function('"use strict"; return (' + safe.replace(/\^/g,"**") + ')')();
    if (typeof result === "number" && isFinite(result)) {
      const r = Math.round(result * 1e10) / 1e10;
      return `📘 Expression: ${cleaned}<br>BODMAS Result → ${r}<br>✅ Answer: ${r}`;
    }
  } catch(e) {}
  return null;
}

function isMathExpr(q) {
  return /^[\d\s+\-*/().^%=?]+$/.test(q.replace(/['"]/g,"").trim());
}

/* ================================================================
   FORMAT + DISPLAY
   ================================================================ */
function formatAnswer(text) {
  return text
    .replace(/\n\n/g,"<br><br>").replace(/\n/g,"<br>")
    .replace(/\*\*(.*?)\*\*/g,"<b>$1</b>");
}

function displayAnswer(chatArea, question, answer, loading) {
  if (loading) loading.remove();
  chatArea.innerHTML += `<div class="ai-msg">🤖 ${answer}</div>`;
  speakText(answer.replace(/<br>/g," ").replace(/<[^>]*>/g,""));
  const key = selectedSubject + "_" + currentChatId;
  const data = JSON.parse(localStorage.getItem(key)) || [];
  data.push({ q: question, a: answer });
  localStorage.setItem(key, JSON.stringify(data));
  renderChatList();
  chatArea.scrollTop = chatArea.scrollHeight;
}

const offlineTips = {
  math:      "💡 Try: 'What is Pythagoras theorem?' or type a sum like '15 × 4'",
  physics:   "💡 Try: 'What is force?' or 'What is Newton's first law?'",
  chemistry: "💡 Try: 'What is an atom?' or 'What is a covalent bond?'",
  biology:   "💡 Try: 'What is photosynthesis?' or 'What is mitochondria?'",
  english:   "💡 Try: 'What is a noun?' or 'What is active voice?'",
  telugu:    "💡 అడగండి: 'నామవాచకం అంటే ఏమిటి?'",
  hindi:     "💡 पूछें: 'संज्ञा क्या है?'",
};

/* ================================================================
   ASK AI  —  Priority: local DB → math eval → backend → API → tip
   ================================================================ */
async function askAI() {
  const questionInput = document.getElementById("question");
  const fileInput     = document.getElementById("imageInput");
  const question      = questionInput.value.trim();

  if (!question) return;
  if (!selectedSubject) { alert("Please select a subject first!"); return; }
  if (fileInput.files.length > 0) { await uploadImage(); return; }

  const chatArea = document.getElementById("chatArea");
  chatArea.innerHTML += `<div class="user-msg"><div class="msg-text">${question}</div></div>`;

  const loading = document.createElement("div");
  loading.className = "ai-msg";
  loading.innerHTML = "🤖 Thinking...";
  chatArea.appendChild(loading);
  chatArea.scrollTop = chatArea.scrollHeight;
  questionInput.value = "";

  /* ── 1. Math expression → evaluate instantly ── */
  if (isMathExpr(question)) {
    const r = tryMathEval(question);
    if (r) { displayAnswer(chatArea, question, r, loading); return; }
  }

  /* ── 2. Local database lookup → instant answer ── */
  const local = lookupLocal(question);
  if (local) { displayAnswer(chatArea, question, formatAnswer(local), loading); return; }

  /* ── 3. file:// — no network allowed by browser ── */
  if (window.location.protocol === "file:") {
    const sk = SUBJECT_MAP[selectedSubject.toLowerCase()] || selectedSubject.toLowerCase();
    displayAnswer(chatArea, question, offlineTips[sk] || "💡 Please ask a specific question about " + selectedSubject, loading);
    return;
  }

  /* ── 4. Backend server ── */
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch("http://127.0.0.1:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, subject: selectedSubject, session_id: currentChatId, user_id: localStorage.getItem("user_id") || null }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json();
    const ans = data.answer || "";
    /* If backend returns empty / error string, fall through to API */
    if (ans && !ans.includes("❌") && !ans.includes("No answer") && ans.trim().length > 5) {
      displayAnswer(chatArea, question, formatAnswer(ans), loading);
      return;
    }
    throw new Error("backend_empty");
  } catch (e) {
    /* ── 5. Anthropic API ── */
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are a school-level tutor for ${selectedSubject}. Answer clearly and simply.`,
          messages: [{ role: "user", content: question }],
        }),
      });
      if (!res.ok) throw new Error("api_" + res.status);
      const data = await res.json();
      const aiText = data.content.map(i => i.type==="text" ? i.text : "").join("\n");
      displayAnswer(chatArea, question, formatAnswer(aiText), loading);
    } catch (apiErr) {
      /* ── 6. All failed → tip ── */
      const sk = SUBJECT_MAP[selectedSubject.toLowerCase()] || selectedSubject.toLowerCase();
      displayAnswer(chatArea, question, offlineTips[sk] || "💡 Please ask a specific question about " + selectedSubject, loading);
    }
  }
}

/* ================= VOICE INPUT ================= */
let recognition = null;
let isListening = false;
let currentSpeech = null;
let voiceEnabled = true;

const SUBJECT_LANG_MAP = {
  "Telugu":"te-IN","Hindi":"hi-IN","English":"en-IN","Maths":"en-IN",
  "Physics":"en-IN","Chemistry":"en-IN","Biology":"en-IN","Social":"en-IN","Computer":"en-IN",
};

function getMicBtn() {
  return document.querySelector(".mic-btn") || document.querySelector('[onclick="startVoice()"]') || document.querySelector('[onclick*="startVoice"]');
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("⚠️ Voice input not supported. Use Chrome or Edge."); return; }
  if (recognition) { try { recognition.stop(); } catch(e) {} }
  recognition = new SR();
  recognition.lang = SUBJECT_LANG_MAP[selectedSubject] || "en-IN";
  recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
  isListening = true;
  recognition.onstart = () => { const b=getMicBtn(); if(b){b.style.color="red";b.title="🎤 Listening...";} };
  recognition.onresult = (e) => {
    document.getElementById("question").value = e.results[0][0].transcript;
    isListening = false;
    const b=getMicBtn(); if(b){b.style.color="";b.title="";}
  };
  recognition.onerror = (e) => {
    isListening = false;
    const b=getMicBtn(); if(b){b.style.color="";b.title="";}
    if(e.error==="not-allowed") alert("⚠️ Microphone access denied.");
    else if(e.error==="network") alert("⚠️ Network error for voice.");
    else if(e.error!=="no-speech"&&e.error!=="aborted") alert("⚠️ Voice error: "+e.error);
  };
  recognition.onend = () => { isListening=false; const b=getMicBtn(); if(b){b.style.color="";b.title="";} };
  try { recognition.start(); } catch(e) { isListening=false; alert("⚠️ Could not start voice input."); }
}

function stopVoice() {
  if(recognition){try{recognition.stop();}catch(e){}}
  window.speechSynthesis.cancel(); isListening=false;
  const b=getMicBtn(); if(b){b.style.color="";b.title="";}
}

/* ================= SPEAK SYSTEM ================= */
let availableVoices = [];
function loadVoices() { availableVoices = window.speechSynthesis.getVoices(); }
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakText(text) {
  if (!voiceEnabled || !text || !text.trim()) return;
  window.speechSynthesis.cancel();
  const s = new SpeechSynthesisUtterance(text);
  let lang = "en-IN";
  if (/[\u0C00-\u0C7F]/.test(text)) lang = "te-IN";
  else if (/[\u0900-\u097F]/.test(text)) lang = "hi-IN";
  s.lang = lang; s.rate = 1; s.pitch = 1; s.volume = 1;
  const v = availableVoices.find(v=>v.lang===lang) || availableVoices.find(v=>v.lang.startsWith(lang.split("-")[0])) || availableVoices.find(v=>v.lang.startsWith("en"));
  if(v) s.voice = v;
  s.onerror = (e) => console.error("Speech error:", e.error);
  currentSpeech = s;
  window.speechSynthesis.speak(s);
}

function speakInput() {
  const t = document.getElementById("question").value.trim();
  if (!t) { alert("⚠️ Please type something first."); return; }
  speakText(t);
}

/* ================= IMAGE UPLOAD ================= */
document.getElementById("imageInput").addEventListener("change", function () {
  const file = this.files[0]; if (!file) return;
  let badge = document.getElementById("fileBadge");
  if (!badge) {
    badge = document.createElement("span"); badge.id = "fileBadge";
    badge.style.cssText = "background:#4CAF50;color:white;padding:3px 10px;border-radius:12px;font-size:12px;margin-right:6px;display:inline-flex;align-items:center;gap:5px;";
    document.querySelector(".chat-input-area").insertBefore(badge, document.getElementById("question"));
  }
  badge.innerHTML = `📎 ${file.name} <span onclick="clearFile()" style="cursor:pointer;font-weight:bold;margin-left:4px;">✕</span>`;
  if (!document.getElementById("question").value.trim())
    document.getElementById("question").placeholder = "Type your question about this file, then press ➤";
});

function clearFile() {
  document.getElementById("imageInput").value = "";
  const b = document.getElementById("fileBadge"); if(b) b.remove();
  document.getElementById("question").placeholder = "Ask anything...";
}

async function uploadImage() {
  const fileInput=document.getElementById("imageInput"), chat=document.getElementById("chatArea"),
        qi=document.getElementById("question"), file=fileInput.files[0], question=qi.value.trim();
  if (!file) { alert("⚠️ Please select an image or PDF first."); return; }
  if (!question) { qi.placeholder="⚠️ Please type your question first, then press ➤"; qi.focus(); return; }
  const allowed=["image/jpeg","image/jpg","image/png","image/bmp","image/webp","application/pdf"];
  if (!allowed.includes(file.type)) { alert("⚠️ Only JPG, PNG, BMP, WEBP, or PDF supported."); clearFile(); return; }
  if (file.size > 10*1024*1024) { alert("⚠️ File too large. Max 10MB."); clearFile(); return; }
  if (!selectedSubject) { alert("⚠️ Please select a subject first."); return; }

  chat.innerHTML += `<div class="user-msg"><div class="msg-text">📎 <b>${file.name}</b><br><small>❓ ${question}</small></div></div>`;
  const ld=document.createElement("div"); ld.className="ai-msg"; ld.innerHTML="🤖 Reading your file...";
  chat.appendChild(ld); chat.scrollTop=chat.scrollHeight;

  try {
    const fd=new FormData(); fd.append("file",file); fd.append("question",question);
    const res=await fetch("http://127.0.0.1:8000/ask-from-image",{method:"POST",body:fd});
    if (!res.ok) throw new Error("Server error: "+res.status);
    const data=await res.json(); ld.remove();
    if (data.extracted_text?.trim()) {
      const prev=data.extracted_text.length>250?data.extracted_text.slice(0,250)+"...":data.extracted_text;
      chat.innerHTML+=`<div class="ai-msg" style="font-size:0.82em;opacity:0.7;border-left:3px solid #aaa;padding-left:8px;">📄 <b>Extracted:</b><br>${prev}</div>`;
    }
    let ans=(data.answer||"⚠️ No answer received.").replace(/\n\n/g,"<br><br>").replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<b>$1</b>");
    chat.innerHTML+=`<div class="ai-msg">🤖 ${ans}</div>`;
    speakText(ans.replace(/<[^>]*>/g,""));
    if(currentChatId&&selectedSubject){
      const k=selectedSubject+"_"+currentChatId, d=JSON.parse(localStorage.getItem(k))||[];
      d.push({q:`📎 [${file.name}] ${question}`,a:ans}); localStorage.setItem(k,JSON.stringify(d)); renderChatList();
    }
  } catch(err) {
    ld.remove();
    chat.innerHTML+=`<div class="ai-msg" style="color:#e74c3c;">⚠️ ${err.message.includes("fetch")?"Cannot connect to server.":err.message}</div>`;
  }
  qi.value=""; qi.placeholder="Ask anything..."; clearFile(); chat.scrollTop=chat.scrollHeight;
}

/* ================= STUDY PLANNER ================= */
function generateStudyPlanner() {
  const name=document.getElementById("studentName").value.trim();
  const studentClass=document.getElementById("studentClass").value.trim();
  const date=document.getElementById("date").value;
  const goal=document.getElementById("studyGoal").value.trim();
  const marks=[
    {subject:"English",mark:parseFloat(document.getElementById("markEnglish").value)||0},
    {subject:"Maths",mark:parseFloat(document.getElementById("markMaths").value)||0},
    {subject:"Science",mark:parseFloat(document.getElementById("markScience").value)||0},
    {subject:"Social",mark:parseFloat(document.getElementById("markSocial").value)||0},
    {subject:"Computer",mark:parseFloat(document.getElementById("markComputer").value)||0},
    {subject:"Optional Subject",mark:parseFloat(document.getElementById("markOptional").value)||0}
  ];
  if(!name||!studentClass||!date){alert("⚠️ Please fill Student Name, Class, and Date.");return;}
  for(let i of marks){if(i.mark<0||i.mark>100){alert(`⚠️ Invalid marks for ${i.subject}.`);return;}}
  const avg=(marks.reduce((s,i)=>s+i.mark,0)/marks.length).toFixed(2);
  let perf="",pc="",tips=[],plan=[];
  if(avg>=90){perf="🌟 Excellent";pc="excellent-performance";tips=["Maintain your strong study routine.","Solve advanced-level questions regularly.","Take weekly mock tests to stay sharp.","Revise important concepts every weekend.","Avoid overconfidence and stay consistent."];plan=["📘 1 hour concept revision","🧠 45 mins mock test","📝 30 mins short notes","📚 30 mins weak topics"];}
  else if(avg>=75){perf="✅ Good";pc="good-performance";tips=["Consistency is key.","Focus on high-weight chapters.","Practice writing answers.","Revise weekly.","Take mini tests."];plan=["📘 1 hour revision","✍️ 45 mins practice","📚 30 mins revision","🎯 20 mins goals"];}
  else if(avg>=50){perf="⚠️ Average";pc="average-performance";tips=["Study daily.","Spend extra time on weak subjects.","Practice previous papers.","Use flashcards.","Small focused sessions."];plan=["📘 45 mins learning","✍️ 45 mins practice","🔁 30 mins revision","🧠 20 mins memorization"];}
  else{perf="❌ Poor";pc="poor-performance";tips=["Start with basics.","Short daily sessions.","Focus on weakest subjects.","Ask for help.","Practice simple questions first."];plan=["📘 30 mins basics","✍️ 30 mins easy practice","🔁 20 mins revision","🧠 20 mins formulas","📚 20 mins support"];}
  const sorted=[...marks].sort((a,b)=>a.mark-b.mark);
  const weak=sorted.slice(0,2), strong=[...marks].sort((a,b)=>b.mark-a.mark).slice(0,2);
  document.getElementById("plannerOutput").innerHTML=`<div class="planner-result-card">
    <div class="student-summary"><h2>👩‍🎓 ${name}'s Study Report</h2><p><b>Class:</b> ${studentClass}</p><p><b>Date:</b> ${date}</p><p><b>Goal:</b> ${goal||"None"}</p></div>
    <div class="performance-box ${pc}"><h2>${perf}</h2><p>Average: <b>${avg}%</b></p></div>
    <div class="marks-result-grid">${marks.map(i=>`<div class="subject-result-card"><h4>${i.subject}</h4><p>${i.mark}/100</p></div>`).join("")}</div>
    <div class="strength-weak-grid">
      <div class="analysis-box weak-box"><h3>📉 Weak</h3><ul><li>${weak[0].subject} (${weak[0].mark})</li><li>${weak[1].subject} (${weak[1].mark})</li></ul></div>
      <div class="analysis-box strong-box"><h3>📈 Strong</h3><ul><li>${strong[0].subject} (${strong[0].mark})</li><li>${strong[1].subject} (${strong[1].mark})</li></ul></div>
    </div>
    <div class="tips-plan-grid">
      <div class="tips-box"><h3>💡 Tips</h3><ul>${tips.map(t=>`<li>${t}</li>`).join("")}</ul></div>
      <div class="daily-plan-box"><h3>📅 Daily Plan</h3><ul>${plan.map(p=>`<li>${p}</li>`).join("")}</ul></div>
    </div>
    <div class="weekly-plan-box"><h3>🗓️ Weekly Strategy</h3><div class="weekly-grid">
      <div class="week-day">Mon<br><span>${weak[0].subject}</span></div><div class="week-day">Tue<br><span>${weak[1].subject}</span></div>
      <div class="week-day">Wed<br><span>Revision</span></div><div class="week-day">Thu<br><span>${strong[0].subject}</span></div>
      <div class="week-day">Fri<br><span>${strong[1].subject}</span></div><div class="week-day">Sat<br><span>Mock Test</span></div>
      <div class="week-day">Sun<br><span>Light Revision</span></div>
    </div></div></div>`;
}
function toggleComplete(el){el.style.textDecoration=el.style.textDecoration==="line-through"?"none":"line-through";}
function savePlanner(){alert("✅ Plan saved for "+document.getElementById("studentName").value+" on "+document.getElementById("date").value);}

/* ================= QUIZ ================= */
let currentQ=0, score=0;
const questions=[
  {q:"Value of π (approx)?",options:["3.12","3.14","3.16","3.18"],answer:"3.14"},
  {q:"√144?",options:["10","11","12","13"],answer:"12"},
  {q:"HCF of 12 & 18?",options:["3","6","9","12"],answer:"6"},
  {q:"Chemical symbol of Sodium?",options:["So","Na","S","N"],answer:"Na"},
  {q:"Speed of light?",options:["3×10^8 m/s","3×10^6 m/s","3×10^5 m/s","3×10^3 m/s"],answer:"3×10^8 m/s"},
  {q:"Who proposed relativity?",options:["Newton","Einstein","Bohr","Tesla"],answer:"Einstein"},
  {q:"Atomic number of Carbon?",options:["4","6","8","12"],answer:"6"},
  {q:"pH of neutral substance?",options:["5","6","7","8"],answer:"7"},
  {q:"Largest gland in body?",options:["Heart","Liver","Kidney","Lung"],answer:"Liver"},
  {q:"Unit of power?",options:["Joule","Watt","Newton","Volt"],answer:"Watt"},
  {q:"(a+b)^2 formula?",options:["a²+b²","a²+2ab+b²","a²-2ab+b²","2a+b"],answer:"a²+2ab+b²"},
  {q:"Area of circle?",options:["πr²","2πr","πd","r²"],answer:"πr²"},
  {q:"Photosynthesis equation needs?",options:["O2","CO2","N2","H2"],answer:"CO2"},
  {q:"SI unit of force?",options:["Watt","Joule","Newton","Pascal"],answer:"Newton"},
  {q:"Which is not metal?",options:["Iron","Gold","Oxygen","Copper"],answer:"Oxygen"},
  {q:"Longest bone?",options:["Femur","Tibia","Fibula","Humerus"],answer:"Femur"},
  {q:"Resistance unit?",options:["Volt","Ampere","Ohm","Watt"],answer:"Ohm"},
  {q:"Who discovered electron?",options:["Bohr","Rutherford","Thomson","Newton"],answer:"Thomson"},
  {q:"Largest desert?",options:["Sahara","Thar","Gobi","Kalahari"],answer:"Sahara"},
  {q:"Synonym of rapid?",options:["Slow","Fast","Weak","Late"],answer:"Fast"},
  {q:"10^2?",options:["10","100","1000","10000"],answer:"100"},
  {q:"Angle in straight line?",options:["90°","180°","270°","360°"],answer:"180°"},
  {q:"Electric current unit?",options:["Volt","Ohm","Ampere","Watt"],answer:"Ampere"},
  {q:"Cell powerhouse?",options:["Nucleus","Mitochondria","Ribosome","Golgi"],answer:"Mitochondria"},
  {q:"Boiling point of water (K)?",options:["273K","373K","100K","200K"],answer:"373K"},
  {q:"Who wrote Constitution of India?",options:["Nehru","Ambedkar","Gandhi","Patel"],answer:"Ambedkar"},
  {q:"Largest island?",options:["Greenland","Australia","Borneo","Madagascar"],answer:"Greenland"},
  {q:"Antonym of expand?",options:["Grow","Increase","Shrink","Spread"],answer:"Shrink"},
  {q:"Gas used in balloons?",options:["Oxygen","Hydrogen","Helium","Nitrogen"],answer:"Helium"},
  {q:"Unit of pressure?",options:["Pascal","Newton","Joule","Watt"],answer:"Pascal"},
  {q:"Factor of 36?",options:["5","6","7","8"],answer:"6"},
  {q:"Lens used for myopia?",options:["Convex","Concave","Plane","None"],answer:"Concave"},
  {q:"DNA full form?",options:["Deoxyribo Nucleic Acid","Dynamic Acid","Double Acid","None"],answer:"Deoxyribo Nucleic Acid"},
  {q:"Which vitamin from sun?",options:["A","B","C","D"],answer:"D"},
  {q:"First law of motion by?",options:["Newton","Einstein","Galileo","Kepler"],answer:"Newton"},
  {q:"Metal that rusts?",options:["Gold","Iron","Silver","Copper"],answer:"Iron"},
  {q:"Plural of analysis?",options:["Analysises","Analyses","Analysis","Analys"],answer:"Analyses"},
  {q:"World war II ended?",options:["1942","1945","1939","1950"],answer:"1945"},
  {q:"Largest volcano?",options:["Mauna Loa","Etna","Fuji","Krakatoa"],answer:"Mauna Loa"},
  {q:"Energy stored in food?",options:["Kinetic","Potential","Chemical","Heat"],answer:"Chemical"},
  {q:"LCM of 4 & 6?",options:["10","12","14","16"],answer:"12"},
  {q:"Refraction occurs in?",options:["Vacuum","Medium","Space","None"],answer:"Medium"},
  {q:"Human normal temp?",options:["35°C","37°C","40°C","42°C"],answer:"37°C"},
  {q:"Currency of Japan?",options:["Dollar","Yen","Euro","Won"],answer:"Yen"},
  {q:"Gas for respiration?",options:["CO2","Oxygen","Nitrogen","Hydrogen"],answer:"Oxygen"},
  {q:"Simple interest formula?",options:["PTR/100","P+R+T","PRT","P/T"],answer:"PTR/100"},
  {q:"Sound speed faster in?",options:["Air","Water","Solid","Vacuum"],answer:"Solid"},
  {q:"Largest organ?",options:["Heart","Skin","Liver","Brain"],answer:"Skin"},
  {q:"Who invented telephone?",options:["Bell","Edison","Newton","Tesla"],answer:"Bell"},
  {q:"Angle less than 90°?",options:["Obtuse","Right","Acute","Straight"],answer:"Acute"}
];
function startQuiz(){document.querySelector(".quiz-start-screen").style.display="none";currentQ=0;score=0;showQuestion();}
function showQuestion(){
  const q=questions[currentQ];
  document.getElementById("quizArea").innerHTML=`<div class="quiz-card"><h3>Q${currentQ+1}. ${q.q}</h3><div class="options">${q.options.map(o=>`<button class="option-btn" onclick="selectAnswer('${o}')">${o}</button>`).join("")}</div></div>`;
}
function selectAnswer(ans){
  if(ans===questions[currentQ].answer) score++;
  if(++currentQ<questions.length) showQuestion();
  else{document.getElementById("quizArea").innerHTML="";document.getElementById("resultBox").innerHTML=`<div class="result">🎉 Score: ${score}/${questions.length}<br><br><button class="start-btn" onclick="location.reload()">Play Again</button></div>`;}
}

/* ================= PUZZLE ================= */
const words=["grammar","noun","verb","adjective","adverb","sentence","paragraph","poetry","prose","synonym","antonym","tense","voice","clause","phrase","history","culture","society","economy","government","democracy","constitution","citizen","rights","duties","geography","climate","continent","population","trade","addition","subtraction","multiplication","division","fraction","decimal","percentage","ratio","equation","algebra","geometry","angle","triangle","circle","perimeter","experiment","hypothesis","theory","observation","research","matter","energy","force","motion","element","compound","mixture","reaction","lab","analysis","velocity","acceleration","gravity","friction","pressure","work","power","wave","sound","light","reflection","refraction","electricity","magnetism","cell","tissue","organ","system","organism","photosynthesis","respiration","digestion","circulation","enzyme","dna","gene","evolution","species","habitat","ecosystem","biodiversity","atom","molecule","neutron","proton","electron","formula","solution","density"];
let currentWord="";
function scramble(w){return w.split('').sort(()=>Math.random()-0.5).join('');}
function newPuzzle(){currentWord=words[Math.floor(Math.random()*words.length)];document.getElementById("scrambledWord").innerText=scramble(currentWord).toUpperCase();document.getElementById("userAnswer").value="";document.getElementById("puzzleResult").innerText="";}
function checkPuzzle(){const u=document.getElementById("userAnswer").value.toLowerCase();const r=document.getElementById("puzzleResult");if(u===currentWord){r.innerText="✅ Correct!";r.style.color="green";}else{r.innerText="❌ Try Again!";r.style.color="red";}}

window.addEventListener("load",function(){newPuzzle();updateStreak();renderChatList();updateDisplay();if(localStorage.getItem("theme")==="dark")document.body.classList.add("dark-mode");});

/* ================= GRAMMAR CHECK ================= */
async function checkGrammar() {
  const text = document.getElementById("grammarInput").value.trim();
  const resultEl = document.getElementById("grammarResult");

  if (!text) { resultEl.innerText = "⚠️ Please enter a sentence"; return; }
  resultEl.innerHTML = `⏳ Checking grammar...`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("http://127.0.0.1:8000/grammar-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error("Server error: " + res.status);
    const data = await res.json();
    const corrected = data.corrected_text || data.corrected || data.result || data.output || "";
    if (corrected && corrected.trim()) {
      resultEl.innerHTML = `✅ Corrected: <b>${corrected.trim()}</b>`;
    } else {
      resultEl.innerHTML = `⚠️ No correction returned from server.`;
    }
  } catch (err) {
    resultEl.innerHTML = ``;
  }
}
function openVideo(vid){window.open(`https://www.youtube.com/watch?v=${vid}`,"_blank");}

/* ================= FLASHCARDS ================= */
let flashcards=[],currentIndex=0;
function addFlashcard(){
  const q=document.getElementById("questionInput").value,a=document.getElementById("answerInput").value;
  if(!q||!a){alert("Enter both question and answer");return;}
  flashcards.push({q,a});document.getElementById("questionInput").value="";document.getElementById("answerInput").value="";
  currentIndex=flashcards.length-1;showCard();updateFlashList();
}
function showCard(){
  if(!flashcards.length){document.getElementById("cardQuestion").innerText="No cards yet";document.getElementById("cardAnswer").innerText="";return;}
  document.getElementById("cardQuestion").innerText=flashcards[currentIndex].q;
  document.getElementById("cardAnswer").innerText=flashcards[currentIndex].a;
  document.getElementById("flashcard").classList.remove("flip");
}
function flipCard(){document.getElementById("flashcard").classList.toggle("flip");}
function nextCard(){if(currentIndex<flashcards.length-1){currentIndex++;showCard();}}
function prevCard(){if(currentIndex>0){currentIndex--;showCard();}}
function deleteCard(){if(!flashcards.length)return;flashcards.splice(currentIndex,1);if(currentIndex>0)currentIndex--;showCard();updateFlashList();}
function updateFlashList(){
  const list=document.getElementById("flashList");list.innerHTML="";
  flashcards.forEach((c,i)=>{const d=document.createElement("div");d.className="flash-mini-card";d.innerText=c.q;d.onclick=()=>{if(d.classList.contains("back")){d.classList.remove("back");d.innerText=c.q;}else{d.classList.add("back");d.innerText=c.a;}};list.appendChild(d);});
}

/* ================= POMODORO ================= */
let time=1500,timerInterval;
function updateDisplay(){const m=Math.floor(time/60),s=time%60;document.getElementById("timer").innerText=`${m}:${s<10?"0":""}${s}`;}
function startTimer(){if(timerInterval)return;timerInterval=setInterval(()=>{if(time>0){time--;updateDisplay();}else{alert("Time's up!");clearInterval(timerInterval);timerInterval=null;}},1000);}
function pauseTimer(){clearInterval(timerInterval);timerInterval=null;}
function resetTimer(){pauseTimer();time=1500;updateDisplay();}
function toggleDark(){document.body.classList.toggle("dark-mode");}

/* ================= DRAG QUIZ ================= */
let draggedItem=null;
document.querySelectorAll(".drag-item").forEach(i=>i.addEventListener("dragstart",function(){draggedItem=this;}));
document.querySelectorAll(".drop-box").forEach(b=>{b.addEventListener("dragover",e=>e.preventDefault());b.addEventListener("drop",function(){if(!this.querySelector(".drag-item"))this.appendChild(draggedItem);});});
function checkDragQuiz(){let c=0;document.querySelectorAll(".drop-box").forEach(b=>{const i=b.querySelector(".drag-item");if(i&&i.innerText===b.dataset.match){c++;b.style.background="#c8f7c5";}else b.style.background="#f7c5c5";});document.getElementById("dragResult").innerText=`Score: ${c}/3`;}

/* ================= GEO & SCIENCE ================= */
function loadGeo(type){
  const result=document.getElementById("geoResult");result.innerHTML="";
  const data={countries:[{name:"Afghanistan",capital:"Kabul"},{name:"India",capital:"New Delhi"},{name:"USA",capital:"Washington DC"},{name:"Japan",capital:"Tokyo"},{name:"France",capital:"Paris"},{name:"Brazil",capital:"Brasília"},{name:"Australia",capital:"Canberra"},{name:"Canada",capital:"Ottawa"},{name:"China",capital:"Beijing"},{name:"Russia",capital:"Moscow"}],india:[{name:"Andhra Pradesh",capital:"Amaravati"},{name:"Telangana",capital:"Hyderabad"},{name:"Karnataka",capital:"Bengaluru"},{name:"Tamil Nadu",capital:"Chennai"},{name:"Maharashtra",capital:"Mumbai"},{name:"Gujarat",capital:"Gandhinagar"},{name:"Rajasthan",capital:"Jaipur"},{name:"Uttar Pradesh",capital:"Lucknow"},{name:"West Bengal",capital:"Kolkata"},{name:"Punjab",capital:"Chandigarh"},{name:"Haryana",capital:"Chandigarh"},{name:"Bihar",capital:"Patna"},{name:"Odisha",capital:"Bhubaneswar"},{name:"Kerala",capital:"Thiruvananthapuram"},{name:"Assam",capital:"Dispur"},{name:"Madhya Pradesh",capital:"Bhopal"},{name:"Chhattisgarh",capital:"Raipur"},{name:"Jharkhand",capital:"Ranchi"},{name:"Uttarakhand",capital:"Dehradun"},{name:"Himachal Pradesh",capital:"Shimla"},{name:"Goa",capital:"Panaji"},{name:"Arunachal Pradesh",capital:"Itanagar"},{name:"Meghalaya",capital:"Shillong"},{name:"Manipur",capital:"Imphal"},{name:"Mizoram",capital:"Aizawl"},{name:"Nagaland",capital:"Kohima"},{name:"Tripura",capital:"Agartala"},{name:"Sikkim",capital:"Gangtok"}],oceans:[{name:"Pacific Ocean"},{name:"Atlantic Ocean"},{name:"Indian Ocean"},{name:"Arctic Ocean"},{name:"Southern Ocean"}],continents:[{name:"Asia"},{name:"Europe"},{name:"Africa"},{name:"North America"},{name:"South America"},{name:"Australia"},{name:"Antarctica"}],deserts:[{name:"Sahara Desert"},{name:"Thar Desert"},{name:"Gobi Desert"},{name:"Kalahari Desert"},{name:"Arabian Desert"}],rivers:[{name:"Ganga"},{name:"Yamuna"},{name:"Brahmaputra"},{name:"Indus"},{name:"Nile"},{name:"Amazon"},{name:"Yangtze"},{name:"Mississippi"}],places:[{name:"Taj Mahal"},{name:"Charminar"},{name:"Red Fort"},{name:"Gateway of India"},{name:"Qutub Minar"},{name:"India Gate"},{name:"Golden Temple"},{name:"Hawa Mahal"}]};
  (data[type]||[]).forEach(i=>result.innerHTML+=`<div class="geo-item"><h4>${i.name}</h4>${i.capital?`<p>Capital: ${i.capital}</p>`:""}</div>`);
}
const scienceData={physics:[{name:"Gravity",info:"Force attracting objects toward Earth"},{name:"Velocity",info:"Speed with direction"},{name:"Energy",info:"Ability to do work"},{name:"Force",info:"Push or pull on an object"},{name:"Electricity",info:"Flow of electric charge"}],chemistry:[{name:"Atom",info:"Smallest unit of matter"},{name:"Molecule",info:"Group of atoms bonded together"},{name:"Element",info:"Pure substance of one atom type"},{name:"Compound",info:"Combination of elements"},{name:"Reaction",info:"Process where substances change"}],biology:[{name:"Cell",info:"Basic unit of life"},{name:"DNA",info:"Genetic material of organisms"},{name:"Photosynthesis",info:"Plants make food using sunlight"},{name:"Respiration",info:"Energy release process"},{name:"Organism",info:"Any living being"}],space:[{name:"Sun",info:"Star at center of solar system"},{name:"Moon",info:"Earth's natural satellite"},{name:"Planet",info:"Body orbiting a star"},{name:"Galaxy",info:"System of stars and planets"},{name:"Black Hole",info:"Region with extremely strong gravity"}],environment:[{name:"Ecosystem",info:"Living + non-living interaction"},{name:"Pollution",info:"Harmful substances in environment"},{name:"Climate",info:"Weather patterns over long periods"},{name:"Biodiversity",info:"Variety of life forms"},{name:"Conservation",info:"Protection of natural resources"}],inventions:[{name:"Electric Bulb",info:"Invented by Thomas Edison"},{name:"Telephone",info:"Invented by Alexander Graham Bell"},{name:"Internet",info:"Global computer network"},{name:"Computer",info:"Electronic computing device"},{name:"Airplane",info:"Invented by Wright brothers"}]};
function loadScience(type){const r=document.getElementById("geoResult");r.innerHTML="";(scienceData[type]||[]).forEach(i=>{const d=document.createElement("div");d.className="geo-item";d.innerHTML=`<h4>${i.name}</h4><p>${i.info}</p>`;r.appendChild(d);});}

/* ================= UI HELPERS ================= */
function toggleSidebar(){const s=document.getElementById("sidebar"),m=document.querySelector(".main");s.classList.toggle("hidden");m.classList.toggle("full");s.classList.toggle("hide");}
function toggleProfileMenu(){document.getElementById("profileMenu").classList.toggle("show");}
function editProfile(){alert("Edit Profile");}
function openSettings(){alert("Settings");}
document.addEventListener("click",function(e){
  const menu=document.getElementById("profileMenu"),profile=document.querySelector(".profile-circle");
  if(profile&&menu&&!profile.contains(e.target)&&!menu.contains(e.target))menu.classList.remove("show");
});

/* ================= GRAMMAR TOPICS ================= */
function openGrammarTopic(topic){
  const display=document.getElementById("grammarTopicDisplay");
  const topics={
    tenses:`<div class="grammar-topic-box"><h2 class="topic-main-title">📘 Tenses Chart</h2><div class="tense-wrapper"><div class="tense-column present"><h3>Present Tenses</h3><div class="tense-card-box"><h4>Simple Present</h4><p><b>Structure:</b> Subject + V1 + Object</p><p><b>Example:</b> I always speak the truth.</p></div><div class="tense-card-box"><h4>Present Continuous</h4><p><b>Structure:</b> Subject + is/am/are + V1+ing</p><p><b>Example:</b> Ali is riding a bicycle.</p></div><div class="tense-card-box"><h4>Present Perfect</h4><p><b>Structure:</b> Subject + has/have + V3</p><p><b>Example:</b> The sun has set.</p></div><div class="tense-card-box"><h4>Present Perfect Continuous</h4><p><b>Structure:</b> Subject + has/have + been + V1+ing</p><p><b>Example:</b> The sun has been shining since morning.</p></div></div><div class="tense-column past"><h3>Past Tenses</h3><div class="tense-card-box"><h4>Simple Past</h4><p><b>Structure:</b> Subject + V2 + Object</p><p><b>Example:</b> We went to the zoo yesterday.</p></div><div class="tense-card-box"><h4>Past Continuous</h4><p><b>Structure:</b> Subject + was/were + V1+ing</p><p><b>Example:</b> He was smiling.</p></div><div class="tense-card-box"><h4>Past Perfect</h4><p><b>Structure:</b> Subject + had + V3</p><p><b>Example:</b> They had already finished.</p></div><div class="tense-card-box"><h4>Past Perfect Continuous</h4><p><b>Structure:</b> Subject + had been + V1+ing</p><p><b>Example:</b> He had been working for hours.</p></div></div><div class="tense-column future"><h3>Future Tenses</h3><div class="tense-card-box"><h4>Simple Future</h4><p><b>Structure:</b> Subject + will/shall + V1</p><p><b>Example:</b> You will pass the exam.</p></div><div class="tense-card-box"><h4>Future Continuous</h4><p><b>Structure:</b> Subject + will/shall + be + V1+ing</p><p><b>Example:</b> They will be visiting.</p></div><div class="tense-card-box"><h4>Future Perfect</h4><p><b>Structure:</b> Subject + will/shall + have + V3</p><p><b>Example:</b> I shall have finished my work.</p></div><div class="tense-card-box"><h4>Future Perfect Continuous</h4><p><b>Structure:</b> Subject + will/shall + have been + V1+ing</p><p><b>Example:</b> She will have been sleeping.</p></div></div></div></div>`,
    parts:`<div class="grammar-topic-box"><h2 class="topic-main-title">🧩 Parts of Speech</h2><div class="parts-grid"><div class="part-card noun"><h3>Noun</h3><p>Names a person, place, thing, or idea.</p><p><b>E.g.:</b> cat, John, park, happiness</p></div><div class="part-card pronoun"><h3>Pronoun</h3><p>Replaces a noun.</p><p><b>E.g.:</b> she, they, it</p></div><div class="part-card verb"><h3>Verb</h3><p>Expresses action or state.</p><p><b>E.g.:</b> runs, sings, are</p></div><div class="part-card adjective"><h3>Adjective</h3><p>Describes a noun.</p><p><b>E.g.:</b> fluffy, tall, delicious</p></div><div class="part-card adverb"><h3>Adverb</h3><p>Modifies verb/adjective/adverb.</p><p><b>E.g.:</b> quickly, very, confidently</p></div><div class="part-card preposition"><h3>Preposition</h3><p>Shows relationship.</p><p><b>E.g.:</b> under, through, beside</p></div><div class="part-card conjunction"><h3>Conjunction</h3><p>Connects words/clauses.</p><p><b>E.g.:</b> and, or, because</p></div><div class="part-card interjection"><h3>Interjection</h3><p>Expresses emotion.</p><p><b>E.g.:</b> wow!, ouch!, yay!</p></div></div></div>`,
    voice:`<div class="grammar-topic-box"><h2 class="topic-main-title">🔄 Active & Passive Voice</h2><div class="voice-grid"><div class="voice-card active-box"><h3>Active Voice</h3><p>Subject performs the action.</p><p class="formula">Subject + Verb + Object</p><h4>Examples:</h4><ul><li>Anna painted the house.</li><li>The teacher answers questions.</li></ul></div><div class="voice-card passive-box"><h3>Passive Voice</h3><p>Subject receives the action.</p><p class="formula">Object + Verb + Subject</p><h4>Examples:</h4><ul><li>The house was painted by Anna.</li><li>Questions are answered by the teacher.</li></ul></div></div></div>`,
    vocabulary:`<div class="grammar-topic-box"><h2 class="topic-main-title">📚 Vocabulary Levels</h2><div class="vocab-grid"><div class="vocab-card beginner"><h3>Beginner</h3><ul><li>keep</li><li>run</li><li>walk</li><li>happy</li><li>sad</li><li>big</li><li>cold</li><li>tiny</li></ul></div><div class="vocab-card intermediate"><h3>Intermediate</h3><ul><li>hold</li><li>jog</li><li>stroll</li><li>glad</li><li>anxious</li><li>massive</li><li>simple</li><li>delay</li></ul></div><div class="vocab-card advanced"><h3>Advanced</h3><ul><li>retain</li><li>sprint</li><li>wander</li><li>delighted</li><li>terrified</li><li>enormous</li><li>intricate</li><li>postpone</li></ul></div></div></div>`,
    punctuation:`<div class="grammar-topic-box"><h2 class="topic-main-title">✍️ Punctuation Marks</h2><div class="punctuation-grid"><div class="punc-card"><h3>Period (.)</h3><p>Sophia loves hockey.</p></div><div class="punc-card"><h3>Question Mark (?)</h3><p>Are you hungry?</p></div><div class="punc-card"><h3>Comma (,)</h3><p>I like novels, stories, and poems.</p></div><div class="punc-card"><h3>Exclamation (!)</h3><p>Wow! What a scene!</p></div><div class="punc-card"><h3>Colon (:)</h3><p>She likes: Italy, USA, UAE.</p></div><div class="punc-card"><h3>Semicolon (;)</h3><p>I won't drink cola; I'll drink juice.</p></div><div class="punc-card"><h3>Apostrophe (')</h3><p>Roger's dog is weak.</p></div><div class="punc-card"><h3>Quotation (" ")</h3><p>Ali asked, "When can I go?"</p></div><div class="punc-card"><h3>Hyphen (-)</h3><p>I love ice-cream.</p></div><div class="punc-card"><h3>Ellipsis (...)</h3><p>Julie... Julie is the girl who...</p></div></div></div>`,
    sentence:`<div class="grammar-topic-box"><h2 class="topic-main-title">📝 Sentence Structures</h2><div class="sentence-grid"><div class="sentence-card simple-box"><h3>Simple</h3><p><b>1 Independent Clause</b></p><p class="example">Children played.</p></div><div class="sentence-card compound-box"><h3>Compound</h3><p><b>2 Independent Clauses</b></p><p class="example">Children played, and parents chatted.</p></div><div class="sentence-card complex-box"><h3>Complex</h3><p><b>1 Main + 1 Subordinate Clause</b></p><p class="example">Children played after the rain stopped.</p></div><div class="sentence-card compoundcomplex-box"><h3>Compound-Complex</h3><p><b>2+ Independent + 1+ Dependent</b></p><p class="example">After rain stopped, children played and parents chatted.</p></div></div></div>`
  };
  display.innerHTML = topics[topic] || "";
}