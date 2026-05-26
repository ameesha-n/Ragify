import os
import logging
from dotenv import load_dotenv
from pypdf import PdfReader
import chromadb
import google.generativeai as genai
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ragify")

# Load environment variables
load_dotenv()

# Gemini API Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("WARNING: GEMINI_API_KEY is not set. Falling back to development API key.")
    api_key = "AIzaSyCvi4U_P1ONkerCdDRYHNajfE-PJ8fvF0g"

genai.configure(api_key=api_key)

client = chromadb.Client()
collection = client.get_or_create_collection("pdf_docs")

def get_embeddings(texts: list[str] | str, is_query: bool = False):
    task_type = "retrieval_query" if is_query else "retrieval_document"
    response = genai.embed_content(
        model="models/text-embedding-004",
        content=texts,
        task_type=task_type
    )
    return response["embedding"]

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

    embeddings = get_embeddings(chunks, is_query=False)

    ids = [str(uuid.uuid4()) for _ in chunks]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids
    )

def ask_question(question):
    question_embedding = get_embeddings(question, is_query=True)

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
