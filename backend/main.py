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

# 加载 Prompt 模板
def load_prompt(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return file.read()

PROMPTS = {
    "Novelty": load_prompt("templates/Novelty.txt"),
    "Significance": load_prompt("templates/Significance.txt"),
    "Soundness": load_prompt("templates/Soundness.txt"),
    "Section": load_prompt("templates/Section.txt"),
    "Overall": load_prompt("templates/overall_review.txt"),
}



def call_openai_chat_api(prompt, model="gpt-4o"):
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model,
            temperature=0
        )
        chat_completion_dict = chat_completion.model_dump()
        return chat_completion_dict["choices"][0]["message"]["content"]
    except Exception as e:

        print(f"Error during API call: {str(e)}")
        return None

def extract_text_from_pdf(pdf_stream):
    pdf_reader = PdfReader(pdf_stream)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

async def generate_openai_responses(pdf_stream):
    text = extract_text_from_pdf(pdf_stream)
    if len(text) > 8000:
        text = text[:8000] + "\n[Text truncated for processing]"

    overall_review = call_openai_chat_api(f"Provide an overall review of the following article:\n{text}")
    section_review = call_openai_chat_api(f"Analyze the article section by section:\n{text}")
    criteria_review = call_openai_chat_api(f"Evaluate the article based on specific criteria:\n{text}")
    
    return {
        "overall": overall_review or "Failed to generate overall review.",
        "section": section_review or "Failed to generate section review.",
        "criteria": criteria_review or "Failed to generate criteria review.",
    }

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
        print(f"Received file for AI response: {file.filename}, type: {file.content_type}")

        if file.filename in uploaded_files_cache:
            pdf_stream = uploaded_files_cache[file.filename]["pdf_stream"]
            pdf_stream.seek(0)  # 确保文件流从开头读取
            print(f"Using cached PDF for AI response: {file.filename}")
        else:
            print("File not found in cache, processing...")
            if file.content_type == "application/pdf":
                pdf_stream = BytesIO(await file.read())
            elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                pdf_stream = await convert_word_to_pdf(file)
            else:
                print("Unsupported file type for AI response.")
                return JSONResponse(content={"error": "Unsupported file type for AI response"}, status_code=400)

        responses = await generate_openai_responses(pdf_stream)
        print("AI responses generated successfully.")
        return JSONResponse(content={"responses": responses}, status_code=200)

    except Exception as e:
        print(f"Error generating AI response: {e}")
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
