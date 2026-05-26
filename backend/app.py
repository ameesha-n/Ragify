import os
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from rag import process_pdf, ask_question

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ragify-app")

app = FastAPI()

# Ensure the uploads directory exists dynamically
os.makedirs("uploads", exist_ok=True)

# CORS configuration
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    path = f"uploads/{file.filename}"
    try:
        logger.info(f"Received file upload request: {file.filename}")
        
        # Read the file content
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
            
        with open(path, "wb") as f:
            f.write(content)

        logger.info(f"File saved to {path}. Commencing RAG processing...")
        process_pdf(path)
        logger.info(f"Successfully processed PDF: {file.filename}")

        return {"message": "PDF uploaded successfully"}
    except Exception as e:
        logger.error(f"Error occurred during file upload processing: {e}", exc_info=True)
        # Check if it's already an HTTPException
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"RAG processing failed: {str(e)}")
    finally:
        # Clean up the file to save disk space on Render's ephemeral filesystem
        if os.path.exists(path):
            try:
                os.remove(path)
                logger.info(f"Cleaned up temporary upload file: {path}")
            except Exception as cleanup_err:
                logger.warning(f"Could not clean up temporary file {path}: {cleanup_err}")

@app.get("/ask")
def ask(query: str):
    try:
        if not query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty.")
        answer = ask_question(query)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error occurred during ask query processing: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host=host, port=port, reload=True)