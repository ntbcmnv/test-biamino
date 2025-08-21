import {AptosClient} from "aptos";

export const APTOS_USDT = "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::COIN";
export const APTOS_APT = "0x1::aptos_coin::AptosCoin";

export const getSwapPayload = (
    fromCoin: string,
    toCoin: string,
    amountIn: string,
    minAmountOut: string = "1"
) => {
    return {
        function: "0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::router::swap",
        type_arguments: [fromCoin, toCoin],
        arguments: [amountIn, minAmountOut],
    };
};

export const getTokenBalance = async (client: AptosClient, address: string, coinType: string) => {
    try {
        const resources = await client.getAccountResources(address);
        const coinStore = resources.find((r: any) => r.type === `0x1::coin::CoinStore<${coinType}>`);

        if (!coinStore) {
            return 0;
        }

        return (coinStore.data as any).coin.value;
    } catch (error) {
        return 0;
    }
};