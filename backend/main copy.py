from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from subprocess import Popen, PIPE
import os
from io import BytesIO
import tempfile
import openai
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
openai.api_key = os.getenv("OPENAI_API_KEY")


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

# 调用 OpenAI API
def call_openai_chat_api(prompt, model="gpt-4o"):
    try:
        chat_completion = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error during API call: {str(e)}")
        return None


def extract_text_from_pdf(pdf_stream):
    """
    从 PDF 文件中提取文本。
    """
    pdf_reader = PdfReader(pdf_stream)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

async def generate_openai_responses(pdf_stream):
    """
    提取 PDF 文本并生成 OpenAI 回复。
    """
    print("Extracting text from PDF for OpenAI response...")
    text = extract_text_from_pdf(pdf_stream)
    
    # 检查文本长度并截断
    if len(text) > 8000:
        text = text[:8000] + "\n[Text truncated for processing]"

    print("Generating OpenAI responses...")
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
    """
    上传文件处理：
    - 如果是 PDF，直接返回文件流和 OpenAI 回复。
    - 如果是 Word 文件，转换为 PDF 后返回文件流和 OpenAI 回复。
    """
    try:
        print(f"Received file: {file.filename}, type: {file.content_type}")

        # 初始化回复字典
        responses = {}

        # 处理 PDF 文件
        if file.content_type == "application/pdf":
            print("Processing a PDF file.")
            pdf_stream = BytesIO(file.file.read())
            
            # 生成 OpenAI 回复
            responses = await generate_openai_responses(pdf_stream)

            # 返回 JSON 和文件流分开
            return JSONResponse(
                content={
                    "responses": responses,
                },
                status_code=200,
            )
        
        # 处理 Word 文件
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            print("Processing a Word file.")
            pdf_stream = await convert_word_to_pdf(file)

            # 生成 OpenAI 回复
            responses = await generate_openai_responses(pdf_stream)

            # 返回 JSON 和文件流分开
            return JSONResponse(
                content={
                    "responses": responses,
                },
                status_code=200,
            )

        # 不支持的文件类型
        else:
            return JSONResponse(content={"error": "Unsupported file type"}, status_code=400)
    
    except Exception as e:
        print(f"Error during file upload: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

async def convert_word_to_pdf(file: UploadFile):
    """
    使用 unoconv 将 Word 转换为 PDF。
    """
    try:
        print("Starting Word to PDF conversion...")

        # 创建临时文件保存上传的 Word 文档
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
            tmp_file.write(await file.read())
            tmp_file_path = tmp_file.name

        # 创建输出的 PDF 临时文件路径
        pdf_file_path = f"{tmp_file_path}.pdf"

        # 调用 unoconv 将 Word 转换为 PDF
        process = Popen(["unoconv", "-f", "pdf", "-o", pdf_file_path, tmp_file_path], stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            raise Exception(f"Unoconv error: {stderr.decode('utf-8')}")

        print("PDF successfully generated.")

        # 读取生成的 PDF 文件
        with open(pdf_file_path, "rb") as pdf_file:
            pdf_data = pdf_file.read()

        # 删除临时文件
        os.remove(tmp_file_path)
        os.remove(pdf_file_path)

        # 返回 PDF 文件流
        return BytesIO(pdf_data)

    except Exception as e:
        print(f"Error converting Word to PDF: {e}")
        raise Exception(f"Failed to convert Word document to PDF: {e}")
