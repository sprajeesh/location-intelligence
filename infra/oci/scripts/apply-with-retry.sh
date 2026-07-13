#!/usr/bin/env bash
# Retries `terraform apply` when OCI reports the target shape (typically
# VM.Standard.A1.Flex) is out of host capacity -- a known, intermittent,
# transient condition, not a real error. Any other failure (auth, quota,
# invalid HCL, security list conflicts, etc.) fails immediately on the
# first attempt so it never gets masked by the retry loop.
#
# The plan is regenerated immediately before every attempt, including the
# first -- a capacity error on one resource doesn't stop Terraform from
# having already created others in the same apply, which changes state out
# from under the plan file passed in. Reapplying that same now-stale plan
# fails with "Saved plan is stale" instead of retrying, silently swallowing
# the capacity-error retry this script exists for.
set -uo pipefail # no -e: we need to inspect terraform's exit code ourselves

PLAN_FILE="$1"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

MAX_ATTEMPTS=6
BASE_DELAY=60 # seconds; backoff is BASE_DELAY * attempt: 60,120,180,240,300,360 (~21.5 min worst case)

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "=== terraform plan (refresh) attempt ${attempt}/${MAX_ATTEMPTS} ==="
  if ! terraform plan -input=false -no-color -out="$PLAN_FILE"; then
    echo "=== plan itself failed, not retrying ==="
    exit 1
  fi

  echo "=== terraform apply attempt ${attempt}/${MAX_ATTEMPTS} ==="
  OUTPUT=$(terraform apply -auto-approve -input=false -no-color "$PLAN_FILE" 2>&1)
  STATUS=$?
  echo "$OUTPUT"

  if [ "$STATUS" -eq 0 ]; then
    echo "=== apply succeeded ==="
    exit 0
  fi

  if echo "$OUTPUT" | grep -qiE "Out of host capacity|OutOfCapacity|InternalError.*capacity"; then
    if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
      echo "=== exhausted ${MAX_ATTEMPTS} attempts, still out of capacity -- giving up ==="
      exit 1
    fi
    DELAY=$((BASE_DELAY * attempt))
    echo "=== capacity error detected, backing off ${DELAY}s before retry ==="
    sleep "$DELAY"
    continue
  fi

  echo "=== non-capacity error, failing immediately (not retrying) ==="
  exit 1
done
