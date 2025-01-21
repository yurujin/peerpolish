from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from subprocess import Popen, PIPE
import os
from io import BytesIO
import tempfile
from openai import OpenAI
from PyPDF2 import PdfReader
from dotenv import load_dotenv
from docx import Document


app = FastAPI()
load_dotenv()

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 设置 OpenAI API 密钥
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  

# 缓存结构，用于存储上传文件的中间结果
uploaded_files_cache = {}


def load_prompt(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        # return file.read()
        return file.read().strip()

PROMPTS = {
    "Novelty": load_prompt("templates/Novelty.txt"),
    "Significance": load_prompt("templates/Significance.txt"),
    "Soundness": load_prompt("templates/Soundness.txt"),
    "Section":load_prompt("templates/Section.txt"),
    "Overall": load_prompt("templates/overall_review.txt")
}

def call_openai_chat_api(content,prompt, model="gpt-4o"):
    try:
        messages = [
            {
                "role": "system",
                "content": f"Here is the background content for evaluation:\n\n{content}"
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        chat_completion = client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=0
        )
        chat_completion_dict = chat_completion.model_dump()
        return chat_completion_dict["choices"][0]["message"]["content"]

    except Exception as e:
        print(f"Error during API call: {str(e)}")
        return None


def load_document(file_path):
    """Load .docx or .pdf file and return its paragraphs."""
    if file_path.endswith(".docx"):
        return load_docx(file_path)
    elif file_path.endswith(".pdf"):
        return load_pdf(file_path)
    else:
        raise ValueError("Unsupported file format. Please provide a .docx or .pdf file.")

def load_docx(file_path):
    """Load .docx file and return its paragraphs."""
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return paragraphs

def load_pdf(file_path):
    """Load .pdf file and return its text as paragraphs."""
    reader = PdfReader(file_path)
    paragraphs = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            paragraphs.extend(text.split("\n")) 
    return [p.strip() for p in paragraphs if p.strip()]  

def combine_full_document(paragraphs):
    """Combine all paragraphs into a single string for full-text prompt."""
    return "\n\n".join(paragraphs)



def generate_review(section,content):
    prompt_template = PROMPTS[section]
    return call_openai_chat_api(content,prompt_template)

def generate_section_review(content):
    prompt = PROMPTS["Section"]
    return call_openai_chat_api(content,prompt)

def generate_overall_review(content):
    prompt = PROMPTS["Overall"]
    return call_openai_chat_api(content,prompt)



@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        print(f"Received file: {file.filename}, type: {file.content_type}")

        if file.content_type == "application/pdf":
            print("Processing a PDF file.")
            pdf_stream = BytesIO(await file.read())
            uploaded_files_cache[file.filename] = {"pdf_stream": pdf_stream}
            return StreamingResponse(pdf_stream, media_type="application/pdf")

        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            print("Processing a Word file.")
            pdf_stream = await convert_word_to_pdf(file)
            uploaded_files_cache[file.filename] = {"pdf_stream": pdf_stream}
            return StreamingResponse(pdf_stream, media_type="application/pdf")

        else:
            print("Unsupported file type.")
            return JSONResponse(content={"error": "Unsupported file type"}, status_code=400)

    except Exception as e:
        print(f"Error during file upload: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)



@app.post("/generate-response/")
async def generate_response(file: UploadFile = File(...)):
    try:
        print(f"Processing file for OpenAI response: {file.filename}, type: {file.content_type}")

        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(await file.read())
            tmp_file_path = tmp_file.name

        print("Loading document...")
        paragraphs = load_document(tmp_file_path)
        os.remove(tmp_file_path)  # Clean up temporary file

        print("Combining full document content...")
        content = combine_full_document(paragraphs)

        print("\nGenerating criteria review...")
        reviews = {
            "Novelty": generate_review("Novelty",content),
            "Significance": generate_review("Significance",content),
            "Soundness": generate_review("Soundness",content)
        }

        print("\nGenerating Section review...")
        section_review = generate_section_review(content)

        print("\nGenerating overall assessment...")
        overall_review = generate_overall_review(content)

        # Construct the response JSON
        response_json = {
            "criteria": reviews,
            "section_review": section_review,
            "overall_review": overall_review
        }

        print("Generated OpenAI response successfully.")
        return JSONResponse(content=response_json, status_code=200)

    except Exception as e:
        print(f"Error during response generation: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)



async def convert_word_to_pdf(file: UploadFile):
    try:
        print(f"Converting Word to PDF: {file.filename}")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
            # 保存上传的文件
            tmp_file.write(await file.read())
            tmp_file_path = tmp_file.name

        pdf_file_path = f"{tmp_file_path}.pdf"
        process = Popen(["unoconv", "-f", "pdf", "-o", pdf_file_path, tmp_file_path], stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            raise Exception(f"Unoconv error: {stderr.decode('utf-8')}")

        with open(pdf_file_path, "rb") as pdf_file:
            pdf_data = pdf_file.read()

        os.remove(tmp_file_path)
        os.remove(pdf_file_path)
        print(f"PDF conversion successful: {pdf_file_path}")
        return BytesIO(pdf_data)

    except Exception as e:
        print(f"Error converting Word to PDF: {e}")
        raise Exception(f"Failed to convert Word document to PDF: {e}")


