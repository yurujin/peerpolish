import os
import json
import argparse
from openai import OpenAI
from docx import Document
from scripts.process_document import load_document, combine_full_document, extract_title

# 初始化 OpenAI 客户端
client = OpenAI(api_key="your-openai-api-key")

def load_prompt(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

PROMPTS = {
    "Novelty": load_prompt("templates/Novelty.txt"),
    "Significance": load_prompt("templates/Significance.txt"),
    "Soundness": load_prompt("templates/Soundness.txt"),
    "Section": load_prompt("templates/Section.txt"),
    "Overall": load_prompt("templates/overall_review.txt")
}

def call_openai_chat_api(prompt, model="gpt-4o"):
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "user", "content": prompt},
            ],
            model=model,
            temperature=0,
        )
        chat_completion_dict = chat_completion.model_dump()
        return chat_completion_dict["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error during API call: {str(e)}")
        return None

def generate_review(section, title, content):
    prompt_template = PROMPTS[section]
    prompt = prompt_template.format(title=title, content=content)
    return call_openai_chat_api(prompt)

def generate_section_review(title, content):
    prompt_template = PROMPTS["Section"]
    prompt = prompt_template.format(title=title, content=content)
    return call_openai_chat_api(prompt)

def generate_overall_review(title, content):
    prompt_template = PROMPTS["Overall"]
    prompt = prompt_template.format(title=title, content=content)
    return call_openai_chat_api(prompt)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate AI reviews for a document.")
    parser.add_argument("file_path", type=str, help="Path to the uploaded document.")
    args = parser.parse_args()

    uploaded_file_path = args.file_path

    # 加载文档内容
    paragraphs = load_document(uploaded_file_path)
    content = combine_full_document(paragraphs)
    title = extract_title(paragraphs)

    reviews = {}
    for section in ["Novelty", "Significance", "Soundness"]:
        review = generate_review(section, title, content)
        reviews[section] = review or f"Failed to generate {section} review."

    section_review = generate_section_review(title, content) or "Failed to generate section review."
    overall_review = generate_overall_review(title, content) or "Failed to generate overall review."

    # 输出 JSON 格式的结果
    result = {
        "reviews": reviews,
        "section": section_review,
        "overall": overall_review,
    }
    print(json.dumps(result))
