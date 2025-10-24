#!/bin/bash

BUILD_ID="68fb6cf21ddbe61c1abfbffc"
TOKEN="nfp_tQRVYzng4kwjz9fLX6P4BcAh3qkrknvg4589"

echo "Monitoring build: $BUILD_ID"
echo "================================"

for i in {1..30}; do
  RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.netlify.com/api/v1/builds/$BUILD_ID")

  DONE=$(echo "$RESPONSE" | grep -o '"done":true\|"done":false' | cut -d: -f2)
  STATE=$(echo "$RESPONSE" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

  echo "[$i] State: $STATE | Done: $DONE"

  if [ "$DONE" = "true" ]; then
    echo ""
    echo "================================"
    echo "Build complete! State: $STATE"
    echo "================================"

    if [ "$STATE" = "ready" ]; then
      echo "✅ Build successful!"
      echo "🌐 Your app is now live at: https://mahaveer-bhavan.netlify.app"
    else
      echo "⚠️  Build finished with state: $STATE"
      echo "Check logs at: https://app.netlify.com/sites/mahaveer-bhavan/deploys"
    fi
    break
  fi

  sleep 5
done

if [ "$DONE" != "true" ]; then
  echo ""
  echo "Build is still in progress..."
  echo "Check status at: https://app.netlify.com/sites/mahaveer-bhavan/deploys"
fi
