import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's own default is 1MB. The client only blocks résumés over
      // MAX_RESUME_BYTES (src/lib/parse/constants.ts) — anything between the
      // two silently hit the framework ceiling instead of the client's own
      // check, which is how a real upload went stuck with no error.
      //
      // ~~Set with margin over 5MB for multipart overhead: "8mb".~~ Corrected
      // 2026-09-23: Vercel caps a function request body at 4.5 MB regardless
      // of this value, so 8mb only made local dev accept what production
      // refuses. Matching the platform means `next dev` reproduces the
      // production failure instead of hiding it. The résumé cap is 4 MB.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
