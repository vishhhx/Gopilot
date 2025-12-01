// import { Router } from "express";
// import calendarCoordinatorAgent from "./agents/calender";
// import { run } from "@openai/agents";

// const router = Router();

// const context = [
//   {
//     service: "calendar",
//     refreshToken:
//       "1//0gdhVMA6CC50gCgYIARAAGBASNwF-L9IrRA2JdE7WdlaCmFBGo7au7m3du0c0zBa8ZPoLkVDAR_L5fM_bb9LLKLymdxH6KrfPYkg",
//   },
// ];

// // POST /testagent



// router.post("/testagent", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     const runResult = await run(calendarCoordinatorAgent, prompt, { context });

//     // Debug logs
//     console.log("🟢 Final Output:", runResult.output_text);
//     console.log("🟢 Structured Output:", runResult.output);

//     // ✔ SAFE RESPONSE (no circular references)
//     res.json({
//       success: true,
//       message: runResult.output_text,
//       output: runResult.output ?? null,       // structured JSON of calendar events
//       toolCalls: runResult.tool_calls ?? [],  // safe list
//     });

//   } catch (err: any) {
//     console.error("Agent Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });




// export default router;











import { Router } from "express";
import calendarCoordinatorAgent from "./agents/calender";
import { run } from "@openai/agents";

const router = Router();

// ✅ FIXED: context must be an object, not an array
const context = {
  calendar: {
    refreshToken:
      "1//0gdhVMA6CC50gCgYIARAAGBASNwF-L9IrRA2JdE7WdlaCmFBGo7au7m3du0c0zBa8ZPoLkVDAR_L5fM_bb9LLKLymdxH6KrfPYkg",
  },
};

// POST /testagent
// router.post("/testagent", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     // ✅ run the agent with object context
//     const runResult = await run(calendarCoordinatorAgent, prompt, { context });

//     // Debug logs
//     console.log("🟢 Final Output (text):", runResult.output_text);
//     console.log("🟢 Structured Output:", runResult.output);

//     // Try to parse structured calendar events safely
//     let events: any[] = [];
//     if (runResult.output_text) {
//       try {
//         const parsed = JSON.parse(runResult.output_text);
//         events = parsed?.data?.events || [];
//       } catch (parseError) {
//         console.warn("Could not parse output_text JSON:", parseError);
//       }
//     }

//     // Send safe JSON response
//     res.json({
//       success: true,
//       message: runResult.output_text,
//       events,
//       toolCalls: runResult.tool_calls ?? [],
//     });
//   } catch (err: any) {
//     console.error("Agent Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });
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


router.post("/testagent", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const runResult = await run(calendarCoordinatorAgent, prompt, { context });

    console.log("🟢 Final Output (text):", runResult.output_text);
    console.log("🟢 Structured Output:", runResult.output);

    // Parse JSON safely
    let events = [];
    if (runResult.output?.[0]?.output?.text) {
      try {
        const parsed = JSON.parse(runResult.output[0].output.text);
        if (parsed.success && parsed.data?.events) {
          events = parsed.data.events;
        }
      } catch (e) {
        console.error("❌ Error parsing JSON from agent output:", e);
      }
    }

    res.json({
      success: true,
      message: runResult.output_text,
      events,                   // now contains actual calendar events
      toolCalls: runResult.tool_calls ?? [],
    });
  } catch (err: any) {
    console.error("Agent Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
