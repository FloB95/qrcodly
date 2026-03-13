#!/bin/bash
# =============================================================================
# QRcodly Load Test Runner
#
# Usage:
#   ./load-tests/run.sh                          # Smoke test (default)
#   ./load-tests/run.sh medium                   # Medium load
#   ./load-tests/run.sh heavy                    # 1000 VUs stress test
#   ./load-tests/run.sh spike                    # Spike test
#   SAVE_RESULTS=1 ./load-tests/run.sh heavy     # Save results to JSON
#
# Reads configuration from load-tests/.env
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Load .env file
if [ -f "$ENV_FILE" ]; then
    echo -e "${CYAN}Loading config from $ENV_FILE${NC}"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${YELLOW}No .env file found. Copy .env.example to .env and fill in your values.${NC}"
fi

# CLI argument overrides .env PROFILE
PROFILE="${1:-${PROFILE:-smoke}}"

echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   QRcodly Load Test — ${PROFILE}${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
if ! command -v k6 &>/dev/null; then
    echo -e "${RED}Error: k6 is not installed. Run: brew install k6${NC}"
    exit 1
fi

# Build k6 env args
K6_ENVS="-e PROFILE=$PROFILE"
if [ -z "${BASE_URL:-}" ]; then
    echo -e "${RED}Error: BASE_URL is required. Set it in .env${NC}"
    exit 1
fi
if [ -z "${FRONTEND_URL:-}" ]; then
    echo -e "${RED}Error: FRONTEND_URL is required. Set it in .env${NC}"
    exit 1
fi
K6_ENVS="$K6_ENVS -e BASE_URL=$BASE_URL"
K6_ENVS="$K6_ENVS -e FRONTEND_URL=$FRONTEND_URL"
K6_ENVS="$K6_ENVS -e MODE=${MODE:-full}"

# HTAccess credentials
if [ -n "${HTACCESS_USER:-}" ] && [ -n "${HTACCESS_PASS:-}" ]; then
    K6_ENVS="$K6_ENVS -e HTACCESS_USER=$HTACCESS_USER -e HTACCESS_PASS=$HTACCESS_PASS"
    echo -e "${CYAN}HTAccess auth: enabled${NC}"
fi

# Short codes
if [ -n "${SHORT_CODES:-}" ]; then
    K6_ENVS="$K6_ENVS -e SHORT_CODES=$SHORT_CODES"
    CODE_COUNT=$(echo "$SHORT_CODES" | tr ',' '\n' | wc -l | tr -d ' ')
    echo -e "${CYAN}Short codes: $CODE_COUNT codes for scan simulation${NC}"
fi

# Generate Clerk tokens (if secret key is set)
if [ -n "${CLERK_SECRET_KEY:-}" ]; then
    echo -e "${YELLOW}Generating Clerk tokens...${NC}"
    TOKENS=$(node "$SCRIPT_DIR/generate-tokens.mjs")

    if [ -n "$TOKENS" ]; then
        TOKEN_COUNT=$(echo "$TOKENS" | tr ',' '\n' | wc -l | tr -d ' ')
        echo -e "${GREEN}Got $TOKEN_COUNT tokens${NC}"
        K6_ENVS="$K6_ENVS -e CLERK_TOKENS=$TOKENS"

        # Also pass the secret key for token refresh during test
        K6_ENVS="$K6_ENVS -e CLERK_SECRET_KEY=$CLERK_SECRET_KEY"
        K6_ENVS="$K6_ENVS -e JWT_TEMPLATE=$JWT_TEMPLATE"
        K6_ENVS="$K6_ENVS -e TEST_USER_IDS=${TEST_USER_IDS:-}"
    else
        echo -e "${RED}Warning: Failed to generate tokens. CRUD tests will be skipped.${NC}"
    fi
else
    echo -e "${YELLOW}No CLERK_SECRET_KEY set. Running scan-only mode.${NC}"
    K6_ENVS="$K6_ENVS -e MODE=scan-only"
fi

echo ""

# Add result output if requested
if [ "${SAVE_RESULTS:-}" = "1" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    RESULT_FILE="$SCRIPT_DIR/results/${PROFILE}_${TIMESTAMP}.json"
    K6_EXTRA="--out json=$RESULT_FILE"
    echo -e "${YELLOW}Results → $RESULT_FILE${NC}"
    echo ""
else
    K6_EXTRA=""
fi

# Run k6
echo -e "${YELLOW}Starting k6 with profile: $PROFILE${NC}"
echo ""
eval k6 run "$SCRIPT_DIR/main.js" $K6_ENVS $K6_EXTRA
