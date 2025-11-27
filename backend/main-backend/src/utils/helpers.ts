import { CorsOptions } from "cors";
const allowedOrigins = [
  "http://localhost:5173",
];
const corsConfig:CorsOptions={
    origin:allowedOrigins,
 credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}


const  getCookieValueSocket=(cookies:string, cookieName:string) =>{
  const match = cookies.match(new RegExp("(^| )" + cookieName + "=([^;]+)"));
  if (match) return match[2];
  return null;
}
export {corsConfig,getCookieValueSocket}