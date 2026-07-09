import os
from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults

load_dotenv()
search = TavilySearchResults(k=3)

try:
    print("Testing Tavily Q1...")
    res = search.invoke({'query': 'Fried Chicken Franchise QSR market size, growth trends, consumer behavior Indonesia 2024-2025'})
    for r in res:
        print(f"[{r.get('url')}]:\n{r.get('content')[:200]}...\n")
        
    print("Testing Tavily Q2...")
    res2 = search.invoke({'query': 'Chicken broiler price inflation Indonesia, Richeese Factory vs KFC vs local Geprek strategies 2024-2025'})
    for r in res2:
        print(f"[{r.get('url')}]:\n{r.get('content')[:200]}...\n")
        
except Exception as e:
    print('Error:', e)
