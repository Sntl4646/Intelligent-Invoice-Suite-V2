import os
from openai import OpenAI
import google.generativeai as genai
from utils import logger

# Initialize both clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def run_llm(prompt: str, model_choice: str = "gpt4") -> str:
    """
    Dynamically selects between OpenAI GPT-4 and Gemini 2.5 Flash
    based on user preference stored in DB.
    """
    try:
        if model_choice.lower() == "gemini":
            logger.info("[LLM] Using Gemini 2.5 Flash")
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            return response.text

        logger.info("[LLM] Using OpenAI GPT-4-Turbo")
        completion = openai_client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return completion.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return "LLM processing failed."
