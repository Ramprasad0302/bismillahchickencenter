# Notifications

Every alert is stored and shown in the bell (top right) for admins,
retailers and drivers, and is also pushed to their devices.

| Event | Who is alerted |
|---|---|
| Daily price changed | Retailers on the standard rate |
| Special price set / changed / removed | That retailer |
| Order placed (cash / credit) | All admins |
| UPI order paid, online payment received | All admins + the retailer (receipt) |
| Admin changes an order's status | The retailer |
| Trip assigned | The driver |
| Trip assigned / driver starts the trip | Retailers on that trip ("out for delivery") |
| Trip completed | Each retailer (delivered + bill) and all admins (summary) |
| Admin records a payment | The retailer |

## Website (works with no setup)

Users tap the bell → **Turn on**. Alerts then arrive even when the website is
closed (Chrome, Edge, Firefox, Samsung Internet on Android and desktop;
Safari on iPhone only after "Add to Home Screen"). The server creates and
stores its push keys automatically on first start.

Optional: set fixed keys with `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT=mailto:you@example.com` in the backend environment.

## Android app (needs Firebase, free, ~10 minutes)

1. https://console.firebase.google.com → **Add project** (e.g. "Bismillah Chicken Center").
2. In the project: **Add app → Android**, package name
   `com.bismillahchickencenter.app` → **Register** → download
   **google-services.json** → put it in `client/android/app/`.
3. Project settings → **Service accounts** → **Generate new private key**.
   Open the downloaded JSON, copy everything, and add it to the backend
   environment variables as `FCM_SERVICE_ACCOUNT` (paste the whole JSON as
   the value). Redeploy the backend.
4. Rebuild the app: raise `versionCode` in `client/android/app/build.gradle`,
   then `cd client && npm run android:bundle`. The script prints
   "app push notifications ENABLED" when google-services.json is found.

Without step 2 the app still shows alerts in the bell while it is open;
pushes while the app is closed need Firebase.

## Check it works

Tap the bell → **Send test alert**. You should see it in the list, and as a
phone/desktop notification on every device where alerts were turned on.
