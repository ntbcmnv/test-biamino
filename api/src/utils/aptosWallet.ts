import { AptosAccount, HexString } from "aptos";

export const getAptosWalletFromPrivateKey = (privateKey: string): AptosAccount => {
    try {
        if (privateKey.startsWith('0x')) {
            return new AptosAccount(new HexString(privateKey).toUint8Array());
        } else if (privateKey.includes('[')) {
            const cleaned = privateKey.replace(/[\[\]\s]/g, '');
            const keyArray = cleaned.split(',').map(Number);
            return new AptosAccount(new Uint8Array(keyArray));
        } else {
            return new AptosAccount(HexString.ensure(privateKey).toUint8Array());
        }
    } catch (error) {
        throw new Error(`Invalid Aptos private key format: ${error}`);
    }
};