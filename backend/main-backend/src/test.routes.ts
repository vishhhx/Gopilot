







// // this is for the run the calender............................................

// import { Router } from "express";
// import calendarCoordinatorAgent from "./agents/calender";
// import { run } from "@openai/agents";

// const router = Router();

// // ✅ FIXED: context must be an object, not an array
// const context = {
//   calendar: {
//     refreshToken:
//       "1//0gdhVMA6CC50gCgYIARAAGBASNwF-L9IrRA2JdE7WdlaCmFBGo7au7m3du0c0zBa8ZPoLkVDAR_L5fM_bb9LLKLymdxH6KrfPYkg",
//   },
// };




// router.post("/testagent", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     const runResult = await run(calendarCoordinatorAgent, prompt, { context });

//     console.log("🟢 Final Output (text):", runResult.output_text);
//     console.log("🟢 Structured Output:", runResult.output);

//     // Parse JSON safely
//     let events = [];
//     if (runResult.output?.[0]?.output?.text) {
//       try {
//         const parsed = JSON.parse(runResult.output[0].output.text);
//         if (parsed.success && parsed.data?.events) {
//           events = parsed.data.events;
//         }
//       } catch (e) {
//         console.error("❌ Error parsing JSON from agent output:", e);
//       }
//     }

//     res.json({
//       success: true,
//       message: runResult.output_text,
//       events,                   // now contains actual calendar events
//       toolCalls: runResult.tool_calls ?? [],
//     });
//   } catch (err: any) {
//     console.error("Agent Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;






//this is for the run the  forms ...................................................







import { Router } from "express";
import formCoordinatorAgent from "./agents/form";
import { run } from "@openai/agents";

const router = Router();

// ✅ Context object with form service refresh token
const context = {
  form: [
    {
      service: "form",
      refreshToken:
        "1//0gdhVMA6CC50gCgYIARAAGBASNwF-L9IrRA2JdE7WdlaCmFBGo7au7m3du0c0zBa8ZPoLkVDAR_L5fM_bb9LLKLymdxH6KrfPYkg",
    },
  ],
};

/**
 * POST /testagent
 * Test the form coordinator agent with any prompt
 * 
 * Example prompts:
 * - "Create a customer feedback form with 3 questions"
 * - "List all my forms"
 * - "Show me responses for my forms"
 * - "Export all responses as CSV"
 * - "Delete this form permanently"
 */
router.post("/testagent", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("📋 Form Agent Prompt:", prompt);

    const runResult = await run(formCoordinatorAgent, prompt, { context });

    console.log("🟢 Final Output (text):", runResult.finalOutput);
    console.log("🟢 Structured Output:", runResult.output);

    // Parse JSON safely - extract form data
    let formData = {
      forms: [],
      responses: [],
      analytics: null,
      links: null,
    };

    if (runResult.output?.[0]?.output?.text) {
      try {
        const parsed = JSON.parse(runResult.output[0].output.text);

        // Extract form data if available
        if (parsed.success && parsed.data) {
          formData.forms.push({
            id: parsed.data.id,
            title: parsed.data.title,
            shareableLink: parsed.data.shareableLink,
            shortLink: parsed.data.shortLink,
            embedCode: parsed.data.embedCode,
            createdAt: parsed.data.createdAt,
          });
          formData.links = {
            shareableLink: parsed.data.shareableLink,
            shortLink: parsed.data.shortLink,
            embedCode: parsed.data.embedCode,
          };
        }
        if (parsed.data?.responses) {
          formData.responses = parsed.data.responses;
        }
        if (parsed.data?.analytics) {
          formData.analytics = parsed.data.analytics;
        }
      } catch (e) {
        console.error("❌ Error parsing JSON from agent output:", e);
      }
    }

    res.json({
      success: true,
      message: runResult.output_text,
      formData, // Contains forms, responses, analytics
      toolCalls: runResult.tool_calls ?? [],
    });
  } catch (err: any) {
    console.error("🔴 Form Agent Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

export default router;

