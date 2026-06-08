import jwt from "jsonwebtoken";
import config from "../../../src/config.js";

const secret = config.jwt.secret;

export function assignToken(data) {
  return jwt.sign(data, secret);
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}
