#!/usr/bin/env bash
# =============================================================================
# QRcodly load test runner — see README.md
#
#   ./run.sh provision [N]   create N Clerk test users + sessions (once, resumable)
#   ./run.sh seed            give every test user a realistic starting account
#   ./run.sh smoke           3 users for 2 min — always run this first
#   ./run.sh baseline | load | stress | spike | soak
#   ./run.sh cleanup         back to the seeded baseline (after every run)
#   ./run.sh destroy         delete ALL test-user data, then the Clerk users
#   ./run.sh status
#
# Configuration comes from load-tests/.env (see .env.example); any variable can
# also be set inline, e.g. USERS=2000 ./run.sh stress
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")"

# .env fills in defaults only: inline variables (STEPS=… ./run.sh stress) win, even over
# the empty placeholders from .env.example.
if [ -f .env ]; then
	while IFS= read -r line || [ -n "$line" ]; do
		case "$line" in '' | \#*) continue ;; esac
		key="${line%%=*}"
		value="${line#*=}"
		value="${value%\"}"
		value="${value#\"}"
		if [ -z "${!key:-}" ]; then export "$key=$value"; fi
	done <.env
fi

export API_URL="${API_URL:-https://api.qrcodly.de/api/v1}"
export FRONTEND_URL="${FRONTEND_URL:-https://www.qrcodly.de}"
STATE_DIR="$PWD/.state"
RESULTS_DIR="$PWD/results"
TOKENS_FILE="$STATE_DIR/tokens.json"
mkdir -p "$STATE_DIR" "$RESULTS_DIR"

for tool in node k6; do
	command -v "$tool" >/dev/null || {
		echo "Missing $tool (Node.js 22+, k6: brew install k6)"
		exit 1
	}
done

# Passed to k6 one by one, so the Clerk secret in .env never ends up in k6's __ENV.
K6_VARS=(
	API_URL FRONTEND_URL SCAN_URL USERS STEPS RAMP HOLD THINK PAGE_LOADS SCAN_RATE UNIQUE_URLS
	SLO_API_P95_MS SLO_PAGE_P95_MS SLO_ERROR_RATE ABORT_STREAK ABORT_LATENCY_MS
	NEW_CODES_PER_USER SEED_QR_CODES SEED_SHORT_URLS SEED_TAGS SEED_TEMPLATES SEED_CONCURRENCY
	CLEANUP_MODE CLEANUP_CONCURRENCY
)

k6_args() {
	K6_ARGS=(--include-system-env-vars=false -e "TOKENS_FILE=$TOKENS_FILE" -e "RESULTS_DIR=$RESULTS_DIR")
	for var in "${K6_VARS[@]}"; do
		if [ -n "${!var:-}" ]; then K6_ARGS+=(-e "$var=${!var}"); fi
	done
}

is_production() {
	case "$API_URL" in
	*localhost* | *127.0.0.1* | *stage* | *staging*) return 1 ;;
	*) return 0 ;;
	esac
}

confirm() {
	if [ "${YES:-}" = "1" ]; then return 0; fi
	printf '\n⚠️  %s\nType "yes" to continue: ' "$1"
	read -r answer
	if [ "$answer" != "yes" ]; then
		echo "Aborted."
		exit 1
	fi
}

ready_users() {
	node users.mjs count
}

run_profile() {
	local profile="$1" run_id requirements max_vus seconds ready
	run_id="${profile}-$(date +%Y%m%d-%H%M%S)"
	k6_args

	requirements=$(k6 inspect --execution-requirements "${K6_ARGS[@]}" -e "PROFILE=$profile" main.js)
	read -r max_vus seconds < <(node -e '
		const r = JSON.parse(require("fs").readFileSync(0, "utf8"));
		const parts = r.totalDuration.match(/[\d.]+(h|m(?!s)|s)/g) || [];
		const s = parts.reduce((t, p) => t + parseFloat(p) * { h: 3600, m: 60, s: 1 }[p.replace(/[\d.]/g, "")], 0);
		console.log(r.maxVUs, Math.ceil(s));' <<<"$requirements")

	ready=$(ready_users)
	if [ "$ready" -lt "$max_vus" ]; then
		echo "The $profile profile needs $max_vus test users, $ready are ready → ./run.sh provision $max_vus"
		exit 1
	fi
	if is_production && [ "$profile" != "smoke" ]; then
		confirm "Up to $max_vus concurrent users on PRODUCTION ($API_URL) for ~$((seconds / 60)) min."
	fi

	node users.mjs tokens --count "$max_vus" --ttl $((seconds + 1800)) --out "$TOKENS_FILE"

	echo "Run $run_id — live dashboard: http://127.0.0.1:5665"
	K6_WEB_DASHBOARD="${DASHBOARD:-true}" \
		K6_WEB_DASHBOARD_EXPORT="$RESULTS_DIR/$run_id.html" \
		k6 run "${K6_ARGS[@]}" -e "PROFILE=$profile" -e "RUN_ID=$run_id" main.js
}

run_admin() {
	local script="$1" ready
	ready=$(ready_users)
	if [ "$ready" -eq 0 ]; then
		echo "No test users yet → ./run.sh provision <count>"
		exit 1
	fi
	node users.mjs tokens --count "$ready" --ttl 14400 --out "$TOKENS_FILE"
	k6_args
	k6 run "${K6_ARGS[@]}" -e "RUN_ID=$script-$(date +%Y%m%d-%H%M%S)" "$script.js"
}

command="${1:-help}"
case "$command" in
provision)
	count="${2:-${LOADTEST_USERS:-100}}"
	if is_production; then
		confirm "Creates $count test accounts in the PRODUCTION Clerk instance (they count as users there)."
	fi
	node users.mjs provision --count "$count"
	;;
seed)
	if is_production; then confirm "Creates starting data for every test user on PRODUCTION ($API_URL)."; fi
	run_admin seed
	;;
cleanup)
	run_admin cleanup
	;;
destroy)
	confirm "Deletes ALL data of the test users, then the test users themselves from Clerk."
	# `set -e`: the Clerk users are only deleted if the cleanup verified that nothing is left.
	CLEANUP_MODE=all run_admin cleanup
	node users.mjs delete --yes
	;;
status)
	node users.mjs status
	;;
smoke | baseline | load | stress | spike | soak)
	run_profile "$command"
	;;
*)
	sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
	;;
esac
