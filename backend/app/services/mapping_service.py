import json
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from app.core.config import settings

class MappingService:
    def __init__(self):
        self.llm = ChatGroq(groq_api_key=settings.GROQ_API_KEY, model_name="llama-3.3-70b-versatile")
        
    async def match_fields(self, target_schema: list, external_columns: list) -> dict:
        """
        cocokan list target mapping dan kolom eksternal.
        """
        prompt = PromptTemplate.from_template("""
        You are an intelligent data-mapping assistant.
        Your task is to match a set of standard database fields (target_schema) with the provided external column headers (external_columns) from an uploaded file.
        
        Rules:
        1. Ensure your mapping makes semantic sense. For example, "tanggal" maps to "Date", "nota" maps to "Transaction_ID", "uang masuk" maps to "Debit", etc.
        2. Only map to exact strings present in the `external_columns` array.
        3. If there is no good fit for a field, use "--select header--".
        4. Return ONLY a valid JSON object matching this structure: 
           {{ "target_field_key": "Matched External Column string" }}
           
        target_schema: {target_schema}
        external_columns: {external_columns}
        """)
        
        chain = prompt | self.llm
        
        # Ubah target_schema (List[Dict]) menjadi dictionary sederhana { "key": "label" } agar LLM tidak bingung
        simplified_target = { item['key']: item.get('label', item['key']) for item in target_schema } if isinstance(target_schema, list) and len(target_schema) > 0 and isinstance(target_schema[0], dict) else target_schema

        try:
            response = chain.invoke({
                "target_schema": json.dumps(simplified_target), 
                "external_columns": json.dumps(external_columns)
            })
            
            # format hasil output
            raw_json = response.content.strip()
            if "```json" in raw_json:
                raw_json = raw_json.split("```json")[1].split("```")[0].strip()
                
            return json.loads(raw_json)
        except Exception as e:
            print(f"llm error: {e}")
            # kembalikan mapping kosong jika gagal
            return {}


mapping_service = MappingService()
