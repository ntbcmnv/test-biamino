import {Keypair} from "@solana/web3.js";
import bs58 from "bs58";

export const getWalletFromPrivateKey = (privateKey: string): Keypair => {
    try {
        return Keypair.fromSecretKey(bs58.decode(privateKey));
    } catch {
        try {
            const cleaned = privateKey.trim();
            const keyArray = JSON.parse(cleaned);
            return Keypair.fromSecretKey(new Uint8Array(keyArray));
        } catch {
            throw new Error("Invalid private key format. Use base58 string or number array.");
        }
    }
};