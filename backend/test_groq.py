import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

async def main():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("ERROR: GROQ_API_KEY not found in .env")
        return
        
    print(f"API Key found: {api_key[:8]}...")
    
    try:
        print("Initializing ChatGroq...")
        llm = ChatGroq(groq_api_key=api_key, model_name="llama-3.3-70b-versatile")
        print("Invoking model...")
        response = llm.invoke([HumanMessage(content="Reply with simply 'Groq is working' and nothing else.")])
        print("\n--- RESPONSE ---")
        print(response.content)
        print("----------------")
    except Exception as e:
        print("\n--- ERROR ---")
        print(str(e))
        print("-------------")

if __name__ == "__main__":
    asyncio.run(main())
