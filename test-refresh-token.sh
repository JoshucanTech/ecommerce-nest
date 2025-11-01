#!/bin/bash

# Example curl command to test the refreshToken endpoint
# Replace YOUR_REFRESH_TOKEN_HERE with an actual refresh token

echo "Testing refreshToken endpoint..."

curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'

echo -e "\n"