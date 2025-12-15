#This is the LangChain Agent module. It creates a LangChain SQL Agent
# connected to a PostgreSQL database, with SSL verification disabled for OpenAI
# to avoid issues with corporate CA certificates. The agent can execute
import os
import psycopg2
import traceback
import httpx
from sqlalchemy import create_engine
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_community.agent_toolkits.sql.base import create_sql_agent
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from utils import logger
from langchain_core.output_parsers import StrOutputParser
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage


import google.generativeai as genai
#from pdf2image import convert_from_path
import base64
import json
import io
from PIL import Image

# Disable SSL verification globally (for DEV / restricted networks)
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["SSL_CERT_FILE"] = ""

# ✅ Create a reusable OpenAI HTTP client that skips SSL checks
openai_insecure_client = httpx.Client(verify=False)

# Optional: detect newer LangChain agent API
try:
    from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
    from langchain.agents import create_sql_agent as create_sql_agent_v2
    USE_V2 = True
except ImportError:
    USE_V2 = False


def create_agent(model_choice: str = "gpt4"):
    """
    Builds a LangChain SQL Agent connected to PostgreSQL.
    SSL verification is disabled for OpenAI (to avoid corporate CA issues).
    """
    db_url = os.getenv("DATABASE_URL_SYNC") or "postgresql+psycopg2://postgres:Welcome123@localhost:5432/invoice_ai"
    logger.info(f"[LangChain] Connecting to DB: {db_url}")

    # ✅ Test psycopg2 DB connection
    try:
        conn = psycopg2.connect(
            dbname="invoice_ai",
            user="postgres",
            password="Welcome123",
            host="localhost",
            port="5432"
        )
        conn.close()
        logger.success("[LangChain] psycopg2 connection test successful!")
    except Exception as e:
        logger.error(f"[LangChain] psycopg2 connection failed: {e}")
        raise Exception("Database connection test failed")

    # ✅ Initialize SQLAlchemy + LangChain SQLDatabase
    try:
        engine = create_engine(db_url)
        db = SQLDatabase(engine, include_tables=["users", "vendors", "invoices"])
        logger.success("[LangChain] SQLDatabase initialized successfully.")
    except Exception as e:
        logger.error(f"[LangChain] SQLDatabase init failed: {e}")
        raise Exception("SQLDatabase initialization error")

    # ✅ Choose LLM with SSL disabled for OpenAI
    if model_choice.lower() == "gemini":
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
        logger.info("[LangChain] Using Google Gemini model.")
    else:
        llm = ChatOpenAI(
            model="gpt-4-turbo",
            temperature=0.2,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            http_client=openai_insecure_client  # 👈 disables SSL verification
        )
        logger.info("[LangChain] Using OpenAI GPT-4 (SSL verification skipped).")

    # ✅ Create SQL Agent
    try:
        if USE_V2:
            logger.info("[LangChain] Using modern SQL Agent (v2).")
            toolkit = SQLDatabaseToolkit(db=db, llm=llm)
            agent = create_sql_agent_v2(llm=llm, toolkit=toolkit, verbose=True)
        else:
            logger.info("[LangChain] Using legacy SQL Agent (v1).")
            agent = create_sql_agent(llm=llm, db=db, verbose=True)
        return agent
    except Exception as e:
        logger.error(f"[LangChain] SQL Agent creation failed: {e}")
        raise Exception("Agent creation error")


def run_sql_query(query: str, model_choice: str = "gpt4") -> dict:
    """
    Executes a natural-language SQL query using LangChain Agent.
    """
    try:
        agent = create_agent(model_choice)
        result = agent.run(query)
        logger.success("[LangChain] Query executed successfully.")
        return {"query": query, "results": result}
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"[LangChain] Error during SQL query execution:\n{tb}")
        return {"error": str(e), "trace": tb}


def extract_invoice_data(file_path: str):
    """
    Poppler-free version:
    - Uses PyMuPDF for text extraction and image rendering
    - Automatically falls back to Gemini Vision OCR if no text is found
    - Enforces valid JSON output
    """

    try:
        import fitz  # PyMuPDF
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

        logger.info(f"[Extractor] 🧠 Processing file: {file_path}")

        # Step 1: Extract text
        doc = fitz.open(file_path)
        text_content = "\n".join(page.get_text("text") for page in doc)
        text_length = len(text_content.strip())

        logger.info(f"[Extractor] Extracted text length: {text_length}")

        model = genai.GenerativeModel("gemini-2.0-flash")

        # Step 2: Load prompt
        prompt = """
You are an expert document parser trained to read invoices.

Your goal: Extract every possible structured field from this invoice document and return the result
as a **valid JSON object only** — do not include explanations or text outside the JSON.

Always follow this schema strictly:
{
  "Vendor Name": "",
  "Invoice or Order Number": "",
  "Issue Date": "",
  "Due Date": "",
  "Currency": "",
  "Subtotal": 0,
  "Tax Amount": 0,
  "Total Amount": 0,
  "Payment Terms": "",
  "Notes": "",
  "Line Items": [
      {
        "Description": "",
        "Quantity": "",
        "Unit Price": "",
        "Amount": "",
        "Additional Fields": {}
      }
  ],
  "Additional Fields": {}
}

Mapping instructions:
- If the invoice uses different names (e.g., “Qty” → “Quantity”, “Net Total” → “Subtotal”), map them properly.
- Include all additional fields not listed here under "Additional Fields".
- Return **only** valid JSON.
"""


        # Step 3: Choose extraction path
        if text_length > 500:
            logger.info("[Extractor] ✅ Digital PDF detected — text-based extraction.")
            full_prompt = (
                prompt
                + "\n\nNow extract structured invoice data from the following text:\n\n"
                + text_content[:20000]
            )
            response = model.generate_content(full_prompt)
        else:
            logger.info("[Extractor] 🧾 Scanned PDF detected — performing OCR with Gemini Vision.")
            encoded_images = []
            for page_index in range(len(doc)):
                page = doc.load_page(page_index)
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                b64_img = base64.b64encode(img_bytes).decode("utf-8")
                encoded_images.append(b64_img)

            logger.info(f"[Extractor] Converted PDF into {len(encoded_images)} page images.")

            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            for b64_img in encoded_images:
                contents[0]["parts"].append({
                    "inline_data": {"mime_type": "image/png", "data": b64_img}
                })

            response = model.generate_content(contents)

        # Step 4: Extract raw Gemini output
        raw_output = ""
        if hasattr(response, "text") and response.text:
            raw_output = response.text.strip()
            if not raw_output:
                if hasattr(response, "candidates") and response.candidates:
                    for c in response.candidates:
                        if hasattr(c, "content") and hasattr(c.content, "parts"):
                            parts = c.content.parts
                        if parts and hasattr(parts[0], "text"):
                            raw_output = parts[0].text.strip()
                            break

        elif hasattr(response, "candidates") and len(response.candidates) > 0:
            parts = response.candidates[0].content.parts
            if parts and hasattr(parts[0], "text"):
                raw_output = parts[0].text.strip()

        logger.info(f"[Extractor] Gemini raw output preview: {raw_output[:500]}")

        # Step 5: Enforce pure JSON output
        if not raw_output:
            raise ValueError("Empty response from Gemini model.")

        if not raw_output.startswith("{"):
            json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
            if json_match:
                raw_output = json_match.group(0)
            else:
                raise ValueError("No JSON object detected in Gemini output")

        extracted = json.loads(raw_output)
        logger.success("[Extractor] ✅ Successfully extracted structured invoice data.")
        return extracted

    except Exception as e:
        logger.error(f"[Extractor] ❌ Gemini extraction failed: {e}")
        logger.info(f"[Extractor] Raw Gemini output (debug): {locals().get('raw_output', '')[:800]}")
        return {
            "Vendor Name": "Unknown Vendor",
            "Invoice or Order Number": "N/A",
            "Issue Date": None,
            "Due Date": None,
            "Subtotal": 0,
            "Tax Amount": 0,
            "Total Amount": 0,
            "Currency": "",
            "Payment Terms": "",
            "Notes": "Extraction failed",
            "Line Items": [],
            "Additional Fields": {}
        }
