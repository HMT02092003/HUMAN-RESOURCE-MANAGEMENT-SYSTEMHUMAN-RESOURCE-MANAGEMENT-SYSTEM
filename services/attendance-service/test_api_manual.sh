# Test Monthly Attendance Filter/Sort API
# Bạn cần thay TOKEN bằng token thật từ browser DevTools

TOKEN="YOUR_TOKEN_HERE"
API_BASE="http://localhost:4003"

echo "=== TEST 1: No filters (default) ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN" | jq '{total: .total, count: (.results | length)}'

echo -e "\n=== TEST 2: Filter by month ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=20&month=2024-10" \
  -H "Authorization: Bearer $TOKEN" | jq '{total: .total, count: (.results | length), first_month: .results[0].month}'

echo -e "\n=== TEST 3: Filter by isApproved ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=20&isApproved=false" \
  -H "Authorization: Bearer $TOKEN" | jq '{total: .total, count: (.results | length), sample_approved: .results[0].isApproved}'

echo -e "\n=== TEST 4: Sort by month ASC ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=5&sort=month&order=asc" \
  -H "Authorization: Bearer $TOKEN" | jq '{months: [.results[].month]}'

echo -e "\n=== TEST 5: Sort by month DESC ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=5&sort=month&order=desc" \
  -H "Authorization: Bearer $TOKEN" | jq '{months: [.results[].month]}'

echo -e "\n=== TEST 6: Filter by fullName ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=10&fullName=Nguyễn" \
  -H "Authorization: Bearer $TOKEN" | jq '{total: .total, names: [.results[].fullName]}'

echo -e "\n=== TEST 7: Sort by fullName ASC ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=10&sort=fullName&order=asc" \
  -H "Authorization: Bearer $TOKEN" | jq '{names: [.results[].fullName]}'

echo -e "\n=== TEST 8: Pagination - Page 1 ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{page: .page, ids: [.results[].id]}'

echo -e "\n=== TEST 9: Pagination - Page 2 ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=2&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{page: .page, ids: [.results[].id]}'

echo -e "\n=== TEST 10: Combined - Filter + Sort ==="
curl -s -X GET "$API_BASE/api/attendance/monthly-summaries-by-scope?permissionKey=users&page=1&pageSize=10&month=2024&sort=presentDays&order=desc" \
  -H "Authorization: Bearer $TOKEN" | jq '{total: .total, month: .results[0].month, presentDays: [.results[].presentDays]}'

echo -e "\n=== All tests completed ==="
