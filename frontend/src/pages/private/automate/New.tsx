import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatInput from "@/components/chat/ChatInput";
import { axiosInstance } from "@/utils";
import { useAppDispatch } from "@/store/hooks";
import { addSession } from "@/store/slices/sessionSlice";

function New() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      console.log("Sending message:", message);

      const { data } = await axiosInstance.post("/agent/init", { message });
      console.log(data.data);

      dispatch(
        addSession({
          sessionId: data.data.conversationId,
          _id: data.data.sessionId,
        })
      );

      navigate(`/task/${data.data.conversationId}`);
      console.log(data);
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Something went wrong while sending. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex justify-center items-center">
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

export default New;
