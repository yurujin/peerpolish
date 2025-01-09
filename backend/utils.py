from PyPDF2 import PdfReader
from docx import Document
import os

async def process_file(file):
    file_extension = os.path.splitext(file.filename)[1]
    if file_extension == ".pdf":
        return process_pdf(file)
    elif file_extension == ".docx":
        return process_docx(file)
    else:
        return "Unsupported file type."

def process_pdf(file):
    reader = PdfReader(file.file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

def process_docx(file):
    document = Document(file.file)
    text = ""
    for paragraph in document.paragraphs:
        text += paragraph.text + "\n"
    return text
