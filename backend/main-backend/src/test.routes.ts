import { run } from "@openai/agents";

const router = Router();
router.post("/test", async () => {
 try { console.log("hiiiii");
  const context = [
    {
      service: "calendar",
      refreshToken:
        "1//0gKqxesMYJeu4CgYIARAAGBASNwF-L9IrftFWHVUrGdYwhqKyL70jPR4O3aGUzfOKMriBvXKDjshnPVtQngbhMtvsdFw7onnQ9QQ",
    },
  ];
  const result = await run(
    meetCreatorAgent,
    "Create a meeting called Team Sync tomorrow at 11am and return the link ",
    {
      context,
    }
  );
  console.log(result.finalOutput);
  
 } catch (error) {
  console.log(error)
 }
});


export default router