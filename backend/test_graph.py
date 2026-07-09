import asyncio
from app.agents.graph import app_graph

async def main():
    config = {
        "configurable": {"thread_id": "test_123"},
        "industry": "Fried Chicken Franchise QSR",
        "country": "Indonesia"
    }
    initial_state = {"messages": [], "config": config}
    
    print("Running graph...")
    # Run the graph
    async for event in app_graph.astream(initial_state, config):
        for k, v in event.items():
            print(f"Finished node: {k}")
            if k == "generation_node":
                print("HTML length:", len(v.get("report_markdown", "")))

if __name__ == "__main__":
    asyncio.run(main())
