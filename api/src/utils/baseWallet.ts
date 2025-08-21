import { ethers } from "ethers";

export const getWalletFromPrivateKey = (privateKey: string): ethers.Wallet => {
    try {
        return new ethers.Wallet(privateKey);
    } catch (error) {
        throw new Error("Invalid private key format");
    }
};