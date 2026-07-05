import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getJourneySnapshot from "./tools/get-journey-snapshot";
import listSoloReflections from "./tools/list-solo-reflections";
import writeSoloReflection from "./tools/write-solo-reflection";
import listTimeCapsules from "./tools/list-time-capsules";

// See app-mcp-server-authoring: OAuth issuer must be the direct Supabase host,
// derived from the build-time-inlined project ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "our-journey-mcp",
  title: "Our Journey",
  version: "0.1.0",
  instructions:
    "Tools for Our Journey, a private couples app. Use `get_journey_snapshot` to orient (partner, streak, XP), `list_time_capsules` for shared letters/voice notes, and `list_solo_reflections` / `write_solo_reflection` for the user's own private journal entries. Solo reflections are never shared with the partner.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getJourneySnapshot, listSoloReflections, writeSoloReflection, listTimeCapsules],
});
