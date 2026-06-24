## Verification completed

- The admin account `emb.creations.llc@gmail.com` exists and has the `admin` role.
- That account is in couple `4be21f48-b9c8-426c-993e-311da4f404be`.
- No other account currently has the `admin` role.
- Advanced Quest access works because the quests code calls `couple_unlocked(..., 'quests_advanced')`, which includes the admin-couple bypass.
- The Atlas and Time Capsule pages are still locked because their visible paywall state comes from `getCoupleEntitlements`, which currently recalculates unlocks from paid rows + level/shared-day progress and does not call `couple_unlocked` for `time_capsule` or `the_atlas`.

## Plan

1. Update `getCoupleEntitlements` in `src/lib/payments.functions.ts` so the returned `timeCapsule` and `atlas` booleans come from the database unlock function:
   - `couple_unlocked(coupleId, 'time_capsule')`
   - `couple_unlocked(coupleId, 'the_atlas')`

2. Keep the existing `paid` fields separate so the payment UI still knows whether access came from payment versus free/admin unlock.

3. Keep `computeCoupleProgress` for progress messaging only, so non-admin accounts still see the correct free-access requirements.

4. Verify after implementation that:
   - Admin couple unlocks return true for Advanced Quests, Time Capsule, and Atlas.
   - `getCoupleEntitlements` cannot incorrectly show Time Capsule or Atlas as locked for the admin account.
   - Regular accounts still require either paid entitlement or the level/shared-day free unlock thresholds.

## Expected result

- `emb.creations.llc@gmail.com` gets unrestricted access to The Atlas and The Time Capsule without paying.
- Every other account remains gated by payment or the free unlock requirements for Time Capsule, Atlas, and Advanced Quests.