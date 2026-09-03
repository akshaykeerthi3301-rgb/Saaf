import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's own default is 1MB. The client only blocks résumés over 5MB
      // (parse-resume.ts's MAX_RESUME_BYTES) — anything between the two
      // silently hit the platform ceiling instead of the client's own
      // check, which is how a real upload went stuck with no error. Set
      // with margin over 5MB for multipart overhead, not exactly 5MB.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
