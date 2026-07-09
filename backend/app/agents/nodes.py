from .state import AgentState
from app.core.supabase_client import supabase
from app.core.database import SessionLocal
from app.models.strategic_report import StrategicReport
from langchain_groq import ChatGroq
from app.core.config import settings
from langchain_tavily import TavilySearch
from langchain_core.messages import HumanMessage, SystemMessage
import json
import os
import uuid

llm = ChatGroq(groq_api_key=settings.GROQ_API_KEY, model_name="llama-3.3-70b-versatile")
search = TavilySearch(tavily_api_key=settings.TAVILY_API_KEY, max_results=3)

async def context_loader_node(state: AgentState):
    """
    node 0: membaca file business_config.json
    """
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "business_config.json"
    )
    with open(config_path, "r") as f:
        config = json.load(f)
        
    return {
        "config": config,
        "messages": state.get("messages", []) + [SystemMessage(content="Loaded business_config.json")]
    }

async def preprocessing_node(state: AgentState):
    """
    node 1: query data kpi menggunakan strategicservice
    """
    period_start = state.get("period_start", "2024-01-01")
    period_end = state.get("period_end", "2024-12-31")
    
    from app.services.strategic_service import strategic_service
    
    df = await strategic_service.get_consolidated_data()
    
    if not df.empty:
        # menghitung deviasi dan performa regional menggunakan data csv/dummy
        kpi_data = strategic_service.calculate_deviations(df)
    else:
        kpi_data = {"status": "no_data_fetched"}
            
    return {
        "kpi_data": kpi_data,
        "messages": state.get("messages", []) + [SystemMessage(content=f"Preprocessed KPI data. Latest sales deviation: {kpi_data.get('overall_deviation', 0)}%")]
    }

async def context_retrieval_node(state: AgentState):
    """
    node 2: pencarian web dengan tavily - riset pasar komprehensif
    """
    config = state.get("config", {})
    industry = config.get("industry", "Fried Chicken Franchise QSR")
    country = config.get("country", "Indonesia")
    year = "2024-2025"
    
    q1 = f"{industry} market size, growth trends, consumer behavior {country} {year}"
    q2 = f"Chicken broiler price inflation {country}, Richeese Factory vs KFC vs local Geprek strategies {year}"
    
    try:
        res1 = search.invoke({"query": q1})
        res2 = search.invoke({"query": q2})
        
        if isinstance(res1, str) or isinstance(res2, str):
            context = f"Search error from API: {res1} | {res2}"
        else:
            context = "MARKET TRENDS:\n" + "\n".join([r.get('content', '') for r in res1]) + "\n\nCOMPETITOR & PRICING:\n" + "\n".join([r.get('content', '') for r in res2])
    except Exception as e:
        context = f"Search error: {str(e)}"
    
    return {
        "market_context": context, 
        "messages": state.get("messages", []) + [SystemMessage(content="External competitive & market context retrieved.")]
    }

async def strategic_reasoning_node(state: AgentState):
    """
    node 3: reasoning
    """
    config = state.get("config", {})
    kpi = state.get("kpi_data", {})
    external = state.get("market_context", "")
    
    prompt = f"""
    Analyze the business data for D'BESTO (PT. Evalinda Berkah Mandiri, Indonesian Fried Chicken Franchise, 200+ Outlets) using McKinsey, BCG, and Bain frameworks.
    
    KPI DATA (Internal Actual Metrics):
    {json.dumps(kpi)}
    
    EXTERNAL CONTEXT (Tavily Market Research):
    {external}
    
    Goal: Output a MASSIVE strategic analysis JSON exactly matching the schema below. Fill in all fields with highly professional, insightful, and realistic consulting analysis. Use data from external context to fill competitors and market details.
    
    EXPECTED JSON SCHEMA:
    {{
      "market_snapshot": {{
        "market_size": "e.g., ~IDR 45T",
        "market_growth": "e.g., ▲ Growing at ~12% CAGR",
        "consumer_base": "e.g., 270M+",
        "digital_penetration": "e.g., 65%",
        "tailwinds": ["trend 1", "trend 2", "trend 3", "trend 4", "trend 5"],
        "innovations": ["innovation 1", "innovation 2", "innovation 3", "innovation 4", "innovation 5"],
        "threats": ["threat 1", "threat 2", "threat 3", "threat 4", "threat 5"]
      }},
      "competitors": [
        {{
          "brand": "Competitor Name",
          "outlets": "Estimated",
          "model": "Brief business model",
          "price": "Price tier",
          "strengths": "...",
          "weaknesses": "...",
          "digital_maturity": "HIGH ⭐⭐⭐⭐⭐",
          "threat_level": "CRITICAL",
          "threat_pill_class": "high"
        }}
      ],
      "competitive_insight": "A 3-sentence deep insight on positioning vs Richeese, KFC, and Geprek.",
      "swot": {{
        "strengths": ["...", "...", "...", "...", "...", "..."],
        "weaknesses": ["...", "...", "...", "...", "...", "..."],
        "opportunities": ["...", "...", "...", "...", "...", "..."],
        "threats": ["...", "...", "...", "...", "...", "..."]
      }},
      "porters": {{
        "new_entrants": {{"level": "HIGH", "desc": "..."}},
        "substitutes": {{"level": "MODERATE", "desc": "..."}},
        "supplier_power": {{"level": "HIGH", "desc": "..."}},
        "buyer_power": {{"level": "MODERATE", "desc": "..."}},
        "rivalry": {{"level": "VERY HIGH", "desc": "..."}},
        "overall_intensity": "HIGH"
      }},
      "value_chain": {{
        "inbound": {{"score": "🟢 ADVANTAGE", "desc": "..."}},
        "operations": {{"score": "🟡 PARITY", "desc": "..."}},
        "outbound": {{"score": "🔴 GAP", "desc": "..."}},
        "marketing": {{"score": "🔴 GAP", "desc": "..."}},
        "service": {{"score": "🔴 GAP", "desc": "..."}},
        "firm_infra": {{"score": "🟡 PARITY", "desc": "..."}},
        "hr": {{"score": "🟡 PARITY", "desc": "..."}},
        "technology": {{"score": "🔴 GAP", "desc": "..."}},
        "procurement": {{"score": "🟢 ADVANTAGE", "desc": "..."}}
      }},
      "value_chain_gaps": [
        {{"title": "1. Main Gap Title", "desc": "Description..."}},
        {{"title": "2. Main Gap Title", "desc": "Description..."}},
        {{"title": "3. Main Gap Title", "desc": "Description..."}}
      ],
      "recommendations": [
        {{
          "id": "REC-01",
          "horizon": "IMMEDIATE (0-6 months)",
          "impact": "HIGH IMPACT",
          "title": "Initiative Title",
          "revenue_impact": "e.g., IDR 50-80Bn/yr",
          "capex": "e.g., 60% lower",
          "timeline": "e.g., 6 months",
          "bullets": ["...", "...", "..."]
        }}
      ],
      "bcg_matrix": [
        {{
          "unit": "e.g., Dine-In Outlets (Java Tier-1)",
          "market_growth": "Low (5-8%)",
          "market_share": "Moderate",
          "category": "💰 Cash Cow",
          "category_pill": "gold",
          "action": "Strategic action description",
          "priority": "MAINTAIN",
          "priority_pill": "low"
        }}
      ],
      "executive_brief": {{
        "burning_platform": ["...", "...", "...", "..."],
        "core_advantage": ["...", "...", "...", "..."],
        "top_actions": ["...", "...", "..."],
        "metrics": ["...", "...", "...", "..."],
        "investment": ["...", "...", "...", "..."],
        "risks": ["...", "...", "...", "..."],
        "bottom_line": "A powerful 4-sentence closing statement for the C-Suite."
      }}
    }}
    
    Ensure the JSON is strictly valid. Generate at least 5 competitors, 5 recommendations, and 4-5 items per array in SWOT and Executive Brief.
    """
    
    response = llm.invoke([SystemMessage(content="You are a Strategic Business Consultant from McKinsey. Return ONLY valid JSON, no markdown formatting wrappers if possible."), HumanMessage(content=prompt)])
    
    try:
        raw_content = response.content
        if "```json" in raw_content:
            raw_content = raw_content.split("```json")[1].split("```")[0].strip()
        analysis = json.loads(raw_content)
    except Exception as e:
        print("JSON Parse error:", e)
        analysis = {"raw_analysis": response.content}
        
    return {
        "analysis": analysis, 
        "messages": state.get("messages", []) + [SystemMessage(content="proses reasoning strategis selesai.")]
    }

async def generation_node(state: AgentState):
    """
    node 4: pembuatan laporan (markdown/html)
    node ini membangun html secara native menggunakan data json yang besar.
    """
    analysis = state.get("analysis", {})
    if "market_snapshot" not in analysis:
        return {
            "report_markdown": "<div style='padding:20px;color:red;'>Reasoning output failed to match expected JSON schema. Please retry. Raw: " + str(analysis) + "</div>",
            "messages": state.get("messages", [])
        }
        
    # susun baris kompetitor
    competitor_rows = ""
    for comp in analysis.get("competitors", []):
        competitor_rows += f"""
    <tr>
      <td><strong>{comp.get('brand')}</strong></td>
      <td><strong>{comp.get('outlets')}</strong></td>
      <td>{comp.get('model')}</td>
      <td>{comp.get('price')}</td>
      <td>{comp.get('strengths')}</td>
      <td>{comp.get('weaknesses')}</td>
      <td><span class="pill blue">{comp.get('digital_maturity')}</span></td>
      <td><span class="pill {comp.get('threat_pill_class', 'med')}">{comp.get('threat_level')}</span></td>
    </tr>"""

    # susun rekomendasi
    rec_html = ""
    for rec in analysis.get("recommendations", []):
        bullets = "".join([f"<li>{b}</li>" for b in rec.get('bullets', [])])
        rec_html += f"""
<div class="rec-card">
  <div class="rec-num">{rec.get('id')} &middot; {rec.get('horizon')} &middot; {rec.get('impact')}</div>
  <h4>{rec.get('title')}</h4>
  <div class="rec-meta">
    <span class="pill gold">Impact: {rec.get('revenue_impact')}</span>
    <span class="pill low">Capex: {rec.get('capex')}</span>
    <span class="pill blue">Timeline: {rec.get('timeline')}</span>
  </div>
  <ul>{bullets}</ul>
</div>"""

    # susun baris bcg
    bcg_rows = ""
    for bcg in analysis.get("bcg_matrix", []):
        bcg_rows += f"""
    <tr>
      <td><strong>{bcg.get('unit')}</strong></td>
      <td>{bcg.get('market_growth')}</td>
      <td>{bcg.get('market_share')}</td>
      <td><span class="pill {bcg.get('category_pill')}">{bcg.get('category')}</span></td>
      <td>{bcg.get('action')}</td>
      <td><span class="pill {bcg.get('priority_pill')}">{bcg.get('priority')}</span></td>
    </tr>"""

    # ekstrak bagian
    ms = analysis.get('market_snapshot', {})
    swot = analysis.get('swot', {})
    port = analysis.get('porters', {})
    vc = analysis.get('value_chain', {})
    vc_gaps = analysis.get('value_chain_gaps', [])
    eb = analysis.get('executive_brief', {})
    
    gwth = ms.get('market_growth', '')
    gwth_val = gwth.split(' ')[0] if gwth else ''

    report_html = f"""
<!-- ══════════ COVER ══════════ -->
<div class="cover">
  <h1>D'BESTO Franchise<br>Strategic Market Analysis</h1>
  <h2>Indonesian Fried Chicken Franchise Sector — Executive Intelligence Report</h2>
  <div class="divider"></div>
  <div class="meta">
    <div class="meta-item"><div class="k">Client Entity</div><div class="v">PT. Evalinda Berkah Mandiri</div></div>
    <div class="meta-item"><div class="k">Brand</div><div class="v">D'BESTO</div></div>
    <div class="meta-item"><div class="k">Active Outlets</div><div class="v">200+</div></div>
    <div class="meta-item"><div class="k">Market</div><div class="v">Indonesia</div></div>
    <div class="meta-item"><div class="k">Frameworks</div><div class="v">SWOT &middot; Porter's 5F &middot; Value Chain &middot; BCG Matrix</div></div>
  </div>
</div>

<!-- ══════════ MARKET SNAPSHOT ══════════ -->
<div class="section-title">
  <div class="num">1</div>
  <h3>Market Snapshot — Indonesian Fried Chicken Sector</h3>
  <div class="line"></div>
</div>

<div class="grid4">
  <div class="kpi-tile"><div class="kv">{ms.get('market_size', '')}</div><div class="kk">Market Size Est.</div></div>
  <div class="kpi-tile"><div class="kv">{ms.get('consumer_base', '')}</div><div class="kk">Consumer Base</div></div>
  <div class="kpi-tile"><div class="kv">{ms.get('digital_penetration', '')}</div><div class="kk">Digital Penetration</div></div>
  <div class="kpi-tile"><div class="kv">{gwth_val}</div><div class="kk">Market Growth</div><div class="kd" style="color:var(--green)">{gwth}</div></div>
</div>

<div class="card blue" style="margin-top:4px">
  <h4>Key Market Dynamics</h4>
  <div class="grid3">
    <div>
      <strong style="color:var(--navy);font-size:12px">📈 Structural Tailwinds</strong>
      <ul style="margin-top:8px;padding-left:14px;font-size:12px;color:var(--mid-gray)">
        {"".join([f"<li>{t}</li>" for t in ms.get('tailwinds', [])])}
      </ul>
    </div>
    <div>
      <strong style="color:var(--navy);font-size:12px">⚡ Disruptive Innovations</strong>
      <ul style="margin-top:8px;padding-left:14px;font-size:12px;color:var(--mid-gray)">
        {"".join([f"<li>{i}</li>" for i in ms.get('innovations', [])])}
      </ul>
    </div>
    <div>
      <strong style="color:var(--navy);font-size:12px">⚠️ Emerging Threats</strong>
      <ul style="margin-top:8px;padding-left:14px;font-size:12px;color:var(--mid-gray)">
        {"".join([f"<li>{t}</li>" for t in ms.get('threats', [])])}
      </ul>
    </div>
  </div>
</div>

<!-- ══════════ COMPETITOR LANDSCAPE ══════════ -->
<div class="section-title">
  <div class="num">2</div>
  <h3>Competitive Landscape — Top 5 Benchmark</h3>
  <div class="line"></div>
</div>

<table>
  <thead>
    <tr>
      <th>Brand</th>
      <th>Outlets</th>
      <th>Business Model</th>
      <th>Price Point</th>
      <th>Strengths</th>
      <th>Weaknesses</th>
      <th>Digital Maturity</th>
      <th>Threat</th>
    </tr>
  </thead>
  <tbody>
    {competitor_rows}
  </tbody>
</table>

<div class="card gold">
  <h4>💡 Competitive Positioning Insight</h4>
  <p style="font-size:12px;color:var(--dark);line-height:1.7">{analysis.get('competitive_insight', '')}</p>
</div>

<!-- ══════════ SWOT ══════════ -->
<div class="section-title">
  <div class="num">3</div>
  <h3>SWOT Analysis — D'BESTO / PT. Evalinda Berkah Mandiri</h3>
  <div class="line"></div>
</div>

<div class="swot">
  <div class="swot-cell sw"><h4>💪 Strengths</h4><ul>{"".join([f"<li>{s}</li>" for s in swot.get('strengths', [])])}</ul></div>
  <div class="swot-cell ww"><h4>⚠️ Weaknesses</h4><ul>{"".join([f"<li>{w}</li>" for w in swot.get('weaknesses', [])])}</ul></div>
  <div class="swot-cell ow"><h4>🚀 Opportunities</h4><ul>{"".join([f"<li>{o}</li>" for o in swot.get('opportunities', [])])}</ul></div>
  <div class="swot-cell tw"><h4>🎯 Threats</h4><ul>{"".join([f"<li>{t}</li>" for t in swot.get('threats', [])])}</ul></div>
</div>

<!-- ══════════ PORTER'S FIVE FORCES ══════════ -->
<div class="section-title"><div class="num">4</div><h3>Porter's Five Forces</h3><div class="line"></div></div>
<div class="porter-top-bottom">
  <div class="porter-box" style="border-top:4px solid var(--orange)">
    <h5 style="color:var(--orange)">🔼 Threat of New Entrants — <span class="pill med">{port.get('new_entrants', dict()).get('level')}</span></h5>
    <p>{port.get('new_entrants', dict()).get('desc')}</p>
  </div>
  <div class="porter-box" style="border-top:4px solid var(--green)">
    <h5 style="color:var(--green)">🔽 Threat of Substitutes — <span class="pill med">{port.get('substitutes', dict()).get('level')}</span></h5>
    <p>{port.get('substitutes', dict()).get('desc')}</p>
  </div>
</div>
<div class="porter-ring">
  <div class="porter-side">
    <div class="porter-box" style="border-left:4px solid var(--red)">
      <h5 style="color:var(--red)">⬅ Supplier Power — <span class="pill high">{port.get('supplier_power', dict()).get('level')}</span></h5>
      <p>{port.get('supplier_power', dict()).get('desc')}</p>
    </div>
  </div>
  <div class="porter-center">
    <h4>D'BESTO<br>Competitive Position</h4>
    <div style="margin-top:12px;font-size:11px;opacity:.85;line-height:1.6">200+ Outlets<br>Value–Mid Tier<br>Indonesia-wide</div>
    <div style="margin-top:14px;background:var(--gold);color:var(--navy);border-radius:6px;padding:8px;font-weight:700;font-size:11px">Overall Intensity: {port.get('overall_intensity')}</div>
  </div>
  <div class="porter-side">
    <div class="porter-box" style="border-right:4px solid var(--blue)">
      <h5 style="color:var(--blue)">➡ Buyer Power — <span class="pill med">{port.get('buyer_power', dict()).get('level')}</span></h5>
      <p>{port.get('buyer_power', dict()).get('desc')}</p>
    </div>
  </div>
</div>
<div style="margin-top:12px"><div class="porter-box" style="border-bottom:4px solid var(--navy)"><h5 style="color:var(--navy)">⚡ Competitive Rivalry — <span class="pill high">{port.get('rivalry', dict()).get('level')}</span></h5><p>{port.get('rivalry', dict()).get('desc')}</p></div></div>

<!-- ══════════ VALUE CHAIN ══════════ -->
<div class="section-title"><div class="num">5</div><h3>Strategic Value Chain Analysis</h3><div class="line"></div></div>
<div style="margin-bottom:10px">
  <div style="font-size:11px;font-weight:700;color:var(--mid-gray);text-transform:uppercase;margin-bottom:6px">PRIMARY ACTIVITIES</div>
  <div class="vc-row">
    <div class="vc-cell vc-primary"><div class="vc-label">Inbound Logistics</div><div class="vc-score">{vc.get('inbound', dict()).get('score')}</div></div>
    <div class="vc-cell vc-primary"><div class="vc-label">Operations</div><div class="vc-score">{vc.get('operations', dict()).get('score')}</div></div>
    <div class="vc-cell vc-primary"><div class="vc-label">Outbound / Delivery</div><div class="vc-score">{vc.get('outbound', dict()).get('score')}</div></div>
    <div class="vc-cell vc-primary"><div class="vc-label">Marketing & Sales</div><div class="vc-score">{vc.get('marketing', dict()).get('score')}</div></div>
    <div class="vc-cell vc-primary"><div class="vc-label">Service</div><div class="vc-score">{vc.get('service', dict()).get('score')}</div></div>
  </div>
</div>
<div>
  <div style="font-size:11px;font-weight:700;color:var(--mid-gray);text-transform:uppercase;margin-bottom:6px">SUPPORT ACTIVITIES</div>
  <div class="vc-row">
    <div class="vc-cell vc-support"><div class="vc-label">Firm Infrastructure</div><div class="vc-score">{vc.get('firm_infra', dict()).get('score')}</div></div>
    <div class="vc-cell vc-support"><div class="vc-label">HR Management</div><div class="vc-score">{vc.get('hr', dict()).get('score')}</div></div>
    <div class="vc-cell vc-support"><div class="vc-label">Technology</div><div class="vc-score">{vc.get('technology', dict()).get('score')}</div></div>
    <div class="vc-cell vc-support"><div class="vc-label">Procurement</div><div class="vc-score">{vc.get('procurement', dict()).get('score')}</div></div>
  </div>
</div>
<div class="card orange" style="margin-top:14px">
  <h4>⚡ Value Chain Priority Gaps</h4>
  <div class="grid3">
    {"".join([f"<div><strong style='font-size:12px'>{g.get('title')}</strong><p style='font-size:12px;color:var(--mid-gray);margin-top:4px'>{g.get('desc')}</p></div>" for g in vc_gaps[:3]])}
  </div>
</div>

<!-- ══════════ RECOMMENDATIONS ══════════ -->
<div class="section-title"><div class="num">6</div><h3>Strategic Recommendations</h3><div class="line"></div></div>
{rec_html}

<!-- ══════════ BCG MATRIX ══════════ -->
<div class="section-title"><div class="num">7</div><h3>BCG Portfolio Matrix</h3><div class="line"></div></div>
<table>
  <thead><tr><th>Business Unit</th><th>Market Growth</th><th>Market Share</th><th>BCG Category</th><th>Strategic Action</th><th>Priority</th></tr></thead>
  <tbody>{bcg_rows}</tbody>
</table>

<!-- ══════════ EXECUTIVE BRIEF ══════════ -->
<div class="section-title"><div class="num">8</div><h3>Executive One-Pager</h3><div class="line"></div></div>
<div class="brief">
  <h2>D'BESTO STRATEGIC BRIEF</h2>
  <div class="sub">Executive Summary</div>
  <div class="brief-grid">
    <div class="brief-sec"><h4>🔴 Burning Platform</h4><ul>{"".join([f"<li>{x}</li>" for x in eb.get('burning_platform', [])])}</ul></div>
    <div class="brief-sec"><h4>🟢 Core Advantage</h4><ul>{"".join([f"<li>{x}</li>" for x in eb.get('core_advantage', [])])}</ul></div>
    <div class="brief-sec"><h4>⚡ Top Actions</h4><ul>{"".join([f"<li>{x}</li>" for x in eb.get('top_actions', [])])}</ul></div>
    <div class="brief-sec"><h4>📊 Success Metrics</h4><ul>{"".join([f"<li>{x}</li>" for x in eb.get('metrics', [])])}</ul></div>
    <div class="brief-sec"><h4>💰 Investment</h4><ul>{"".join([f"<li>{x}</li>" for x in eb.get('investment', [])])}</ul></div>
    <div class="brief-sec"><h4>⚠️ Top Risks</h4><ul>{"".join([f"<li>{x}</li>" for x in eb.get('risks', [])])}</ul></div>
  </div>
  <div style="margin-top:24px;padding:16px;background:rgba(201,168,76,.15);border-radius:8px;border-left:4px solid var(--gold)">
    <strong style="color:var(--gold);font-size:12px">BOTTOM LINE FOR THE C-SUITE:</strong>
    <p style="font-size:12px;margin-top:6px;line-height:1.6;opacity:.9">{eb.get('bottom_line', '')}</p>
  </div>
</div>
"""

    return {
        "report_markdown": report_html, 
        "messages": state.get("messages", []) + [HumanMessage(content="Report generated.")]
    }

async def persister_node(state: AgentState):
    """
    node 5: persister (penyimpanan laporan ke database)
    """
    db = SessionLocal()
    report_id = str(uuid.uuid4())
    try:
        new_report = StrategicReport(
            id=report_id,
            created_by=state.get("user_id"),
            title=f"Strategic Report - {state.get('period_start', '')} to {state.get('period_end', '')}",
            report_markdown=state.get("report_markdown", ""),
            analysis_json=state.get("analysis", {}),
            kpis_snapshot=state.get("kpi_data", {}),
            period_start=state.get("period_start"),
            period_end=state.get("period_end"),
            model_used="groq/llama-3.3-70b-versatile"
        )
        db.add(new_report)
        db.commit()
    except Exception as e:
        db.rollback()
        print("Error saving report:", e)
    finally:
        db.close()
        
    return {
        "report_id": report_id,
        "messages": state.get("messages", []) + [SystemMessage(content=f"Report saved with id {report_id}.")]
    }
