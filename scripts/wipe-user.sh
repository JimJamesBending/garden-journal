#!/bin/bash
# Wipe a user's data from Supabase by phone number
# Usage: ./scripts/wipe-user.sh 447792509648

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load env vars from .env.production.local
if [ -f "$PROJECT_DIR/.env.production.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.production.local" | tr -d '\n' | xargs)
fi

PHONE="${1:-447792509648}"
API="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
BASE="${SUPABASE_URL}/rest/v1"
AUTH="${SUPABASE_URL}/auth/v1"

# Find profile
PROFILE_ID=$(curl -s "$BASE/profiles?phone=eq.$PHONE&select=id" \
  -H "apikey: $API" -H "Authorization: Bearer $API" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROFILE_ID" ]; then
  echo "No user found for phone $PHONE — already clean."
  exit 0
fi

echo "Found profile: $PROFILE_ID"

# Get conversation and garden IDs
CONV_ID=$(curl -s "$BASE/conversations?profile_id=eq.$PROFILE_ID&select=id" \
  -H "apikey: $API" -H "Authorization: Bearer $API" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

GARDEN_ID=$(curl -s "$BASE/gardens?owner_id=eq.$PROFILE_ID&select=id" \
  -H "apikey: $API" -H "Authorization: Bearer $API" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Delete in order
[ -n "$CONV_ID" ] && curl -s -X DELETE "$BASE/messages?conversation_id=eq.$CONV_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null
[ -n "$GARDEN_ID" ] && curl -s -X DELETE "$BASE/plants?garden_id=eq.$GARDEN_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null
[ -n "$GARDEN_ID" ] && curl -s -X DELETE "$BASE/log_entries?garden_id=eq.$GARDEN_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null
[ -n "$GARDEN_ID" ] && curl -s -X DELETE "$BASE/gardens?id=eq.$GARDEN_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null
[ -n "$CONV_ID" ] && curl -s -X DELETE "$BASE/conversations?id=eq.$CONV_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null
curl -s -X DELETE "$BASE/profiles?id=eq.$PROFILE_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null
curl -s -X DELETE "$AUTH/admin/users/$PROFILE_ID" -H "apikey: $API" -H "Authorization: Bearer $API" > /dev/null

echo "Wiped. You're a new user again."
