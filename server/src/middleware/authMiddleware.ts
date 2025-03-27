import { Request, Response, NextFunction } from "express";
import { StrKey } from "@stellar/stellar-sdk";
import nacl from "tweetnacl";
import { ADMIN_PUBLIC_KEY } from "../config/constants";

// Middleware to authenticate admin users
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      res.status(401).json({ error: "No authorization header provided" });
      return;
    }

    // Format should be: "Bearer {publicKey}:{signature}:{timestamp}"
    const [bearer, auth] = authorization.split(" ");
    if (bearer !== "Bearer" || !auth) {
      res.status(401).json({ error: "Invalid authorization format" });
      return;
    }

    const [publicKey, signature, timestamp] = auth.split(":");
    if (!publicKey || !signature || !timestamp) {
      res.status(401).json({ error: "Invalid authorization data" });
      return;
    }

    // Check if timestamp is within 5 minutes
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    if (currentTime - signatureTime > 300) {
      // 5 minutes
      res.status(401).json({ error: "Signature expired" });
      return;
    }

    // Prepare message that was signed
    const message = `admin-auth:${timestamp}`;

    // Verify Freighter signature
    const isValidSignature = await verifyFreighterSignature(
      publicKey,
      signature,
      message
    );

    if (!isValidSignature) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Check if the user is an admin, now that we have verified the signature
    if (publicKey === ADMIN_PUBLIC_KEY) {
      // User is admin, continue
      next();
      return;
    }

    res.status(403).json({ error: "Not authorized as admin" });
    return;
  } catch (error: any) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: error.message || "Authentication failed" });
    return;
  }
};

async function verifyFreighterSignature(
  publicKey: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      console.error("Invalid public key format");
      return false;
    }
    // Decode the public key from Stellar format
    const rawPublicKey = StrKey.decodeEd25519PublicKey(publicKey);
    // Decode the signature from base64
    const signatureBuffer = Buffer.from(signature, "base64");
    const messageBase64Buffer = Buffer.from(message, "base64");
    const isValidBase64 = nacl.sign.detached.verify(
      new Uint8Array(messageBase64Buffer),
      new Uint8Array(signatureBuffer),
      new Uint8Array(rawPublicKey)
    );
    return isValidBase64;
  } catch (error) {
    console.error("Error verifying Freighter signature:", error);
    return false;
  }
}