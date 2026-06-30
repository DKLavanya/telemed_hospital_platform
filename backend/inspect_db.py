from sqlalchemy import create_engine, text

def main():
    db_url = "postgresql://neondb_owner:npg_u37sFRxBzqTd@ep-divine-voice-at7r8a9j-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    engine = create_engine(db_url)
    
    try:
        with engine.begin() as conn:
            res = conn.execute(text("SELECT id, name, email, role FROM users ORDER BY id")).fetchall()
            print("\n--- DATABASE USERS ---")
            for row in res:
                print(f"ID: {row[0]} | Name: {row[1]} | Email: {row[2]} | Role: {row[3]}")
            print("----------------------\n")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
