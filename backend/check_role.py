from sqlalchemy import create_engine, text

def main():
    db_url = "postgresql://neondb_owner:npg_tfw7vWKaTxN0@ep-divine-voice-at7r8a9j-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    engine = create_engine(db_url)
    
    email = "dklavanya14@gmail.com"
    try:
        with engine.begin() as conn:
            res = conn.execute(
                text("SELECT id, name, email, role FROM users WHERE email = :email"),
                {"email": email}
            ).fetchone()
            
            if res:
                print(f"DATABASE ROLE CHECK: User ID={res[0]}, Name={res[1]}, Email={res[2]}, Role='{res[3]}'")
            else:
                print(f"No user found with email {email} in the database.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
