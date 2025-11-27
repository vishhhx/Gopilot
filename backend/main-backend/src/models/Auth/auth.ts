import { Schema ,model} from "mongoose";
import { IAuth, JwtPayload } from "../../types";
import bcrypt from "bcrypt"
import { AuthHelper, RedisService } from "../../utils";

const authSchema = new Schema<IAuth>(
  {
    name: {
      type: String,
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [30, "Name must be at most 30 characters long"],
      lowercase: true,
      unique: false,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, 
      index: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    refreshToken: {
      type: String,
      required: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: function(){
        return this.provider!="local"
      },
    },

    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    googleId: {
      type: String,
      index: true,
      sparse: true,
    },
    githubId: {
      type: String,
      index: true,
      sparse: true,
    },
    avatarUrl:{
      type:String,
      index:true,
      sparse:true
    }
  },
  {
    timestamps: true,
  }
);
authSchema.methods.isPasswordCorrect = async function (password:string) {
  return await bcrypt.compare(password, this.password);
};

authSchema.methods.generateAccessToken = function () {
  const authHelper=new AuthHelper()

  const payload:JwtPayload= {
    userId: this._id,
    email: this.email,
  };
 return authHelper.signUser(payload)
};
authSchema.methods.generateRefreshToken = function () {
  const redisService=new RedisService()
  const authHelper=new AuthHelper()

  const payload:JwtPayload= { userId: this._id,
    email: this.email, };
  const token = authHelper.signUser(payload,"7d")
  this.refreshToken = token;
  redisService.setRefreshToken(this._id, token);
  return token
};

export const AuthModel = model<IAuth>("Auth", authSchema);