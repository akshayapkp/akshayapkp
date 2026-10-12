# AI Professional Summary setup

The AI Summary popup is implemented in the existing Resume Builder UI and calls the authenticated Next.js endpoint:
POST /api/resume-builder/ai-summary.

## Configure Gemini

1. Create an API key in Google AI Studio: https://aistudio.google.com/apikey
2. In Vercel project settings, add server-side environment variables:
   - GEMINI_API_KEY = your AI Studio key
   - GEMINI_MODEL = gemini-3.5-flash-lite (optional; default model)
3. Redeploy after saving the environment variables.

Do not use a NEXT_PUBLIC_ prefix. Never put the key in HTML, browser JavaScript, GitHub, or client-side configuration.

## Free use and privacy

Free-tier models and quotas can change. Once the free quota is reached, the API returns an informative limit message and does not call a paid model. Check current Gemini API terms and limits before sending sensitive personal information.

Only summary-related details are sent for generation: job title, current summary, skills, education, experience, projects, target job and instructions. Name, email, mobile number, address and photo are not sent.

## Future provider changes

The provider call is isolated in app/api/resume-builder/ai-summary/route.ts. A future provider can be added in that server-side route without redesigning the popup or existing resume flow.

Save, History, PDF, templates, and the existing Generate Summary / Objective button are retained.
