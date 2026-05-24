from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
import google.generativeai as genai
import uuid

# Gemini API Key
genai.configure(api_key="AIzaSyCvi4U_P1ONkerCdDRYHNajfE-PJ8fvF0g")

model = SentenceTransformer('all-MiniLM-L6-v2')

client = chromadb.Client()
collection = client.get_or_create_collection("pdf_docs")

def extract_text(pdf_path):
    reader = PdfReader(pdf_path)

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text

    return text

def chunk_text(text, chunk_size=500):
    chunks = []

    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i+chunk_size])

    return chunks

def process_pdf(pdf_path):
    text = extract_text(pdf_path)

    chunks = chunk_text(text)

    print(chunks[:2])
    print(len(chunks))

    embeddings = model.encode(chunks).tolist()

    ids = [str(uuid.uuid4()) for _ in chunks]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids
    )

def ask_question(question):
    question_embedding = model.encode([question]).tolist()[0]

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=3
    )

    print(results)

    documents = results.get("documents", [])

    if not documents or not documents[0]:
        return "No relevant context found in uploaded PDFs."

    context = "\n".join(documents[0])

    prompt = f"""
You are Ragify, a concise document Q&A assistant.

Use only the provided context. If the context is insufficient, say so plainly.
Answer in a clean, readable format:
- Start with a direct 1-2 sentence answer.
- Then provide 3-5 short bullet points only if they add useful detail.
- Preserve equations exactly when relevant, wrapped in $$...$$.
- Avoid filler like "Based on the provided context" unless uncertainty matters.
- Keep the answer concise and practical.

Context:
{context}

Question:
{question}
"""

    gemini = genai.GenerativeModel("gemini-flash-latest")

    response = gemini.generate_content(prompt)

    return response.text
