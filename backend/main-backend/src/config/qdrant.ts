import { QdrantClient } from "@qdrant/js-client-rest";
import { ENV } from "./env";

export const MEMORY_COLLECTION = "chat_memory";

export const MEMORY_VECTOR_SIZE = 1536;

let client: QdrantClient | null = null;
let ready = false;


const ConnectToQdrant = async () => {
  try {
    client = new QdrantClient({ url: ENV.QDRANT_URL, apiKey: ENV.QDRANT_API_KEY });

    const { exists } = await client.collectionExists(MEMORY_COLLECTION);
    if (!exists) {
      await client.createCollection(MEMORY_COLLECTION, {
        vectors: { size: MEMORY_VECTOR_SIZE, distance: "Cosine" },
      });
    }

   
    await client.createPayloadIndex(MEMORY_COLLECTION, {
      field_name: "userId",
      field_schema: { type: "keyword", is_tenant: true },
      wait: true,
    });
    await client.createPayloadIndex(MEMORY_COLLECTION, {
      field_name: "sessionId",
      field_schema: "keyword",
      wait: true,
    });
    // Range index so a chat's turns can be read back in order (scroll with order_by).
    await client.createPayloadIndex(MEMORY_COLLECTION, {
      field_name: "ts",
      field_schema: "integer",
      wait: true,
    });

    ready = true;
    console.log("connected to qdrant");
  } catch (error) {
    ready = false;
    console.error("error in connecting to qdrant, chat memory is disabled", error);
  }
};


const getQdrant = () => (ready ? client : null);

export { ConnectToQdrant, getQdrant };
