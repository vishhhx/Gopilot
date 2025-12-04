

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


// import { Router } from "express";
// import formCoordinatorAgent from "./agents/form";
// import { run } from "@openai/agents";

// const router = Router();

// // ✅ Context object with form service refresh token
// const context = {
//   form: [
//     {
//       service: "form",
//       refreshToken:
//         "1//0gdhVMA6CC50gCgYIARAAGBASNwF-L9IrRA2JdE7WdlaCmFBGo7au7m3du0c0zBa8ZPoLkVDAR_L5fM_bb9LLKLymdxH6KrfPYkg",
//     },
//   ],
// };

// /**
//  * POST /testagent
//  * Test the form coordinator agent with any prompt
//  * 
//  * Example prompts:
//  * - "Create a customer feedback form with 3 questions"
//  * - "List all my forms"
//  * - "Show me responses for my forms"
//  * - "Export all responses as CSV"
//  * - "Delete this form permanently"
//  */
// router.post("/testagent", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     console.log("📋 Form Agent Prompt:", prompt);

//     const runResult = await run(formCoordinatorAgent, prompt, { context });

//     console.log("🟢 Final Output (text):", runResult.finalOutput);
//     console.log("🟢 Structured Output:", runResult.output);

//     // Parse JSON safely - extract form data
//     let formData = {
//       forms: [],
//       responses: [],
//       analytics: null,
//       links: null,
//     };

//     if (runResult.output?.[0]?.output?.text) {
//       try {
//         const parsed = JSON.parse(runResult.output[0].output.text);

//         // Extract form data if available
//         if (parsed.success && parsed.data) {
//           formData.forms.push({
//             id: parsed.data.id,
//             title: parsed.data.title,
//             shareableLink: parsed.data.shareableLink,
//             shortLink: parsed.data.shortLink,
//             embedCode: parsed.data.embedCode,
//             createdAt: parsed.data.createdAt,
//           });
//           formData.links = {
//             shareableLink: parsed.data.shareableLink,
//             shortLink: parsed.data.shortLink,
//             embedCode: parsed.data.embedCode,
//           };
//         }
//         if (parsed.data?.responses) {
//           formData.responses = parsed.data.responses;
//         }
//         if (parsed.data?.analytics) {
//           formData.analytics = parsed.data.analytics;
//         }
//       } catch (e) {
//         console.error("❌ Error parsing JSON from agent output:", e);
//       }
//     }

//     res.json({
//       success: true,
//       message: runResult.output_text,
//       formData, // Contains forms, responses, analytics
//       toolCalls: runResult.tool_calls ?? [],
//     });
//   } catch (err: any) {
//     console.error("🔴 Form Agent Error:", err);
//     res.status(500).json({ 
//       success: false,
//       error: err.message 
//     });
//   }
// });

// export default router;








//this is for the test the sheet............................


// import { Router } from "express";
//    // ⬅️ Correct import
// import { run } from "@openai/agents";
// import { sheetsCoordinatorAgent } from "./agents/orchestrator";

// const router = Router();


// const context = [
//       {
//         service: "sheets",
//         refreshToken:
//           "1//0g1tATBSEguA1CgYIARAAGBASNwF-L9IrCfif6Kh1GIfFPZq9wFWqympVMmxdsUndNDNl3etqC0BWxCVJ2vkylqJcPEhqzHa8zLU",
//       },
//     ];

// router.post("/testsheets", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     console.log("📋 Sheets Agent Prompt:", prompt);

//     // ✅ Correct agent variable name
//     const runResult = await run(sheetsCoordinatorAgent, prompt, { context });

//     console.log("🟢 Final Output:", runResult.finalOutput);
//     console.log("🟢 Structured Output:", JSON.stringify(runResult.output, null, 2));

//     // Default response data
//     const sheetsData = {
//       values: [],
//       updatedRange: null,
//       spreadsheetId: null,
//       createdSheet: null,
//       deletedSheet: null,
//     };

//     // Try to parse function tool output
//     const toolOutput =
//       runResult.output?.[0]?.output?.text ||
//       runResult.output?.[0]?.output?.content ||
//       null;

//     if (toolOutput) {
//       try {
//         const parsed = JSON.parse(toolOutput);

//         if (parsed.success && parsed.data) {
//           const data = parsed.data;

//           sheetsData.values = data.values || sheetsData.values;
//           sheetsData.updatedRange = data.updatedRange || sheetsData.updatedRange;
//           sheetsData.createdSheet = data.createdSheet || sheetsData.createdSheet;
//           sheetsData.deletedSheet = data.deletedSheet || sheetsData.deletedSheet;
//           sheetsData.spreadsheetId = data.spreadsheetId || sheetsData.spreadsheetId;
//         }
//       } catch (err) {
//         console.error("❌ JSON Parse Error:", err);
//       }
//     }

//     res.json({
//       success: true,
//       message: runResult.finalOutput,
//       sheetsData,
//       toolCalls: runResult.tool_calls || [],
//     });

//   } catch (err) {
//     console.error("🔴 Sheets Agent Error:", err);
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// export default router;






//this is for test the drive ..........................

// import { Router } from "express";
// import { run } from "@openai/agents";
// import { driveCoordinatorAgent } from "./agents/drive";  // <-- Your Drive agent

// const router = Router();

// // Add your service context (Drive refresh token)
// const context = [
//   {
//     service: "drive",
//     refreshToken:
//       "1//0gwH59yOh1d4hCgYIARAAGBASNwF-L9IrdzPtDnRy4iWVhLpykU0wsC6HhRL0CTCiLv6RPHjZt181Jt0gMq25Mbe8EiqcFpSakao",
//   },
// ];

// router.post("/testdrive", async (req, res) => {
//   try {
//     const { prompt } = req.body;

//     if (!prompt) {
//       return res.status(400).json({ error: "Prompt is required" });
//     }

//     console.log("📁 Drive Agent Prompt:", prompt);

//     const runResult = await run(driveCoordinatorAgent, prompt, { context });

//     console.log("🟢 Final Output:", runResult.finalOutput);
//     console.log("🟢 Structured Output:", JSON.stringify(runResult.output, null, 2));

//     // Default drive response structure
//     const driveData = {
//       fileId: null,
//       folderId: null,
//       list: null,
//       moved: null,
//       copied: null,
//       deleted: null,
//       permissions: null,
//       metadata: null,
//       uploaded: null,
//     };

//     // Extract tool output
//     const toolOutput =
//       runResult.output?.[0]?.output?.text ||
//       runResult.output?.[0]?.output?.content ||
//       null;

//     if (toolOutput) {
//       try {
//         const parsed = JSON.parse(toolOutput);

//         if (parsed.success && parsed.data) {
//           const data = parsed.data;

//           driveData.fileId = data.fileId || driveData.fileId;
//           driveData.folderId = data.folderId || driveData.folderId;
//           driveData.list = data.list || driveData.list;
//           driveData.moved = data.moved || driveData.moved;
//           driveData.copied = data.copied || driveData.copied;
//           driveData.deleted = data.deleted || driveData.deleted;
//           driveData.permissions = data.permissions || driveData.permissions;
//           driveData.metadata = data.metadata || driveData.metadata;
//           driveData.uploaded = data.uploaded || driveData.uploaded;
//         }
//       } catch (err) {
//         console.error("❌ JSON Parse Error:", err);
//       }
//     }

//     res.json({
//       success: true,
//       message: runResult.finalOutput,
//       driveData,
//       toolCalls: runResult.tool_calls || [],
//     });

//   } catch (err) {
//     console.error("🔴 Drive Agent Error:", err);
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// export default router;



import express from "express";
import { run } from "@openai/agents";
import { meetCoordinatorAgent } from "./agents/goolemeet";

const router = express.Router();

interface Tokens {
  service: string;
  refreshToken: string;
}

// Context with your tokens
const context: Tokens[] = [
  {
    service: "meet",
    refreshToken:"1//0gc1bwqTSkkByCgYIARAAGBASNwF-L9IrxHRJ1GXKpthrnzAavtZmazQPWoZY2ZtqlfwOC59OtFeHkTey_jNNZC0suiLavKdvydk",
  },
];

router.post("/testmeet", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("📁 Meet Agent Prompt:", prompt);

    const runResult = await run(meetCoordinatorAgent, prompt, { context });

    console.log("🟢 Final Output:", runResult.finalOutput);
    console.log("🟢 Structured Output:", JSON.stringify(runResult.output, null, 2));

    // Default meet response structure
    const meetData = {
      meetId: null,
      meetCode: null,
      meetLink: null,
      title: null,
      startTime: null,
      endTime: null,
      attendees: null,
      roomsList: null,
      statistics: null,
      updated: null,
      deleted: null,
      created: null,
    };

    // Extract tool output
    const toolOutput =
      runResult.output?.[0]?.output?.text ||
      runResult.output?.[0]?.output?.content ||
      null;

    if (toolOutput) {
      try {
        const parsed = JSON.parse(toolOutput);

        if (parsed.success && parsed.data) {
          const data = parsed.data;

          meetData.meetId = data.meetId || meetData.meetId;
          meetData.meetCode = data.meetCode || meetData.meetCode;
          meetData.meetLink = data.meetLink || meetData.meetLink;
          meetData.title = data.title || data.meetTitle || meetData.title;
          meetData.startTime = data.startTime || meetData.startTime;
          meetData.endTime = data.endTime || meetData.endTime;
          meetData.attendees = data.attendees || meetData.attendees;
          meetData.roomsList = data.meets || meetData.roomsList;
          meetData.statistics = data.stats || meetData.statistics;
          meetData.updated = data.meetId ? true : false;
          meetData.deleted = data.deleted || meetData.deleted;
          meetData.created = data.createdAt || meetData.created;
        }
      } catch (err) {
        console.error("❌ JSON Parse Error:", err);
      }
    }

    res.json({
      success: true,
      message: runResult.finalOutput,
      meetData,
      toolCalls: runResult.tool_calls || [],
    });
    

  } catch (err) {
    console.error("🔴 Meet Agent Error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;