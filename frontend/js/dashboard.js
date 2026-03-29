function loadUser(){
  const user = localStorage.getItem("user_id") || "Student";
  const userNameEl = document.getElementById("userName");

  if (userNameEl) {
    userNameEl.innerText = user;
  }
}
  function logout(){
    localStorage.clear();
    window.location.href = "login.html";
  }

  window.addEventListener("load", loadUser);

/* ================= SECTION SWITCH ================= */
function showSection(id){
  document.querySelectorAll(".section").forEach(sec=>{
    sec.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

let isLoading = false;

function updateStreak(){
  const today = new Date().toDateString();
  let lastLogin = localStorage.getItem("lastLoginDate");
  let streak = parseInt(localStorage.getItem("streak")) || 0;
  if(lastLogin === today){
    // already counted today
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if(lastLogin === yesterday.toDateString()){
      streak++;
    } else {
      streak = 1;
    }
    localStorage.setItem("lastLoginDate", today);
    localStorage.setItem("streak", streak);
  }
  const streakEl = document.getElementById("streakCount");
if (streakEl) {
  streakEl.innerText = streak;
}
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
  if(!selectedSubject){
    alert("Please select a subject first!");
    return;
  }
  const chatId = "chat_" + Date.now();
  currentChatId = chatId;
  localStorage.setItem(selectedSubject + "_currentChatId", chatId);
  localStorage.setItem(selectedSubject + "_" + chatId, JSON.stringify([]));
  document.getElementById("chatArea").innerHTML = `
    <div class="subject-banner">📘 ${selectedSubject} Mode Activated</div>
  `;
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
      chatList.innerHTML += `
        <div class="chat-item ${chatId === currentChatId ? 'active' : ''}" onclick="loadChat('${chatId}')">
          💬 ${selectedSubject} Chat ${chatId.slice(-4)}
        </div>
      `;
    }
  });
}

function loadChat(chatId){
  currentChatId = chatId;
  localStorage.setItem(selectedSubject + "_currentChatId", chatId);
  let key = selectedSubject + "_" + chatId;
  let chatData = JSON.parse(localStorage.getItem(key)) || [];
  let chatArea = document.getElementById("chatArea");
  chatArea.innerHTML = `<div class="subject-banner">📘 ${selectedSubject} Mode Activated</div>`;
  chatData.forEach(msg => {
    chatArea.innerHTML += `
      <div class="user-msg"><div class="msg-text">${msg.q}</div></div>
      <div class="ai-msg">${msg.a}</div>
    `;
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

/* ================= SUBJECT MAP (shared) ================= */
const SUBJECT_MAP = {
  "maths": "math", "math": "math", "physics": "physics",
  "chemistry": "chemistry", "biology": "biology",
  "english": "english", "telugu": "telugu", "hindi": "hindi",
  "social": "english", "computer": "english"
};

/* ================= LOCAL FALLBACK LOOKUP ================= */
function lookupFallback(question) {
  const q = question.toLowerCase().trim()
    .replace(/\s+/g, "")   // remove all spaces for math expressions like "2+2"
    .replace(/[=?]+$/, ""); // strip trailing = or ?

  const normalizedSubject = SUBJECT_MAP[selectedSubject.toLowerCase()] || selectedSubject.toLowerCase();
  const bank = fallback_qa[normalizedSubject] || [];

  for (let item of bank) {
    const key = item[0].toLowerCase().trim().replace(/\s+/g, "");
    // exact match (space-stripped), or one contains the other
    if (q === key || q.includes(key) || key.includes(q)) {
      return item[1];
    }
  }
  return null;
}

/* ================= SAFE MATH EVALUATOR ================= */
function tryMathEval(expr) {
  try {
    // Only allow safe math characters
    const safe = expr.replace(/\s+/g, "").replace(/[^0-9+\-*/.()%^]/g, "");
    if (!safe || safe.length === 0) return null;
    // Replace ^ with ** for exponentiation
    const prepared = safe.replace(/\^/g, "**");
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + prepared + ')')();
    if (typeof result === "number" && isFinite(result)) {
      // Format: avoid floating point noise
      const rounded = Math.round(result * 1e10) / 1e10;
      return `📘 Step-by-step Solution:<br>Expression: ${expr.trim()}<br>BODMAS Result → ${rounded}<br>✅ Answer: ${rounded}`;
    }
  } catch (e) { /* not a math expression */ }
  return null;
}

/* ================= DETECT IF QUESTION IS PURE MATH ================= */
function isMathExpression(q) {
  // looks like arithmetic: digits + operators, possibly with spaces
  return /^[\d\s+\-*/().^%=?]+$/.test(q.trim());
}

/* ================= ANTHROPIC API CALL ================= */
async function askAnthropicAPI(question, subject) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a helpful educational AI tutor for school students, specializing in ${subject}. 
Answer questions clearly and concisely. Use simple language appropriate for students. 
Format answers with line breaks where needed. Keep answers educational and accurate.`,
      messages: [{ role: "user", content: question }]
    })
  });
  if (!response.ok) throw new Error("Anthropic API error: " + response.status);
  const data = await response.json();
  return data.content.map(item => item.type === "text" ? item.text : "").filter(Boolean).join("\n");
}

/* ================= SAVE & DISPLAY ANSWER ================= */
function displayAnswer(chatArea, question, answer, loading) {
  if (loading) loading.remove();
  chatArea.innerHTML += `<div class="ai-msg">🤖 ${answer}</div>`;
  const plain = answer.replace(/<br>/g, " ").replace(/<[^>]*>/g, "");
  speakText(plain);
  const key = selectedSubject + "_" + currentChatId;
  const chatData = JSON.parse(localStorage.getItem(key)) || [];
  chatData.push({ q: question, a: answer });
  localStorage.setItem(key, JSON.stringify(chatData));
  renderChatList();
}

/* ================= FORMAT ANSWER TEXT ================= */
function formatAnswer(text) {
  return text
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/📘/g, "📘 ")
    .replace(/✅/g, "<br>✅ ");
}

/* ================= ENVIRONMENT DETECTION ================= */
const IS_FILE_PROTOCOL = window.location.protocol === "file:";

/* ================= SMART OFFLINE ANSWER GENERATOR ================= */
function generateSmartOfflineAnswer(question, subject) {
  const q = question.toLowerCase().trim();

  // Try math eval one more time
  if (isMathExpression(question)) {
    const r = tryMathEval(q.replace(/[=?]+$/g, ""));
    if (r) return r;
  }

  const subjectKey = SUBJECT_MAP[subject.toLowerCase()] || subject.toLowerCase();

  const keywordMap = {
    math: [
      [/formula/,                  "Common formulas: Area of circle = πr², Pythagoras = a²+b²=c², SI = PTR/100, Quadratic = ax²+bx+c=0"],
      [/prime/,                    "A prime number is divisible only by 1 and itself. Examples: 2, 3, 5, 7, 11, 13..."],
      [/even|odd/,                 "Even numbers are divisible by 2 (2,4,6...). Odd numbers are not divisible by 2 (1,3,5...)."],
      [/square.?root|√/,           "Square root finds a number that when multiplied by itself gives the original. √144=12, √25=5"],
      [/percentage|%/,             "Percentage = (Part ÷ Whole) × 100"],
      [/fraction/,                 "A fraction represents part of a whole. Example: 3/4 means 3 parts out of 4."],
      [/lcm/,                      "LCM = Least Common Multiple. LCM of 4 & 6 = 12"],
      [/hcf|gcd/,                  "HCF = Highest Common Factor. HCF of 12 & 18 = 6"],
      [/ratio/,                    "Ratio compares two quantities. Example: 3:2 means 3 of one for every 2 of another."],
      [/mean|average/,             "Mean = Sum of all values ÷ Number of values"],
      [/median/,                   "Median = Middle value when data is sorted in order."],
      [/mode/,                     "Mode = The value that appears most often in a data set."],
      [/probability/,              "Probability = Favourable outcomes ÷ Total outcomes. Range: 0 to 1."],
      [/pythagoras/,               "Pythagoras theorem: a² + b² = c² (for right-angled triangles)"],
      [/quadratic/,                "Quadratic equation: ax² + bx + c = 0. Solve using formula: x = (-b ± √(b²-4ac)) / 2a"],
      [/what is|define|meaning/,   "Please type a specific Maths question — e.g. 'What is (a+b)²' or 'Solve 2x + 3 = 11'"],
    ],
    physics: [
      [/newton|law.of.motion/,     "Newton's Laws: 1st=Inertia (no force = no change), 2nd=F=ma, 3rd=Action & Reaction are equal & opposite"],
      [/gravity|gravitation/,      "Gravity = force attracting objects toward Earth. g = 9.8 m/s². F = mg"],
      [/speed|velocity/,           "Speed = Distance ÷ Time. Velocity = Speed with direction. Both in m/s."],
      [/acceleration/,             "Acceleration = Change in Velocity ÷ Time. a = (v-u)/t. Unit: m/s²"],
      [/force/,                    "Force = Mass × Acceleration (F = ma). Unit: Newton (N)"],
      [/energy/,                   "KE = ½mv², PE = mgh, Total Energy is conserved. Unit: Joule (J)"],
      [/pressure/,                 "Pressure = Force ÷ Area. P = F/A. Unit: Pascal (Pa)"],
      [/work/,                     "Work = Force × Distance × cos(θ). W = Fd. Unit: Joule (J)"],
      [/power/,                    "Power = Work ÷ Time. P = W/T. Unit: Watt (W)"],
      [/wave|light|sound/,         "Light speed = 3×10⁸ m/s. Sound speed in air ≈ 340 m/s. Sound fastest in solids."],
      [/ohm|resistance|circuit/,   "Ohm's Law: V = IR. Voltage = Current × Resistance. Unit of R: Ohm (Ω)"],
      [/lens|refraction|mirror/,   "Convex lens = converging. Concave lens = diverging. Myopia uses concave lens."],
    ],
    chemistry: [
      [/atom|atomic/,              "Atom: smallest unit of matter. Has protons(+), neutrons(neutral), electrons(-) in shells."],
      [/periodic.table|element/,   "Periodic table has 118 elements organized by atomic number. Groups & Periods arrange properties."],
      [/acid|base|ph/,             "pH scale 0-14. pH<7 = Acid (HCl), pH=7 = Neutral (water), pH>7 = Base (NaOH)."],
      [/bond|compound|molecule/,   "Ionic bonds: metal+non-metal (NaCl). Covalent bonds: non-metal+non-metal (H₂O)."],
      [/oxidation|reduction|redox/,"Oxidation = loss of electrons. Reduction = gain of electrons. Remember: OIL RIG"],
      [/valency/,                  "Valency = combining capacity of an element. H=1, O=2, N=3, C=4, Na=1, Cl=1"],
      [/reaction/,                 "Types: Combination (A+B→AB), Decomposition (AB→A+B), Displacement, Double Displacement"],
      [/formula|chemical/,         "Common formulas: Water=H₂O, Salt=NaCl, CO₂=Carbon dioxide, H₂SO₄=Sulphuric acid"],
    ],
    biology: [
      [/cell/,                     "Cell = basic unit of life. Plant cells have: cell wall, chloroplast. Animal cells have: centriole."],
      [/photosynthesis/,           "Photosynthesis: 6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂. Happens in chloroplasts (leaves)."],
      [/respiration/,              "Aerobic: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38ATP. Anaerobic: glucose → lactic acid (no oxygen)."],
      [/dna|gene|chromosome/,      "DNA = Deoxyribonucleic Acid. Carries genetic info. Humans have 46 chromosomes (23 pairs)."],
      [/heart|blood|circulat/,     "Heart has 4 chambers. RBC carries O₂. WBC fights infection. Platelets help clot blood."],
      [/digestive|digest/,         "Digestion: Mouth→Oesophagus→Stomach→Small Intestine→Large Intestine→Rectum→Anus"],
      [/nervous|brain|neuron/,     "Brain = cerebrum+cerebellum+medulla. Neurons carry nerve impulses. Reflex arc is automatic."],
      [/ecosystem|habitat/,        "Ecosystem = community of living things + their environment. Producers→Consumers→Decomposers"],
      [/enzyme/,                   "Enzymes are biological catalysts. They speed up reactions without being used up. Eg: Amylase, Pepsin"],
    ],
    english: [
      [/noun/,                     "Noun: name of person, place, thing or idea. Types: Common, Proper, Abstract, Collective."],
      [/verb/,                     "Verb: action or state word. Examples: run, jump, is, think. Verbs have tenses."],
      [/adjective/,                "Adjective: describes a noun. Examples: big, red, happy, beautiful, tall."],
      [/adverb/,                   "Adverb: modifies verb, adjective or another adverb. Examples: quickly, very, silently, always."],
      [/pronoun/,                  "Pronoun: replaces a noun. Examples: I, you, he, she, it, they, we."],
      [/preposition/,              "Preposition: shows relationship. Examples: in, on, at, under, between, above, beside."],
      [/conjunction/,              "Conjunction: joins words or clauses. FANBOYS: For, And, Nor, But, Or, Yet, So."],
      [/tense/,                    "3 main tenses: Present (I go / I am going / I have gone), Past (I went), Future (I will go)"],
      [/synonym/,                  "Synonym = word with similar meaning. Fast→Quick, Happy→Joyful, Big→Large, Sad→Unhappy."],
      [/antonym/,                  "Antonym = word with opposite meaning. Fast→Slow, Happy→Sad, Big→Small, Hot→Cold."],
      [/sentence/,                 "A sentence needs Subject + Verb + (Object). Simple, Compound, Complex, Compound-Complex."],
      [/voice|active|passive/,     "Active: Subject does the action (Ram ate food). Passive: Subject receives action (Food was eaten by Ram)."],
      [/article/,                  "Articles: 'a' (before consonant sounds), 'an' (before vowel sounds), 'the' (specific/known noun)."],
    ],
    telugu: [
      [/నామవాచకం|noun/,            "నామవాచకం (Noun): వ్యక్తి, స్థలం, వస్తువు పేరు. ఉదా: రాముడు, హైదరాబాద్, పుస్తకం"],
      [/క్రియ|verb/,               "క్రియ (Verb): చర్యను చూపించే పదం. ఉదా: చదువు, ఆడు, నడు"],
      [/వ్యాకరణం|grammar/,         "తెలుగు వ్యాకరణంలో నామవాచకం, సర్వనామం, విశేషణం, క్రియ ప్రధానమైనవి."],
    ],
    hindi: [
      [/संज्ञा|noun/,              "संज्ञा (Noun): किसी व्यक्ति, स्थान या वस्तु का नाम। उदा: राम, दिल्ली, किताब"],
      [/क्रिया|verb/,              "क्रिया (Verb): काम को दर्शाने वाला शब्द। उदा: खाना, पीना, पढ़ना"],
      [/व्याकरण|grammar/,          "हिंदी व्याकरण में संज्ञा, सर्वनाम, विशेषण, क्रिया मुख्य हैं।"],
    ],
  };

  const pairs = keywordMap[subjectKey] || [];
  for (const [pattern, answer] of pairs) {
    if (pattern.test(q)) return answer;
  }

  // Generic per-subject tip
  const tips = {
    math:      "💡 Try: 'What is Pythagoras theorem?' or type a calculation like '15 × 4 + 6'",
    physics:   "💡 Try: 'What is Newton's first law?' or 'What is the formula for force?'",
    chemistry: "💡 Try: 'What is an atom?' or 'What is the pH of an acid?'",
    biology:   "💡 Try: 'What is photosynthesis?' or 'Explain the digestive system'",
    english:   "💡 Try: 'What is a noun?' or 'Explain active and passive voice'",
    telugu:    "💡 అడగండి: 'నామవాచకం అంటే ఏమిటి?' లేదా 'క్రియ అంటే ఏమిటి?'",
    hindi:     "💡 पूछें: 'संज्ञा क्या है?' या 'क्रिया किसे कहते हैं?'",
  };
  return tips[subjectKey] || `💡 Please ask a specific question about ${subject}. I'm here to help!`;
}

/* ================= ASK AI ================= */
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

  // ── STEP 1: Always check fallback_qa first (instant, zero network) ──
  const localAnswer = lookupFallback(question);
  if (localAnswer) {
    displayAnswer(chatArea, question, formatAnswer(localAnswer), loading);
    chatArea.scrollTop = chatArea.scrollHeight;
    return;
  }

  // ── STEP 2: Math expression → evaluate locally ──
  if (isMathExpression(question)) {
    const mathResult = tryMathEval(question.replace(/[=?]+$/g, ""));
    if (mathResult) {
      displayAnswer(chatArea, question, mathResult, loading);
      chatArea.scrollTop = chatArea.scrollHeight;
      return;
    }
  }

  // ── STEP 3: file:// protocol → ALL network blocked by browser, use smart offline ──
  if (window.location.protocol === "file:") {
    loading.remove();
    const msg = generateSmartOfflineAnswer(question, selectedSubject);
    chatArea.innerHTML += `<div class="ai-msg">🤖 ${msg}</div>`;
    speakText(msg.replace(/<[^>]*>/g, ""));
    const key = selectedSubject + "_" + currentChatId;
    const chatData = JSON.parse(localStorage.getItem(key)) || [];
    chatData.push({ q: question, a: msg });
    localStorage.setItem(key, JSON.stringify(chatData));
    renderChatList();
    chatArea.scrollTop = chatArea.scrollHeight;
    return;
  }

  // ── STEP 4: Try backend (only reachable when served via http://) ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("http://127.0.0.1:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question, subject: selectedSubject,
        session_id: currentChatId,
        user_id: localStorage.getItem("user_id") || null
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    displayAnswer(chatArea, question, formatAnswer(data.answer || "⚠ No answer found"), loading);

  } catch (backendError) {
    // ── STEP 5: Backend offline → try Anthropic API ──
    console.log("Backend offline, trying Anthropic API...", backendError.message);
    try {
      const aiText = await askAnthropicAPI(question, selectedSubject);
      displayAnswer(chatArea, question, formatAnswer(aiText), loading);
    } catch (apiError) {
      // ── STEP 6: All network failed → smart offline ──
      console.log("All network failed:", apiError.message);
      loading.remove();
      const msg = generateSmartOfflineAnswer(question, selectedSubject);
      chatArea.innerHTML += `<div class="ai-msg">🤖 ${msg}</div>`;
      speakText(msg.replace(/<[^>]*>/g, ""));
      const key = selectedSubject + "_" + currentChatId;
      const chatData = JSON.parse(localStorage.getItem(key)) || [];
      chatData.push({ q: question, a: msg });
      localStorage.setItem(key, JSON.stringify(chatData));
      renderChatList();
    }
  }

  chatArea.scrollTop = chatArea.scrollHeight;
}
/* ================= VOICE INPUT (FIXED) ================= */
let recognition = null;
let isListening = false;
let currentSpeech = null;
let voiceEnabled = true;

/* Subject → BCP-47 language code mapping */
const SUBJECT_LANG_MAP = {
  "Telugu":    "te-IN",
  "Hindi":     "hi-IN",
  "English":   "en-IN",
  "Maths":     "en-IN",
  "Physics":   "en-IN",
  "Chemistry": "en-IN",
  "Biology":   "en-IN",
  "Social":    "en-IN",
  "Computer":  "en-IN",
};

/* Helper: get/create mic button */
function getMicBtn() {
  return document.querySelector(".mic-btn") ||
         document.querySelector('[onclick="startVoice()"]') ||
         document.querySelector('[onclick*="startVoice"]');
}


/* START VOICE INPUT */
function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("⚠️ Voice input not supported. Please use Google Chrome or Microsoft Edge.");
    return;
  }

  // Stop any existing session first
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }

  recognition = new SpeechRecognition();

  // ✅ FIX 1: Use subject-aware language instead of hardcoded "en-US"
  recognition.lang = SUBJECT_LANG_MAP[selectedSubject] || "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  isListening = true;

  recognition.onstart = () => {
    console.log("🎤 Listening in language:", recognition.lang);
    // ✅ FIX 2: Visual feedback - mic turns red while listening
    const btn = getMicBtn();
    if (btn) {
      btn.style.color = "red";
      btn.title = "🎤 Listening... click Stop to cancel";
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("question").value = transcript;
    console.log("✅ Recognized:", transcript, "| confidence:", event.results[0][0].confidence.toFixed(2));
    isListening = false;

    // Reset mic button
    const btn = getMicBtn();
    if (btn) { btn.style.color = ""; btn.title = ""; }
  };

  recognition.onerror = (event) => {
    console.error("❌ Voice error:", event.error);
    isListening = false;

    const btn = getMicBtn();
    if (btn) { btn.style.color = ""; btn.title = ""; }

    // ✅ FIX 3: Specific helpful error messages for each error type
    if (event.error === "not-allowed") {
      alert("⚠️ Microphone access denied.\n\nFix: Click the 🔒 lock icon in your browser's address bar → Site settings → Allow Microphone.");
    } else if (event.error === "no-speech") {
      // ✅ FIX 4: Don't alert for no-speech, just log it (less annoying)
      console.log("⚠️ No speech detected. Try again.");
    } else if (event.error === "network") {
      alert("⚠️ Network error. Voice recognition needs an active internet connection.");
    } else if (event.error === "aborted") {
      console.log("🎤 Voice recognition was stopped.");
    } else {
      alert("⚠️ Voice error: " + event.error + "\n\nMake sure you are using Chrome or Edge on localhost or HTTPS.");
    }
  };

  recognition.onend = () => {
    console.log("🎤 Stopped listening");
    isListening = false;
    const btn = getMicBtn();
    if (btn) { btn.style.color = ""; btn.title = ""; }
  };

  // ✅ FIX 5: Wrap start() in try/catch to handle race conditions
  try {
    recognition.start();
  } catch(e) {
    console.error("Recognition start failed:", e);
    isListening = false;
    const btn = getMicBtn();
    if (btn) { btn.style.color = ""; }
    alert("⚠️ Could not start voice input. Please wait a moment and try again.");
  }
}

/* STOP VOICE */
function stopVoice() {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }
  window.speechSynthesis.cancel();
  isListening = false;
  const btn = getMicBtn();
  if (btn) { btn.style.color = ""; btn.title = ""; }
  console.log("🛑 Voice stopped");
}

/* ================= SPEAK SYSTEM (FIXED) ================= */
let availableVoices = [];

function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  console.log("🔊 Loaded voices:", availableVoices.length);
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speakText(text) {
  if (!voiceEnabled) return;

  // ✅ FIX 6: Silent return instead of alert when text is empty
  if (!text || text.trim() === "") return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);

  // Detect language from text script
  let targetLang = "en-IN";
  if (/[\u0C00-\u0C7F]/.test(text)) {
    targetLang = "te-IN";  // Telugu script
  } else if (/[\u0900-\u097F]/.test(text)) {
    targetLang = "hi-IN";  // Hindi/Devanagari script
  }

  speech.lang = targetLang;
  speech.rate = 1;
  speech.pitch = 1;
  speech.volume = 1;

  const matchedVoice =
    availableVoices.find(v => v.lang === targetLang) ||
    availableVoices.find(v => v.lang.startsWith(targetLang.split("-")[0])) ||
    availableVoices.find(v => v.lang.startsWith("en"));

  if (matchedVoice) {
    speech.voice = matchedVoice;
    console.log("✅ Using voice:", matchedVoice.name, matchedVoice.lang);
  } else {
    console.log("⚠️ No exact voice found, using browser default.");
  }

  speech.onstart = () => console.log("🔊 Speaking...");
  speech.onend   = () => console.log("✅ Speaking done.");
  // ✅ FIX 7: Silent log instead of alert on speech error
  speech.onerror = (e) => console.error("❌ Speech error:", e.error);

  currentSpeech = speech;
  window.speechSynthesis.speak(speech);
}

function speakInput() {
  const inputText = document.getElementById("question").value.trim();
  if (!inputText) {
    alert("⚠️ Please type something first.");
    return;
  }
  speakText(inputText);
}

/* ================= IMAGE UPLOAD (OCR + AI) ================= */
document.getElementById("imageInput").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  let badge = document.getElementById("fileBadge");
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "fileBadge";
    badge.style.cssText = `
      background: #4CAF50; color: white; padding: 3px 10px;
      border-radius: 12px; font-size: 12px; margin-right: 6px;
      display: inline-flex; align-items: center; gap: 5px;
    `;
    const inputArea = document.querySelector(".chat-input-area");
    const questionInput = document.getElementById("question");
    inputArea.insertBefore(badge, questionInput);
  }
  badge.innerHTML = `📎 ${file.name} <span onclick="clearFile()" style="cursor:pointer; font-weight:bold; margin-left:4px;">✕</span>`;

  const questionInput = document.getElementById("question");
  if (!questionInput.value.trim()) {
    questionInput.placeholder = "Type your question about this file, then press ➤";
    questionInput.focus();
  }
});

function clearFile() {
  document.getElementById("imageInput").value = "";
  const badge = document.getElementById("fileBadge");
  if (badge) badge.remove();
  document.getElementById("question").placeholder = "Ask anything...";
}

async function uploadImage() {
  const fileInput     = document.getElementById("imageInput");
  const chat          = document.getElementById("chatArea");
  const questionInput = document.getElementById("question");
  const file          = fileInput.files[0];
  const question      = questionInput.value.trim();

  if (!file) { alert("⚠️ Please select an image or PDF first."); return; }
  if (!question) {
    questionInput.placeholder = "⚠️ Please type your question first, then press ➤";
    questionInput.focus();
    return;
  }

  const allowedTypes = ["image/jpeg","image/jpg","image/png","image/bmp","image/webp","application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    alert("⚠️ Only JPG, PNG, BMP, WEBP, or PDF files are supported.");
    clearFile(); return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert("⚠️ File too large. Maximum allowed size is 10MB.");
    clearFile(); return;
  }
  if (!selectedSubject) { alert("⚠️ Please select a subject before uploading."); return; }

  chat.innerHTML += `
    <div class="user-msg">
      <div class="msg-text">
        📎 <b>${file.name}</b><br>
        <small style="opacity:0.85;">❓ ${question}</small>
      </div>
    </div>
  `;

  const loadingDiv = document.createElement("div");
  loadingDiv.className = "ai-msg";
  loadingDiv.innerHTML = "🤖 Reading your file and thinking...";
  chat.appendChild(loadingDiv);
  chat.scrollTop = chat.scrollHeight;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", question);

    const res = await fetch("http://127.0.0.1:8000/ask-from-image", { method: "POST", body: formData });

    if (!res.ok) {
      let errMsg = `Server error: ${res.status}`;
      try { const errData = await res.json(); errMsg = errData.detail || errMsg; } catch(_) {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    loadingDiv.remove();

    if (data.extracted_text && data.extracted_text.trim() !== "") {
      const preview = data.extracted_text.length > 250
        ? data.extracted_text.slice(0, 250) + "..."
        : data.extracted_text;
      chat.innerHTML += `
        <div class="ai-msg" style="font-size:0.82em;opacity:0.7;border-left:3px solid #aaa;padding-left:8px;margin-bottom:4px;">
          📄 <b>Extracted Text:</b><br>${preview}
        </div>
      `;
    } else {
      chat.innerHTML += `<div class="ai-msg" style="opacity:0.75;font-size:0.85em;color:orange;">⚠️ Could not extract text clearly. Answer may be limited.</div>`;
    }

    let answer = data.answer || "⚠️ No answer received from AI.";
    answer = answer
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/✅/g, "<br>✅ ")
      .replace(/📘/g, "📘 ");

    chat.innerHTML += `<div class="ai-msg">🤖 ${answer}</div>`;

    const plainAnswer = answer.replace(/<br>/g, " ").replace(/<[^>]*>/g, "").trim();
    speakText(plainAnswer);

    if (currentChatId && selectedSubject) {
      const key = selectedSubject + "_" + currentChatId;
      const chatData = JSON.parse(localStorage.getItem(key)) || [];
      chatData.push({ q: `📎 [${file.name}] ${question}`, a: answer });
      localStorage.setItem(key, JSON.stringify(chatData));
      renderChatList();
    }

  } catch(error) {
    loadingDiv.remove();
    let userMsg = error.message;
    if (error.message.includes("Failed to fetch")) {
      userMsg = "Cannot connect to server. Make sure your backend is running on port 8000.";
    }
    chat.innerHTML += `<div class="ai-msg" style="color:#e74c3c;">⚠️ Error: ${userMsg}</div>`;
    console.error("uploadImage error:", error);
  }

  questionInput.value = "";
  questionInput.placeholder = "Ask anything...";
  clearFile();
  chat.scrollTop = chat.scrollHeight;
}

/* ================= SMART STUDY PLANNER ================= */
function generateStudyPlanner() {
  const name = document.getElementById("studentName").value.trim();
  const studentClass = document.getElementById("studentClass").value.trim();
  const date = document.getElementById("date").value;
  const goal = document.getElementById("studyGoal").value.trim();

  const marks = [
    { subject: "English",         mark: parseFloat(document.getElementById("markEnglish").value)  || 0 },
    { subject: "Maths",           mark: parseFloat(document.getElementById("markMaths").value)     || 0 },
    { subject: "Science",         mark: parseFloat(document.getElementById("markScience").value)   || 0 },
    { subject: "Social",          mark: parseFloat(document.getElementById("markSocial").value)    || 0 },
    { subject: "Computer",        mark: parseFloat(document.getElementById("markComputer").value)  || 0 },
    { subject: "Optional Subject",mark: parseFloat(document.getElementById("markOptional").value)  || 0 }
  ];

  if (!name || !studentClass || !date) {
    alert("⚠️ Please fill Student Name, Class, and Date.");
    return;
  }
  for (let item of marks) {
    if (item.mark < 0 || item.mark > 100) {
      alert(`⚠️ Please enter valid marks for ${item.subject} between 0 and 100.`);
      return;
    }
  }

  const total   = marks.reduce((sum, item) => sum + item.mark, 0);
  const average = (total / marks.length).toFixed(2);

  let performance = "", performanceClass = "", tips = [], dailyPlan = [];

  if (average >= 90) {
    performance = "🌟 Excellent"; performanceClass = "excellent-performance";
    tips = ["Maintain your strong study routine.","Solve advanced-level questions regularly.","Take weekly mock tests to stay sharp.","Revise important concepts every weekend.","Avoid overconfidence and stay consistent."];
    dailyPlan = ["📘 1 hour concept revision","🧠 45 mins mock test / problem solving","📝 30 mins short notes revision","📚 30 mins weak topic polishing"];
  } else if (average >= 75) {
    performance = "✅ Good"; performanceClass = "good-performance";
    tips = ["You are doing well, but consistency is key.","Focus more on high-weight chapters.","Practice writing answers neatly and quickly.","Revise weekly to avoid forgetting topics.","Take subject-wise mini tests."];
    dailyPlan = ["📘 1 hour subject revision","✍️ 45 mins practice questions","📚 30 mins revision of previous topics","🎯 20 mins goal-based improvement"];
  } else if (average >= 50) {
    performance = "⚠️ Average"; performanceClass = "average-performance";
    tips = ["You need more consistency in daily study.","Spend extra time on weak subjects.","Practice textbook and previous paper questions.","Use short notes and flashcards for revision.","Study in small focused sessions every day."];
    dailyPlan = ["📘 45 mins concept learning","✍️ 45 mins practice","🔁 30 mins revision","🧠 20 mins memorization / formulas"];
  } else {
    performance = "❌ Poor"; performanceClass = "poor-performance";
    tips = ["Start with basics before difficult topics.","Study daily for short sessions instead of long stressful hours.","Focus first on your weakest subjects.","Ask teachers or friends whenever you have doubts.","Revise every day and practice simple questions first."];
    dailyPlan = ["📘 30 mins basics learning","✍️ 30 mins easy practice questions","🔁 20 mins revision","🧠 20 mins formulas / definitions","📚 20 mins weak subject support"];
  }

  const sortedMarks   = [...marks].sort((a, b) => a.mark - b.mark);
  const weakSubjects  = sortedMarks.slice(0, 2);
  const strongSubjects = [...marks].sort((a, b) => b.mark - a.mark).slice(0, 2);
  const marksHTML     = marks.map(item => `<div class="subject-result-card"><h4>${item.subject}</h4><p>${item.mark} / 100</p></div>`).join("");
  const tipsHTML      = tips.map(tip => `<li>${tip}</li>`).join("");
  const planHTML      = dailyPlan.map(item => `<li>${item}</li>`).join("");

  document.getElementById("plannerOutput").innerHTML = `
    <div class="planner-result-card">
      <div class="student-summary">
        <h2>👩‍🎓 ${name}'s Study Report</h2>
        <p><b>Class:</b> ${studentClass}</p>
        <p><b>Date:</b> ${date}</p>
        <p><b>Goal:</b> ${goal || "No specific goal entered"}</p>
      </div>
      <div class="performance-box ${performanceClass}">
        <h2>${performance}</h2>
        <p>Average Marks: <b>${average}%</b></p>
      </div>
      <div class="marks-result-grid">${marksHTML}</div>
      <div class="strength-weak-grid">
        <div class="analysis-box weak-box">
          <h3>📉 Weak Subjects</h3>
          <ul><li>${weakSubjects[0].subject} (${weakSubjects[0].mark})</li><li>${weakSubjects[1].subject} (${weakSubjects[1].mark})</li></ul>
        </div>
        <div class="analysis-box strong-box">
          <h3>📈 Strong Subjects</h3>
          <ul><li>${strongSubjects[0].subject} (${strongSubjects[0].mark})</li><li>${strongSubjects[1].subject} (${strongSubjects[1].mark})</li></ul>
        </div>
      </div>
      <div class="tips-plan-grid">
        <div class="tips-box"><h3>💡 Personalized Study Tips</h3><ul>${tipsHTML}</ul></div>
        <div class="daily-plan-box"><h3>📅 Recommended Daily Study Plan</h3><ul>${planHTML}</ul></div>
      </div>
      <div class="weekly-plan-box">
        <h3>🗓️ Weekly Study Strategy</h3>
        <div class="weekly-grid">
          <div class="week-day">Mon<br><span>${weakSubjects[0].subject}</span></div>
          <div class="week-day">Tue<br><span>${weakSubjects[1].subject}</span></div>
          <div class="week-day">Wed<br><span>Revision</span></div>
          <div class="week-day">Thu<br><span>${strongSubjects[0].subject}</span></div>
          <div class="week-day">Fri<br><span>${strongSubjects[1].subject}</span></div>
          <div class="week-day">Sat<br><span>Mock Test</span></div>
          <div class="week-day">Sun<br><span>Light Revision</span></div>
        </div>
      </div>
    </div>
  `;
}

function toggleComplete(element){
  element.style.textDecoration =
    element.style.textDecoration === "line-through" ? "none" : "line-through";
}

/* ================= QUIZ ================= */
let currentQ = 0;
let score = 0;

const questions = [
{q:"Value of π (approx)?", options:["3.12","3.14","3.16","3.18"], answer:"3.14"},
{q:"√144?", options:["10","11","12","13"], answer:"12"},
{q:"HCF of 12 & 18?", options:["3","6","9","12"], answer:"6"},
{q:"Chemical symbol of Sodium?", options:["So","Na","S","N"], answer:"Na"},
{q:"Speed of light?", options:["3×10^8 m/s","3×10^6 m/s","3×10^5 m/s","3×10^3 m/s"], answer:"3×10^8 m/s"},
{q:"Who proposed relativity?", options:["Newton","Einstein","Bohr","Tesla"], answer:"Einstein"},
{q:"Atomic number of Carbon?", options:["4","6","8","12"], answer:"6"},
{q:"pH of neutral substance?", options:["5","6","7","8"], answer:"7"},
{q:"Largest gland in body?", options:["Heart","Liver","Kidney","Lung"], answer:"Liver"},
{q:"Unit of power?", options:["Joule","Watt","Newton","Volt"], answer:"Watt"},
{q:"(a+b)^2 formula?", options:["a²+b²","a²+2ab+b²","a²-2ab+b²","2a+b"], answer:"a²+2ab+b²"},
{q:"Area of circle?", options:["πr²","2πr","πd","r²"], answer:"πr²"},
{q:"Photosynthesis equation needs?", options:["O2","CO2","N2","H2"], answer:"CO2"},
{q:"SI unit of force?", options:["Watt","Joule","Newton","Pascal"], answer:"Newton"},
{q:"Which is not metal?", options:["Iron","Gold","Oxygen","Copper"], answer:"Oxygen"},
{q:"Longest bone?", options:["Femur","Tibia","Fibula","Humerus"], answer:"Femur"},
{q:"Resistance unit?", options:["Volt","Ampere","Ohm","Watt"], answer:"Ohm"},
{q:"Who discovered electron?", options:["Bohr","Rutherford","Thomson","Newton"], answer:"Thomson"},
{q:"Largest desert?", options:["Sahara","Thar","Gobi","Kalahari"], answer:"Sahara"},
{q:"Synonym of rapid?", options:["Slow","Fast","Weak","Late"], answer:"Fast"},
{q:"10^2?", options:["10","100","1000","10000"], answer:"100"},
{q:"Angle in straight line?", options:["90°","180°","270°","360°"], answer:"180°"},
{q:"Electric current unit?", options:["Volt","Ohm","Ampere","Watt"], answer:"Ampere"},
{q:"Cell powerhouse?", options:["Nucleus","Mitochondria","Ribosome","Golgi"], answer:"Mitochondria"},
{q:"Boiling point of water (K)?", options:["273K","373K","100K","200K"], answer:"373K"},
{q:"Who wrote Constitution of India?", options:["Nehru","Ambedkar","Gandhi","Patel"], answer:"Ambedkar"},
{q:"Largest island?", options:["Greenland","Australia","Borneo","Madagascar"], answer:"Greenland"},
{q:"Antonym of expand?", options:["Grow","Increase","Shrink","Spread"], answer:"Shrink"},
{q:"Gas used in balloons?", options:["Oxygen","Hydrogen","Helium","Nitrogen"], answer:"Helium"},
{q:"Unit of pressure?", options:["Pascal","Newton","Joule","Watt"], answer:"Pascal"},
{q:"Factor of 36?", options:["5","6","7","8"], answer:"6"},
{q:"Lens used for myopia?", options:["Convex","Concave","Plane","None"], answer:"Concave"},
{q:"DNA full form?", options:["Deoxyribo Nucleic Acid","Dynamic Acid","Double Acid","None"], answer:"Deoxyribo Nucleic Acid"},
{q:"Which vitamin from sun?", options:["A","B","C","D"], answer:"D"},
{q:"First law of motion by?", options:["Newton","Einstein","Galileo","Kepler"], answer:"Newton"},
{q:"Metal that rusts?", options:["Gold","Iron","Silver","Copper"], answer:"Iron"},
{q:"Plural of analysis?", options:["Analysises","Analyses","Analysis","Analys"], answer:"Analyses"},
{q:"World war II ended?", options:["1942","1945","1939","1950"], answer:"1945"},
{q:"Largest volcano?", options:["Mauna Loa","Etna","Fuji","Krakatoa"], answer:"Mauna Loa"},
{q:"Energy stored in food?", options:["Kinetic","Potential","Chemical","Heat"], answer:"Chemical"},
{q:"LCM of 4 & 6?", options:["10","12","14","16"], answer:"12"},
{q:"Refraction occurs in?", options:["Vacuum","Medium","Space","None"], answer:"Medium"},
{q:"Human normal temp?", options:["35°C","37°C","40°C","42°C"], answer:"37°C"},
{q:"Currency of Japan?", options:["Dollar","Yen","Euro","Won"], answer:"Yen"},
{q:"Gas for respiration?", options:["CO2","Oxygen","Nitrogen","Hydrogen"], answer:"Oxygen"},
{q:"Simple interest formula?", options:["PTR/100","P+R+T","PRT","P/T"], answer:"PTR/100"},
{q:"Sound speed faster in?", options:["Air","Water","Solid","Vacuum"], answer:"Solid"},
{q:"Largest organ?", options:["Heart","Skin","Liver","Brain"], answer:"Skin"},
{q:"Who invented telephone?", options:["Bell","Edison","Newton","Tesla"], answer:"Bell"},
{q:"Angle less than 90°?", options:["Obtuse","Right","Acute","Straight"], answer:"Acute"}
];

function startQuiz(){
  document.querySelector(".quiz-start-screen").style.display = "none";
  currentQ = 0; score = 0;
  showQuestion();
}

function showQuestion(){
  const q = questions[currentQ];
  let html = `<div class="quiz-card"><h3>Q${currentQ+1}. ${q.q}</h3><div class="options">`;
  q.options.forEach(opt => {
    html += `<button class="option-btn" onclick="selectAnswer('${opt}')">${opt}</button>`;
  });
  html += `</div></div>`;
  document.getElementById("quizArea").innerHTML = html;
}

function selectAnswer(ans){
  if(ans === questions[currentQ].answer) score++;
  currentQ++;
  if(currentQ < questions.length){
    showQuestion();
  } else {
    document.getElementById("quizArea").innerHTML = "";
    document.getElementById("resultBox").innerHTML = `
      <div class="result">
        🎉 Your Score: ${score}/${questions.length}
        <br><br>
        <button class="start-btn" onclick="location.reload()">Play Again</button>
      </div>
    `;
  }
}

/* ================= PUZZLE ================= */
const words = [
"grammar","noun","verb","adjective","adverb","sentence","paragraph","poetry","prose","synonym",
"antonym","tense","voice","clause","phrase","history","culture","society","economy","government",
"democracy","constitution","citizen","rights","duties","geography","climate","continent","population","trade",
"addition","subtraction","multiplication","division","fraction","decimal","percentage","ratio","equation","algebra",
"geometry","angle","triangle","circle","perimeter","experiment","hypothesis","theory","observation","research",
"matter","energy","force","motion","element","compound","mixture","reaction","lab","analysis",
"velocity","acceleration","gravity","friction","pressure","work","power","energy","wave","sound",
"light","reflection","refraction","electricity","magnetism","cell","tissue","organ","system","organism",
"photosynthesis","respiration","digestion","circulation","enzyme","dna","gene","evolution","species","habitat",
"ecosystem","biodiversity","atom","molecule","neutron","proton","electron","formula","solution","density"
];
let currentWord = "";

function scramble(word){ return word.split('').sort(()=>Math.random()-0.5).join(''); }

function newPuzzle(){
  currentWord = words[Math.floor(Math.random()*words.length)];
  document.getElementById("scrambledWord").innerText = scramble(currentWord).toUpperCase();
  document.getElementById("userAnswer").value = "";
  document.getElementById("puzzleResult").innerText = "";
}

function checkPuzzle(){
  let user = document.getElementById("userAnswer").value.toLowerCase();
  if(user === currentWord){
    document.getElementById("puzzleResult").innerText = "✅ Correct!";
    document.getElementById("puzzleResult").style.color = "green";
  } else {
    document.getElementById("puzzleResult").innerText = "❌ Try Again!";
    document.getElementById("puzzleResult").style.color = "red";
  }
}

window.addEventListener("load", function () {
  newPuzzle();
  updateStreak();
  renderChatList();
  updateDisplay();
  // Load last selected subject chat if available
if (selectedSubject) {
  const savedChat = localStorage.getItem(selectedSubject + "_currentChatId");
  if (savedChat) {
    loadChat(savedChat);
  }
}
  if (localStorage.getItem("theme") === "dark") { document.body.classList.add("dark-mode"); }
});

function savePlanner(){
  const name = document.getElementById("studentName").value;
  const date = document.getElementById("date").value;
  alert("✅ Plan saved for " + name + " on " + date);
}

/* ================= GRAMMAR CHECK ================= */
async function checkGrammar() {
  let text = document.getElementById("grammarInput").value.trim();

  if (text === "") {
    document.getElementById("grammarResult").innerText = "⚠️ Please enter a sentence";
    return;
  }

  document.getElementById("grammarResult").innerText = "⏳ Checking...";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("http://127.0.0.1:8000/grammar-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await res.json();
    document.getElementById("grammarResult").innerHTML =
      `✅ Corrected: <b>${data.corrected_text}</b>`;

  } catch (error) {
    // ── Backend offline: try Anthropic API first ──
    try {
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a grammar correction assistant. 
                   The user will give you a sentence with grammar mistakes. 
                   Reply with ONLY the corrected sentence — no explanation, no extra text.`,
          messages: [{ role: "user", content: text }]
        })
      });

      if (!aiResponse.ok) throw new Error("API error");

      const aiData = await aiResponse.json();
      const corrected = aiData.content
        .map(item => item.type === "text" ? item.text : "")
        .filter(Boolean)
        .join("").trim();

      document.getElementById("grammarResult").innerHTML =
        `✅ Corrected: <b>${corrected}</b>`;

    } catch (apiError) {
      // ── Both offline: use local fallback_grammar ──
      let input = text.toLowerCase().trim();
      let corrected = text;

      for (let item of fallback_grammar) {
        if (
          input === item[0] ||
          input.includes(item[0]) ||
          item[0].includes(input)
        ) {
          corrected = item[1];
          break;
        }
      }

      document.getElementById("grammarResult").innerHTML =
        `✅ Corrected: <b>${corrected}</b>`;
    }
  }
}
  

function openVideo(videoId){ window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank"); }

let flashcards = [];
let currentIndex = 0;

function addFlashcard(){
  const q = document.getElementById("questionInput").value;
  const a = document.getElementById("answerInput").value;
  if(!q || !a) return alert("Enter both question and answer");
  flashcards.push({q,a});
  document.getElementById("questionInput").value = "";
  document.getElementById("answerInput").value = "";
  currentIndex = flashcards.length - 1;
  showCard();
  updateFlashList();
}

function showCard(){
  if(flashcards.length === 0){
    document.getElementById("cardQuestion").innerText = "No cards yet";
    document.getElementById("cardAnswer").innerText = "";
    return;
  }
  document.getElementById("cardQuestion").innerText = flashcards[currentIndex].q;
  document.getElementById("cardAnswer").innerText = flashcards[currentIndex].a;
  document.getElementById("flashcard").classList.remove("flip");
}

function flipCard(){ document.getElementById("flashcard").classList.toggle("flip"); }
function nextCard(){ if(currentIndex < flashcards.length - 1){ currentIndex++; showCard(); } }
function prevCard(){ if(currentIndex > 0){ currentIndex--; showCard(); } }
function deleteCard(){
  if(flashcards.length === 0) return;
  flashcards.splice(currentIndex, 1);
  if(currentIndex > 0) currentIndex--;
  showCard(); updateFlashList();
}

function updateFlashList(){
  const list = document.getElementById("flashList");
  list.innerHTML = "";
  flashcards.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = "flash-mini-card";
    div.innerText = card.q;
    div.onclick = function(){
      if(div.classList.contains("back")){ div.classList.remove("back"); div.innerText = card.q; }
      else { div.classList.add("back"); div.innerText = card.a; }
    };
    list.appendChild(div);
  });
}

let time = 1500;
let timerInterval;

function updateDisplay() {
  let min = Math.floor(time / 60);
  let sec = time % 60;
  document.getElementById("timer").innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (time > 0) { time--; updateDisplay(); }
    else { alert("Time's up!"); clearInterval(timerInterval); }
  }, 1000);
}

function pauseTimer() { clearInterval(timerInterval); timerInterval = null; }
function resetTimer() { pauseTimer(); time = 1500; updateDisplay(); }
function toggleDark(){ document.body.classList.toggle("dark-mode"); }

let draggedItem = null;

document.querySelectorAll(".drag-item").forEach(item => {
  item.addEventListener("dragstart", function () { draggedItem = this; });
});

document.querySelectorAll(".drop-box").forEach(box => {
  box.addEventListener("dragover", function (e) { e.preventDefault(); });
  box.addEventListener("drop", function () {
    if (!this.querySelector(".drag-item")) { this.appendChild(draggedItem); }
  });
});

function checkDragQuiz() {
  let correct = 0;
  document.querySelectorAll(".drop-box").forEach(box => {
    const item = box.querySelector(".drag-item");
    if (item && item.innerText === box.dataset.match) { correct++; box.style.background = "#c8f7c5"; }
    else { box.style.background = "#f7c5c5"; }
  });
  document.getElementById("dragResult").innerText = `Score: ${correct}/3`;
}

function loadGeo(type) {
  const result = document.getElementById("geoResult");
  result.innerHTML = "";
  let data = [];
  if(type === "countries"){ data = [{name:"Afghanistan",capital:"Kabul"},{name:"India",capital:"New Delhi"},{name:"USA",capital:"Washington DC"},{name:"Japan",capital:"Tokyo"},{name:"France",capital:"Paris"},{name:"Brazil",capital:"Brasília"},{name:"Australia",capital:"Canberra"},{name:"Canada",capital:"Ottawa"},{name:"China",capital:"Beijing"},{name:"Russia",capital:"Moscow"}]; }
  if(type === "india"){ data = [{name:"Andhra Pradesh",capital:"Amaravati"},{name:"Arunachal Pradesh",capital:"Itanagar"},{name:"Assam",capital:"Dispur"},{name:"Bihar",capital:"Patna"},{name:"Chhattisgarh",capital:"Raipur"},{name:"Goa",capital:"Panaji"},{name:"Gujarat",capital:"Gandhinagar"},{name:"Haryana",capital:"Chandigarh"},{name:"Himachal Pradesh",capital:"Shimla"},{name:"Jharkhand",capital:"Ranchi"},{name:"Karnataka",capital:"Bengaluru"},{name:"Kerala",capital:"Thiruvananthapuram"},{name:"Madhya Pradesh",capital:"Bhopal"},{name:"Maharashtra",capital:"Mumbai"},{name:"Manipur",capital:"Imphal"},{name:"Meghalaya",capital:"Shillong"},{name:"Mizoram",capital:"Aizawl"},{name:"Nagaland",capital:"Kohima"},{name:"Odisha",capital:"Bhubaneswar"},{name:"Punjab",capital:"Chandigarh"},{name:"Rajasthan",capital:"Jaipur"},{name:"Sikkim",capital:"Gangtok"},{name:"Tamil Nadu",capital:"Chennai"},{name:"Telangana",capital:"Hyderabad"},{name:"Tripura",capital:"Agartala"},{name:"Uttar Pradesh",capital:"Lucknow"},{name:"Uttarakhand",capital:"Dehradun"},{name:"West Bengal",capital:"Kolkata"}]; }
  if(type === "oceans"){ data = [{name:"Pacific Ocean"},{name:"Atlantic Ocean"},{name:"Indian Ocean"},{name:"Arctic Ocean"},{name:"Southern Ocean"}]; }
  if(type === "continents"){ data = [{name:"Asia"},{name:"Europe"},{name:"Africa"},{name:"North America"},{name:"South America"},{name:"Australia"},{name:"Antarctica"}]; }
  if(type === "deserts"){ data = [{name:"Sahara Desert"},{name:"Thar Desert"},{name:"Gobi Desert"},{name:"Kalahari Desert"},{name:"Patagonian Desert"},{name:"Arabian Desert"}]; }
  if(type === "rivers"){ data = [{name:"Ganga"},{name:"Yamuna"},{name:"Brahmaputra"},{name:"Indus"},{name:"Nile"},{name:"Amazon"},{name:"Yangtze"},{name:"Mississippi"}]; }
  if(type === "places"){ data = [{name:"Taj Mahal"},{name:"Charminar"},{name:"Red Fort"},{name:"Gateway of India"},{name:"Qutub Minar"},{name:"Mysore Palace"},{name:"India Gate"},{name:"Meenakshi Temple"},{name:"Golden Temple"},{name:"Hawa Mahal"},{name:"Ajanta & Ellora Caves"}]; }
  data.forEach(item => {
    result.innerHTML += `<div class="geo-item"><h4>${item.name}</h4>${item.capital ? `<p>Capital: ${item.capital}</p>` : ""}</div>`;
  });
}

const scienceData = {
  physics:     [{name:"Gravity",info:"Force that attracts objects toward Earth"},{name:"Velocity",info:"Speed with direction"},{name:"Energy",info:"Ability to do work"},{name:"Force",info:"Push or pull acting on an object"},{name:"Electricity",info:"Flow of electric charge"}],
  chemistry:   [{name:"Atom",info:"Basic unit of matter"},{name:"Molecule",info:"Group of atoms bonded together"},{name:"Element",info:"Pure substance made of one type of atom"},{name:"Compound",info:"Combination of elements"},{name:"Reaction",info:"Process where substances change"}],
  biology:     [{name:"Cell",info:"Basic unit of life"},{name:"DNA",info:"Genetic material of organisms"},{name:"Photosynthesis",info:"Plants make food using sunlight"},{name:"Respiration",info:"Energy release process"},{name:"Organism",info:"Living being"}],
  space:       [{name:"Sun",info:"Star at center of solar system"},{name:"Moon",info:"Earth's natural satellite"},{name:"Planet",info:"Body orbiting a star"},{name:"Galaxy",info:"System of stars and planets"},{name:"Black Hole",info:"Region with strong gravity"}],
  environment: [{name:"Ecosystem",info:"Living + non-living interaction"},{name:"Pollution",info:"Harmful substances in environment"},{name:"Climate",info:"Weather over long period"},{name:"Biodiversity",info:"Variety of life forms"},{name:"Conservation",info:"Protection of nature"}],
  inventions:  [{name:"Electric Bulb",info:"Invented by Thomas Edison"},{name:"Telephone",info:"Invented by Alexander Graham Bell"},{name:"Internet",info:"Global network system"},{name:"Computer",info:"Electronic computing device"},{name:"Airplane",info:"Invented by Wright brothers"}]
};

function loadScience(type){
  const result = document.getElementById("geoResult");
  result.innerHTML = "";
  const data = scienceData[type];
  if(!data) return;
  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "geo-item";
    div.innerHTML = `<h4>${item.name}</h4><p>${item.info}</p>`;
    result.appendChild(div);
  });
}

function toggleSidebar(){
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main");
  sidebar.classList.toggle("hidden");
  main.classList.toggle("full");
  sidebar.classList.toggle("hide");
}

function toggleProfileMenu(){ document.getElementById("profileMenu").classList.toggle("show"); }
function editProfile(){ alert("Edit Profile"); }
function openSettings(){ alert("Settings"); }

document.addEventListener("click", function(e){
  const menu    = document.getElementById("profileMenu");
  const profile = document.querySelector(".profile-circle");
  if(!profile.contains(e.target) && !menu.contains(e.target)){ menu.classList.remove("show"); }
});

/* ================= GRAMMAR TOPIC DISPLAY ================= */
function openGrammarTopic(topic) {
  const display = document.getElementById("grammarTopicDisplay");

  if (topic === "tenses") {
    display.innerHTML = `
      <div class="grammar-topic-box">
        <h2 class="topic-main-title">📘 Tenses Chart</h2>
        <div class="tense-wrapper">
          <div class="tense-column present"><h3>Present Tenses</h3>
            <div class="tense-card-box"><h4>Simple Present Tense</h4><p><b>Structure:</b> Subject + V1 + Object</p><p><b>Example:</b> I always speak the truth.</p></div>
            <div class="tense-card-box"><h4>Present Continuous Tense</h4><p><b>Structure:</b> Subject + is/am/are + V1 + ing + Object</p><p><b>Example:</b> Ali is riding a bicycle.</p></div>
            <div class="tense-card-box"><h4>Present Perfect Tense</h4><p><b>Structure:</b> Subject + has/have + V3 + Object</p><p><b>Example:</b> The sun has set.</p></div>
            <div class="tense-card-box"><h4>Present Perfect Continuous Tense</h4><p><b>Structure:</b> Subject + has/have + been + V1 + ing + since/for</p><p><b>Example:</b> The sun has been shining since morning.</p></div>
          </div>
          <div class="tense-column past"><h3>Past Tenses</h3>
            <div class="tense-card-box"><h4>Simple Past Tense</h4><p><b>Structure:</b> Subject + V2 + Object</p><p><b>Example:</b> We went to the zoo yesterday.</p></div>
            <div class="tense-card-box"><h4>Past Continuous Tense</h4><p><b>Structure:</b> Subject + was/were + V1 + ing + Object</p><p><b>Example:</b> He was smiling.</p></div>
            <div class="tense-card-box"><h4>Past Perfect Tense</h4><p><b>Structure:</b> Subject + had + V3 + Object</p><p><b>Example:</b> They had already finished their work.</p></div>
            <div class="tense-card-box"><h4>Past Perfect Continuous Tense</h4><p><b>Structure:</b> Subject + had been + V1 + ing + since/for</p><p><b>Example:</b> The carpenter had been making chairs for many days.</p></div>
          </div>
          <div class="tense-column future"><h3>Future Tenses</h3>
            <div class="tense-card-box"><h4>Simple Future Tense</h4><p><b>Structure:</b> Subject + will/shall + V1 + Object</p><p><b>Example:</b> You will pass the examination.</p></div>
            <div class="tense-card-box"><h4>Future Continuous Tense</h4><p><b>Structure:</b> Subject + will/shall + be + V1 + ing + Object</p><p><b>Example:</b> They will be visiting the zoo.</p></div>
            <div class="tense-card-box"><h4>Future Perfect Tense</h4><p><b>Structure:</b> Subject + will/shall + have + V3 + Object</p><p><b>Example:</b> I shall have finished my homework.</p></div>
            <div class="tense-card-box"><h4>Future Perfect Continuous Tense</h4><p><b>Structure:</b> Subject + will/shall + have been + V1 + ing + since/for</p><p><b>Example:</b> She will have been sleeping since evening.</p></div>
          </div>
        </div>
      </div>`;
  }
  else if (topic === "parts") {
    display.innerHTML = `
      <div class="grammar-topic-box">
        <h2 class="topic-main-title">🧩 Parts of Speech</h2>
        <div class="parts-grid">
          <div class="part-card noun"><h3>Noun</h3><p><b>Definition:</b> A word that names a person, place, thing, or idea.</p><p><b>Examples:</b> cat, John, park, happiness</p></div>
          <div class="part-card pronoun"><h3>Pronoun</h3><p><b>Definition:</b> A word that takes the place of a noun.</p><p><b>Examples:</b> she, they, it</p></div>
          <div class="part-card verb"><h3>Verb</h3><p><b>Definition:</b> A word that expresses action or state of being.</p><p><b>Examples:</b> runs, sings, are</p></div>
          <div class="part-card adjective"><h3>Adjective</h3><p><b>Definition:</b> A word that describes a noun.</p><p><b>Examples:</b> fluffy, tall, delicious</p></div>
          <div class="part-card adverb"><h3>Adverb</h3><p><b>Definition:</b> A word that modifies a verb, adjective, or adverb.</p><p><b>Examples:</b> beautifully, quickly, confidently</p></div>
          <div class="part-card preposition"><h3>Preposition</h3><p><b>Definition:</b> Shows relationship of a noun/pronoun to another word.</p><p><b>Examples:</b> under, through, beside</p></div>
          <div class="part-card conjunction"><h3>Conjunction</h3><p><b>Definition:</b> Connects words, phrases, or clauses.</p><p><b>Examples:</b> and, or, because</p></div>
          <div class="part-card interjection"><h3>Interjection</h3><p><b>Definition:</b> A word that expresses emotion or exclamation.</p><p><b>Examples:</b> wow!, ouch!, yay!</p></div>
        </div>
      </div>`;
  }
  else if (topic === "voice") {
    display.innerHTML = `
      <div class="grammar-topic-box">
        <h2 class="topic-main-title">🔄 Active & Passive Voice</h2>
        <div class="voice-grid">
          <div class="voice-card active-box">
            <h3>Active Voice</h3><p>Tells us what a <b>person or thing does</b>.</p><p>The subject performs the action on the object.</p><p class="formula">Subject + Verb + Object</p>
            <h4>Examples:</h4><ul><li>Anna painted the house.</li><li>The teacher answers the student's questions.</li><li>Ali posted the video online.</li></ul>
          </div>
          <div class="voice-card passive-box">
            <h3>Passive Voice</h3><p>Tells us what is <b>done to someone or something</b>.</p><p>The subject is being acted upon.</p><p class="formula">Object + Verb + Subject</p>
            <h4>Examples:</h4><ul><li>The house was painted by Anna.</li><li>The student's questions are answered by the teacher.</li><li>The video was posted online by Ali.</li></ul>
          </div>
        </div>
      </div>`;
  }
  else if (topic === "vocabulary") {
    display.innerHTML = `
      <div class="grammar-topic-box">
        <h2 class="topic-main-title">📚 Vocabulary Levels</h2>
        <div class="vocab-grid">
          <div class="vocab-card beginner"><h3>Beginner</h3><ul><li>keep</li><li>run</li><li>walk</li><li>wait</li><li>happy</li><li>sad</li><li>afraid</li><li>tiny</li><li>cold</li><li>big</li></ul></div>
          <div class="vocab-card intermediate"><h3>Intermediate</h3><ul><li>hold</li><li>jog</li><li>stroll</li><li>delay</li><li>glad</li><li>anxious</li><li>starving</li><li>clear</li><li>massive</li><li>simple</li></ul></div>
          <div class="vocab-card advanced"><h3>Advanced</h3><ul><li>retain</li><li>sprint</li><li>wander</li><li>postpone</li><li>delighted</li><li>terrified</li><li>famished</li><li>enormous</li><li>intricate</li><li>effortless</li></ul></div>
        </div>
      </div>`;
  }
  else if (topic === "punctuation") {
    display.innerHTML = `
      <div class="grammar-topic-box">
        <h2 class="topic-main-title">✍️ Punctuation Marks</h2>
        <div class="punctuation-grid">
          <div class="punc-card"><h3>Period (.)</h3><p>Sophia loves playing hockey.</p></div>
          <div class="punc-card"><h3>Question Mark (?)</h3><p>Are you hungry?</p></div>
          <div class="punc-card"><h3>Comma (,)</h3><p>I like novels, stories, plays, and poems.</p></div>
          <div class="punc-card"><h3>Exclamation Mark (!)</h3><p>Wow! What a lovely scene!</p></div>
          <div class="punc-card"><h3>Colon (:)</h3><p>She likes three countries: Italy, USA, and UAE.</p></div>
          <div class="punc-card"><h3>Semicolon (;)</h3><p>I will not prefer cola; I will drink juice.</p></div>
          <div class="punc-card"><h3>Braces { }</h3><p>Choose one of three colors {red, pink, black}.</p></div>
          <div class="punc-card"><h3>Parentheses ( )</h3><p>I love to visit UK (United Kingdom).</p></div>
          <div class="punc-card"><h3>Dashes (—)</h3><p>USA—Japan is almost 13 hours long flight.</p></div>
          <div class="punc-card"><h3>Brackets [ ]</h3><p>She [Jenny] is crazy for driving a truck.</p></div>
          <div class="punc-card"><h3>Hyphen (-)</h3><p>I love ice-cream.</p></div>
          <div class="punc-card"><h3>Quotation Marks (" ")</h3><p>Ali asked, "When can I put the pen back?"</p></div>
          <div class="punc-card"><h3>Ellipsis (...)</h3><p>Julie... Julie is the girl who...</p></div>
          <div class="punc-card"><h3>Apostrophe (')</h3><p>Roger's dog is weak.</p></div>
        </div>
      </div>`;
  }
  else if (topic === "sentence") {
    display.innerHTML = `
      <div class="grammar-topic-box">
        <h2 class="topic-main-title">📝 Sentence Structures</h2>
        <div class="sentence-grid">
          <div class="sentence-card simple-box"><h3>Simple Sentence</h3><p><b>1 Independent Clause</b></p><p class="example">Children played.</p></div>
          <div class="sentence-card compound-box"><h3>Compound Sentence</h3><p><b>2 Independent Clauses</b></p><p class="example">Children played, and their parents chatted.</p></div>
          <div class="sentence-card complex-box"><h3>Complex Sentence</h3><p><b>1 Independent Clause + 1 or More Dependent Clauses</b></p><p class="example">Children played after the rain stopped.</p></div>
          <div class="sentence-card compoundcomplex-box"><h3>Compound-Complex Sentence</h3><p><b>2 or More Independent Clauses + 1 or More Dependent Clauses</b></p><p class="example">After the rain stopped, the children played, and their parents chatted.</p></div>
        </div>
      </div>`;
  }
}

const fallback_qa = {
  math: [
    ["2+2", "2 + 2 = 4"],
    ["20+90", "20 + 90 = 110"],
    ["solve 5x = 20", "x = 4"],
    ["x + 7 = 12", "x = 5"],
    ["2x + 3 = 11", "x = 4"],
    ["what is (a+b)²", "(a+b)² = a² + 2ab + b²"],
    ["what is (a-b)²", "(a-b)² = a² - 2ab + b²"],
    ["quadratic equation", "A quadratic equation is: ax² + bx + c = 0"],
    ["x² = 16", "x = ±4"],
    ["slope formula", "(y₂ - y₁) / (x₂ - x₁)"],
    ["area of circle", "Area of circle = πr²"],
    ["perimeter of rectangle", "Perimeter of rectangle = 2(l + b)"],
    ["probability", "Probability = Favorable outcomes / Total outcomes"],
    ["mean", "Mean = Sum of values / Number of values"],
    ["matrix", "A matrix is a rectangular array of numbers"],
    ["pythagoras theorem", "Pythagoras theorem: a² + b² = c²"]
  ],

  physics: [
    ["force", "Force = mass × acceleration"],
    ["velocity", "Velocity is speed with direction"],
    ["acceleration", "Acceleration is rate of change of velocity"],
    ["newton first law", "An object remains at rest or in motion unless acted upon by force"],
    ["energy", "Energy is the ability to do work"],
    ["unit of force", "Unit of force is Newton"],
    ["work formula", "Work = Force × Distance"],
    ["power formula", "Power = Work / Time"],
    ["speed formula", "Speed = Distance / Time"],
    ["gravity", "Gravity is the force that attracts objects toward Earth"]
  ],

  chemistry: [
    ["atom", "Atom is the smallest unit of matter"],
    ["molecule", "A molecule is a group of atoms"],
    ["ph", "pH measures acidity or basicity"],
    ["acid", "An acid donates H⁺ ions"],
    ["base", "A base accepts H⁺ ions"],
    ["periodic table", "Periodic table is the arrangement of elements"],
    ["compound", "A compound is a combination of elements"],
    ["valency", "Valency is the combining capacity of an element"],
    ["oxidation", "Oxidation means loss of electrons"],
    ["reduction", "Reduction means gain of electrons"]
  ],

  biology: [
    ["cell", "Cell is the basic unit of life"],
    ["dna", "DNA is the genetic material"],
    ["photosynthesis", "Photosynthesis is the process by which plants make food using sunlight"],
    ["respiration", "Respiration is the process of releasing energy from food"],
    ["tissue", "A tissue is a group of similar cells"],
    ["organ", "An organ is a group of tissues"],
    ["ecosystem", "An ecosystem includes living and non-living things interacting"],
    ["digestion", "Digestion is the process of breaking down food"],
    ["blood", "Blood transports oxygen and nutrients"],
    ["enzyme", "An enzyme is a biological catalyst"]
  ],

  english: [
    ["noun", "A noun is the name of a person, place, thing, or idea"],
    ["verb", "A verb is an action or state word"],
    ["adjective", "An adjective describes a noun"],
    ["sentence", "A sentence is a complete meaningful statement"],
    ["pronoun", "A pronoun replaces a noun"],
    ["adverb", "An adverb describes a verb"],
    ["preposition", "A preposition shows relation between words"],
    ["conjunction", "A conjunction joins words or sentences"],
    ["articles", "Articles are: A, An, The"],
    ["tense", "Tense shows time of action"]
  ],

  
  telugu: [
    ["2 + 2 ఎంత", "2 + 2 = 4"],
    ["ప్రైమ్ సంఖ్య", "1 మరియు తనతో మాత్రమే భాగించబడే సంఖ్య"],
    ["వృత్త విస్తీర్ణ", "వృత్త విస్తీర్ణం = πr²"],
    ["బలం", "బలం = భారం × వేగవర్థనం"],
    ["సెల్", "సెల్ జీవి యొక్క ప్రాథమిక ఘటకం"],
    ["నీరు", "నీటి రసాయన సూత్రం H₂O"],
    ["నామవాచకం", "వ్యక్తి, స్థలం, వస్తువు పేరు"],
    ["క్రియ", "చర్యను చూపించే పదం"]
  ],

  hindi: [
    ["2 + 2 कितना", "2 + 2 = 4"],
    ["अभाज्य संख्या", "जो केवल 1 और स्वयं से विभाजित हो"],
    ["वृत्त का क्षेत्रफल", "वृत्त का क्षेत्रफल = πr²"],
    ["बल", "बल = द्रव्यमान × त्वरण"],
    ["कोशिका", "कोशिका जीवन की सबसे छोटी इकाई है"],
    ["पानी", "पानी का रासायनिक सूत्र H₂O है"],
    ["संज्ञा", "संज्ञा व्यक्ति, स्थान या वस्तु का नाम है"],
    ["क्रिया", "क्रिया कार्य बताने वाला शब्द है"]
  ]
};

const fallback_grammar = [
  ["i am go to school", "I am going to school."],
  ["she dont like apples", "She doesn't like apples."],
  ["he have a car", "He has a car."],
  ["we was playing", "We were playing."],
  ["they is happy", "They are happy."],
  ["i didnt went there", "I didn't go there."],
  ["he do his work", "He does his work."],
  ["she eating now", "She is eating now."],
  ["we has finished", "We have finished."],
  ["this are books", "These are books."],
  ["i seen him", "I saw him."],
  ["he dont know", "He doesn't know."],
  ["she go yesterday", "She went yesterday."],
  ["they plays cricket", "They play cricket."],
  ["i am understand", "I understand."],
  ["he was ate food", "He ate food."],
  ["we didnt knew", "We didn't know."],
  ["she dont comes", "She doesn't come."],
  ["i has done it", "I have done it."],
  ["he dont works", "He doesn't work."]
];