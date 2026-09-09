# Our Journey Analytics

## Source of truth

Product analytics live in `public.app_events`. The Phase 1 migration also creates `marketing_attributions` plus three server/admin-only metric views:

- `analytics_daily_activity`
- `analytics_user_cohorts`
- `analytics_couple_funnel`

Do not use analytics as an authorization mechanism. Entitlements remain authoritative for Premium access.

## Event taxonomy

Lifecycle: `user_signed_up`, `profile_completed`, `app_opened`, `session_started`.

Couple funnel: `couple_created`, `couple_invite_sent`, `couple_invite_accepted`, `couple_joined`, `couple_activated`.

Engagement: `activity_completed`, `first_activity_completed`, `prompt_completed`, `quest_completed`.

Monetization: `premium_viewed`, `purchase_started`, `purchase_completed`.

The existing `app_events` table remains backward compatible with historical event names.

## Activation

A couple is activated when at least two members exist and the couple completes its first meaningful activity. The current meaningful activities are a daily prompt response, solo reflection, quest step, or letter. `couple_activated` is protected by a unique partial index so it can only exist once per couple.

## Active users and sessions

An authenticated user is active when the app records an `app_opened`, `session_started`, or meaningful activity event. A session is a 30-minute inactivity window represented by a client-generated `session_id`. A new session is started after 30 minutes without an app open.

DAU = distinct active users per UTC calendar day. WAU/MAU should be calculated as distinct active users in rolling 7/30-day windows. Active couples are distinct couple IDs attached to qualifying events.

## Acquisition attribution

The client captures standard UTM parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`. First touch is preserved; subsequent visits update last touch. Attribution is associated with the authenticated user through `capture_marketing_attribution`.

Direct traffic is represented as source `direct` when no UTM source is present.

## Retention

D1/D7/D30 are cohort measures: a user is retained when any qualifying app event occurs in the corresponding one-day window after signup. The cohort view exposes boolean flags for each interval.

## Monetization

Our Journey currently uses one-time Stripe payments. `purchase_started` is emitted when checkout is opened. `purchase_completed` is emitted from the server-authoritative entitlement grant after a successful paid checkout.

Track gross revenue from `amount_cents` on successful entitlement events. Do **not** call this MRR/ARR, and do not infer subscription churn. CAC and LTV require campaign spend and sufficient paid history and are intentionally not fabricated by Phase 1.

## Privacy / security

Raw analytics are not exposed to ordinary users. Metric views are granted to `service_role` only. Event writers derive authenticated user identity from the current session or from trusted server-side records. Legacy `subscription_tier` columns are intentionally untouched.

## Future dashboard

A buyer-facing dashboard should report acquisition → signup → pairing → activation → retention → monetization by cohort and acquisition source. It should separate free/founding users from paying users and should never treat a lifetime promo grant as revenue.