"""
doc_answering.py

Document QA — works for ANY uploaded PDF or image.
The AI model reads the extracted text and directly answers the student's question.
No hardcoded section names. Sections detected automatically as context hints only.
"""

import re
from services.ai_service import generate_text
def detect_sections(document_text: str) -> dict:
    """
    Find section headers to help structure the answer.
    Returns: { "section_name_lowercase": "full header line" }
    """
    lines = document_text.splitlines()
    sections = {}

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or len(stripped) < 3:
            continue
        if re.match(r"^\d+[\.\)]\s*\w", stripped):
            key = re.sub(r"^\d+[\.\)]\s*", "", stripped).strip().lower()
            sections[key] = stripped

        elif stripped.isupper() and 3 < len(stripped) < 80:
            key = stripped.lower()
            sections[key] = stripped

        elif re.match(r"^[A-Z][a-zA-Z\s&\-/]+$", stripped) and 4 < len(stripped) < 60:
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if len(next_line) > 40 or next_line == "":
                key = stripped.lower()
                sections[key] = stripped

        elif re.match(r"^(chapter|section|part|unit)\s+\d+", stripped, re.IGNORECASE):
            key = stripped.lower()
            sections[key] = stripped

    return sections
def extract_section_text(document_text: str, section_header: str, max_chars: int = 2000) -> str:
    """
    Extract text for a given section header until the next section.
    """
    lines = document_text.splitlines()
    result = []
    inside = False
    header_lower = section_header.lower().strip()

    for i, line in enumerate(lines):
        stripped = line.strip()
        stripped_lower = stripped.lower()

        if not inside:
            if header_lower in stripped_lower or stripped_lower in header_lower:
                inside = True
                result.append(stripped)
                continue
        else:
            is_numbered = re.match(r"^\d+[\.\)]\s*[A-Z]", stripped)
            is_caps_header = stripped.isupper() and 3 < len(stripped) < 80
            is_page_marker = re.match(r"^\[Page \d+\]", stripped)
            is_chapter = re.match(r"^(chapter|section|part|unit)\s+\d+", stripped, re.IGNORECASE)

            if (is_numbered or is_caps_header or is_page_marker or is_chapter) and result:
                break

            result.append(stripped)

    extracted = "\n".join(result).strip()
    if len(extracted) > max_chars:
        extracted = extracted[:max_chars] + "\n[... section continues ...]"
    return extracted if len(extracted) > 20 else ""
def get_relevant_chunks(document_text: str, question: str, max_chars: int = 6000) -> str:
    """
    Score all paragraphs/chunks by keyword overlap with the question.
    Returns the top relevant chunks concatenated, up to max_chars.
    Ensures the AI has enough context to answer accurately.
    """
    q_words = set(re.findall(r"[a-z]{3,}", question.lower()))

    # Split on page markers or double newlines
    chunks = re.split(r"\[Page \d+\]|\n{2,}", document_text)
    chunks = [c.strip() for c in chunks if len(c.strip()) > 30]

    scored = []
    for chunk in chunks:
        chunk_words = set(re.findall(r"[a-z]{3,}", chunk.lower()))
        score = len(q_words & chunk_words)
        scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)

    selected = []
    total_chars = 0

    if chunks:
        first = chunks[0]
        selected.append(first)
        total_chars += len(first)

    for score, chunk in scored:
        if total_chars >= max_chars:
            break
        if chunk not in selected:
            selected.append(chunk)
            total_chars += len(chunk)

    return "\n\n".join(selected)

def detect_intent(question: str) -> str:
    q = question.lower().strip()

    if re.search(r"\b(summarize|summary|overview|brief|gist|what is this about|what does this document)\b", q):
        return "summarize"

    if re.search(r"\b(mcq|multiple choice|answer the questions?|correct answer|solve the questions)\b", q):
        return "mcq"

    if re.search(r"\b(list|enumerate|what are the topics|what are the sections|headings|chapters)\b", q):
        return "list"

    if re.search(r"\b(title|author|submitted|institution|course|department|college|university|who wrote|student name)\b", q):
        return "metadata"

    return "answer"  # Default: answer the question directly from the document

def ask_ai_from_document(question: str, context: str, intent: str = "answer") -> str:
    """
    The main AI call. Passes document context + question to the AI model.
    This is what was MISSING in the original code for most intents.
    """

    if intent == "summarize":
        prompt = f"""You are a helpful study assistant. A student has uploaded a document.

DOCUMENT CONTENT:
{context}

Task: Write a clear, well-structured summary of this document. Include:
- What the document is about
- Key topics or sections covered
- Main points and important details

Summary:"""

    elif intent == "mcq":
        prompt = f"""You are a helpful study assistant. A student has uploaded a document with questions.

DOCUMENT CONTENT:
{context}

Task: Find all questions in the document and answer each one clearly and correctly.
For multiple choice questions, identify the correct option and briefly explain why.
For short answer questions, give a complete answer.

Answers:"""

    elif intent == "metadata":
        prompt = f"""You are a helpful study assistant. A student has uploaded a document.

DOCUMENT CONTENT:
{context}

Task: Extract and list the document's metadata such as:
title, author/student name, institution, course, subject, date, department, etc.
If any field is not found, skip it.

Document Information:"""

    elif intent == "list":
        prompt = f"""You are a helpful study assistant. A student has uploaded a document.

DOCUMENT CONTENT:
{context}

Task: List all the main topics, sections, chapters, or headings found in this document.
Present them as a numbered list.

Topics:"""

    else:  # "answer" — the most important case
        prompt = f"""You are a helpful school tutor. A student has uploaded a document and asked a question about it.

DOCUMENT CONTENT:
{context}

STUDENT'S QUESTION: {question}

Instructions:
- Answer the question directly and completely using information from the document above.
- If the document contains the answer, explain it clearly in simple language suitable for a student.
- If the document has relevant formulas, definitions, or examples, include them.
- If the answer is not in the document, say so clearly and provide a general educational answer.
- Do NOT just copy-paste text. Explain it properly.

Answer:"""

    response = generate_text(prompt, max_new_tokens=512)

    if not response or len(response.strip()) < 5:
        return "⚠️ The AI could not generate an answer. Please try rephrasing your question."

    return response.strip()
def answer_mcqs_from_document(document_text: str) -> str:
    """
    Detect and answer MCQ blocks found in the document.
    """
    lines = document_text.splitlines()
    questions = []
    current_q = []

    for line in lines:
        line = line.strip()
        if not line:
            if current_q:
                questions.append("\n".join(current_q))
                current_q = []
            continue
        if re.match(r"^Q[\d\)\.\s]", line, re.IGNORECASE) or re.match(r"^\d+[\)\.]\s+\w", line):
            if current_q:
                questions.append("\n".join(current_q))
            current_q = [line]
        elif current_q:
            current_q.append(line)

    if current_q:
        questions.append("\n".join(current_q))

    if not questions:
        return ""

    answers = []
    for q_block in questions[:20]:  # cap at 20 MCQs
        q_block = q_block.strip()
        if not q_block:
            continue

        prompt = f"""You are a school exam assistant. Answer this question correctly.
Give the correct answer with a short explanation (1-2 sentences).

{q_block}

Answer:"""
        ai_ans = generate_text(prompt, max_new_tokens=100)
        if ai_ans and len(ai_ans.strip()) > 2:
            answers.append(f"❓ {q_block}\n✅ {ai_ans.strip()}")
        else:
            answers.append(f"❓ {q_block}\n⚠️ Could not determine answer.")

    return "\n\n---\n\n".join(answers)

def list_topics(sections: dict, document_text: str) -> str:
    if sections:
        topic_lines = "\n".join(f"  {i+1}. {v}" for i, v in enumerate(sections.values()))
        return f"📚 Topics/Sections in this document:\n\n{topic_lines}"

    # Fallback — scan for numbered lines
    lines = document_text.splitlines()
    topics = []
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\d+[\.\)]\s+\w", stripped) and len(stripped) < 80:
            topics.append(f"  • {stripped}")

    if topics:
        return "📚 Topics found:\n\n" + "\n".join(topics[:20])

    return "No structured topics detected. Please ask a specific question about the document."
def answer_from_document(question: str, document_text: str) -> str:
    """
    Works for ANY uploaded PDF or image document.
    The AI model reads the document and answers the student's question directly.
    """

    if not document_text or len(document_text.strip()) < 20:
        return "⚠️ Could not extract readable text from the uploaded file. Please ensure the image/PDF is clear and try again."

    # Step 1: Detect sections (used as hints/context, not gatekeepers)
    sections = detect_sections(document_text)

    # Step 2: Detect what the student wants
    intent = detect_intent(question)

    print(f"[DOC QA] intent={intent} | sections_found={len(sections)} | doc_length={len(document_text)}")

    # Step 3: Handle list intent locally (no AI needed)
    if intent == "list":
        return list_topics(sections, document_text)

    # Step 4: Handle dedicated MCQ intent
    if intent == "mcq":
        mcq_ans = answer_mcqs_from_document(document_text)
        if mcq_ans:
            return "📝 Answers to Questions in Your Document:\n\n" + mcq_ans
        # Fall through to general AI answer if no structured MCQs found

    # Step 5: Get the most relevant chunks from the document for context
    # For summarize/metadata, use the full document start; for answers, use scored chunks
    if intent in ("summarize", "metadata"):
        context = document_text[:8000]  # Use up to 8000 chars for full context
    else:
        context = get_relevant_chunks(document_text, question, max_chars=6000)

    # Step 6: Ask the AI to answer using the document content
    answer = ask_ai_from_document(question, context, intent)

    return answer