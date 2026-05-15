import asyncio
import sys
import json
sys.path.insert(0, '/app')

async def debug_contract():
    from backend.core.config.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        print("--- CONTRACT DATA ---")
        # contract_number might have slight variations, use LIKE
        r = await conn.execute(text(
            "SELECT id, contract_number, analysis, is_active, last_analysis_at, analysis_version "
            "FROM contratos WHERE contract_number LIKE '%05000/2025%'"
        ))
        row = r.fetchone()
        if not row:
            print("Contract 05000/2025 not found.")
            return

        cid = row[0]
        print(f"ID: {cid}")
        print(f"Number: {row[1]}")
        print(f"Is Active: {row[3]}")
        print(f"Version: {row[5]}")
        print(f"Analysis JSON: {json.dumps(row[2], indent=2)}")

        print("\n--- ACTIVE ALERTS FOR THIS CONTRACT ---")
        r2 = await conn.execute(text(
            "SELECT id, type, status, severity, metadata FROM alertas WHERE contract_id = :cid"
        ), {"cid": cid})
        alerts = r2.fetchall()
        for a in alerts:
            print(f"ID: {a[0]} | Type: {a[1]} | Status: {a[2]} | Severity: {a[3]} | Metadata: {a[4]}")

    await engine.dispose()

asyncio.run(debug_contract())
