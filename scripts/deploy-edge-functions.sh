#!/bin/bash
# Deploy all Supabase Edge Functions
# Usage: ./scripts/deploy-edge-functions.sh <PROJECT_REF> <ACCESS_TOKEN>

set -e

PROJECT_REF="${1:-$SUPABASE_PROJECT_REF}"
ACCESS_TOKEN="${2:-$SUPABASE_ACCESS_TOKEN}"

if [[ -z "$PROJECT_REF" || -z "$ACCESS_TOKEN" ]]; then
  echo "Usage: ./scripts/deploy-edge-functions.sh <PROJECT_REF> <ACCESS_TOKEN>"
  echo "Get access token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

echo "Deploying to project: $PROJECT_REF"

# Update config.toml with new project ref
sed -i "s/project_id = .*/project_id = \"$PROJECT_REF\"/" supabase/config.toml

# Login with access token
echo "$ACCESS_TOKEN" | npx supabase login --token "$ACCESS_TOKEN"

# Link to project
npx supabase link --project-ref "$PROJECT_REF"

# Deploy register-user function
echo "Deploying register-user..."
npx supabase functions deploy register-user \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "✅ Edge functions deployed successfully"
echo "Function URL: https://$PROJECT_REF.supabase.co/functions/v1/register-user"
