from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from subprocess import Popen, PIPE
import os
from io import BytesIO
import tempfile

app = FastAPI()

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    上传文件处理：
    - 如果是 PDF，直接返回文件流。
    - 如果是 Word 文件，使用 unoconv 转换为 PDF。
    """
    try:
        print(f"Received file: {file.filename}, type: {file.content_type}")

        # 处理 PDF 文件
        if file.content_type == "application/pdf":
            print("Processing a PDF file.")
            return StreamingResponse(file.file, media_type="application/pdf")
        
        # 处理 Word 文件
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            print("Processing a Word file.")
            pdf_stream = await convert_word_to_pdf(file)
            return StreamingResponse(pdf_stream, media_type="application/pdf")

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
