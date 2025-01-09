from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from utils import process_file
import openai

app = FastAPI()

# 设置 OpenAI API 密钥
openai.api_key = "sk-proj-CRaTDhzMy6OcOLS1II2TTYC4oOTf6ZY-m5gVEJyZHHlaIaQ1i_TLIXtr3oAXtpAvHv7V8HrEuLT3BlbkFJxXDRemPXEzTJjRf2EShf56Q1ls-aKohR-Blh76J_4clXj3RsmdSisier4aBzan2KmiNy0EiAwAy"

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # 解析上传文件内容
    file_content = await process_file(file)
    
    # 调用 OpenAI API 获取回复
    response = openai.Completion.create(
        engine="text-davinci-003",  # 替换为你的模型
        prompt=f"Based on this content: {file_content}",
        max_tokens=200
    )
    
    return JSONResponse(content={
        "file_content": file_content,
        "response": response["choices"][0]["text"].strip()
    })
