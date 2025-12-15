import asyncio
import httpx
import sys

async def test_register():
    url = "http://localhost:8000/auth/register"
    data = {
        "email": "test_new_user@example.com",
        "password": "StrongPassword123!"
    }
    
    print(f"Testing registration against {url}...")
    
    # 1. Test clean registration (no headers)
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data)
            print(f"Response (no headers): {response.status_code}")
            print(f"Body: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

    # 2. Test with invalid Auth header (simulate frontend having stale token)
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": "Bearer invalid_token_here"}
        try:
            response = await client.post(url, json=data, headers=headers)
            print(f"Response (with invalid auth header): {response.status_code}")
            print(f"Body: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_register())
