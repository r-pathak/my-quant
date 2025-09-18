import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
 
const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
 
console.log("JWT_PRIVATE_KEY:");
console.log(privateKey.trimEnd().replace(/\n/g, " "));
console.log("");
console.log("JWKS:");
console.log(jwks);
console.log("");
console.log("Copy the JWT_PRIVATE_KEY value (including spaces) and paste it into Convex dashboard");
console.log("Copy the JWKS value and paste it into Convex dashboard");
