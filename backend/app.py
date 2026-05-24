from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from rag import process_pdf, ask_question

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    path = f"uploads/{file.filename}"

    with open(path, "wb") as f:
        f.write(await file.read())

    process_pdf(path)

    return {"message": "PDF uploaded successfully"}

@app.get("/ask")
def ask(query: str):
    answer = ask_question(query)
    return {"answer": answer}