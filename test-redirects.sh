#!/bin/bash

# Test Domain Redirects for MyPasswordChecker.com

echo "🧪 Testing Domain Redirects..."
echo "================================"
echo ""

test_redirect() {
  local domain=$1
  local expected=$2

  echo "Testing: https://$domain"

  # Get HTTP status and Location header
  response=$(curl -s -I -L --max-redirs 0 "https://$domain" 2>&1)
  status=$(echo "$response" | grep -i "^HTTP" | head -1 | awk '{print $2}')
  location=$(echo "$response" | grep -i "^location:" | awk '{print $2}' | tr -d '\r')

  if [ "$status" = "301" ]; then
    if [[ "$location" == *"$expected"* ]]; then
      echo "  ✅ 301 redirect to $location"
    else
      echo "  ⚠️  301 redirect but wrong target: $location (expected: $expected)"
    fi
  elif [ "$status" = "200" ]; then
    echo "  ⏳ DNS not propagated yet (200 OK - no redirect)"
  else
    echo "  ❌ Unexpected status: $status"
  fi

  echo ""
}

# Test all alternate domains
test_redirect "mypasswordcheck.com" "mypasswordchecker.com"
test_redirect "www.mypasswordcheck.com" "www.mypasswordchecker.com"
test_redirect "myquantumpasswordchecker.com" "mypasswordchecker.com"
test_redirect "www.myquantumpasswordchecker.com" "www.mypasswordchecker.com"
test_redirect "quantumpasswordchecker.com" "mypasswordchecker.com"
test_redirect "www.quantumpasswordchecker.com" "www.mypasswordchecker.com"

echo "================================"
echo "✅ = Working correctly"
echo "⏳ = Waiting for DNS propagation"
echo "❌ = Error - check DNS configuration"
echo ""
echo "Note: It can take 15-60 minutes for DNS to propagate and SSL certs to provision."
